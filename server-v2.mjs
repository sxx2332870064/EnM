import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {normalizeInput,getMissingEssentialFields,conflictQuestions} from './input-rules.mjs';
import {getEligibleTemplates,buildExperiment} from './experiment-library.mjs';
import {detectExplicitBoundary} from './safety-rules.mjs';
import {buildAgentPromptV2} from './agent-instructions-v2.mjs';
import {validateAgentOutput} from './output-validator.mjs';
export const MODEL='gemini-flash-lite-latest';
export const GEMINI_ENDPOINT='https://generativelanguage.googleapis.com/v1beta/interactions';
const dirname=path.dirname(fileURLToPath(import.meta.url));
export function extractOutputText(data){
 if(typeof data.output_text==='string')return data.output_text.trim();
 return (data.steps||[]).flatMap(s=>s.content||[]).filter(i=>i.type==='text'&&typeof i.text==='string').map(i=>i.text).join('\n').trim();
}
// Same Gemini Interactions endpoint, model, header and request body as the uploaded app.
export async function callGemini(prompt){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
 try{
  const r=await fetch(GEMINI_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({model:MODEL,input:prompt,generation_config:{max_output_tokens:2400}}),signal:controller.signal});
  if(!r.ok){const e=new Error('Provider unavailable');e.status=r.status;throw e;}
  const apiData=await r.json(),outputText=extractOutputText(apiData);
  if(!outputText)throw new Error('No readable model output');
  return {apiData,outputText};
 }finally{clearTimeout(timer);}
}
function parseDraft(text){return JSON.parse(String(text).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}
export async function runAgent(input,eligible,call=callGemini,log=console.warn){
 let previous=null,issues=[],history=[],lastId=null;
 for(let attempt=0;attempt<2;attempt++){
  const reply=await call(buildAgentPromptV2(input,eligible,issues,previous));lastId=reply.apiData?.id||null;
  try{previous=parseDraft(reply.outputText);const checked=validateAgentOutput(previous,input,eligible);issues=checked.issues;
   if(checked.valid)return {...checked.result,experiments:checked.result.action==='GENERATE_EXPERIMENTS'?checked.result.experiments.map(e=>buildExperiment(eligible.find(t=>t.id===e.templateId),e)):[],agentMeta:{requestCount:attempt+1,repairAttempted:attempt===1,validationStatus:attempt?'passed after one repair':'passed on first draft',eligibleTemplateCount:eligible.length,interactionId:lastId,validationHistory:history}};
  }catch{issues=['Return a complete JSON object in the required structure.'];}
  history.push({attempt:attempt+1,issues:[...issues]});
  log(JSON.stringify({event:'validation_rejected',attempt:attempt+1,issues}));
 }
 return {action:'GENERATION_FAILED',message:'We could not prepare a valid plan. This is an app output problem, not a safety judgment about your idea.',reason:'Both drafts failed the output checks. No draft is shown as a usable plan.',questions:[],experiments:[],agentMeta:{requestCount:2,repairAttempted:true,eligibleTemplateCount:eligible.length,interactionId:lastId,validationStatus:'failed after one repair',validationHistory:history}};
}
export function createApp({call=callGemini,keyAvailable=()=>Boolean(process.env.GEMINI_API_KEY),logger=console.warn}={}){
 const app=express(),secret=randomBytes(32),requests=new Map();let active=0;
 app.disable('x-powered-by');
 if(process.env.TRUST_PROXY==='1')app.set('trust proxy',1);
 app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",'Permissions-Policy':'camera=(), microphone=(), geolocation=()'});next();});
 app.use(express.json({limit:'40kb'}));
 app.use(express.static(path.join(dirname,'public'),{maxAge:0}));
 const sign=content=>createHmac('sha256',secret).update(content).digest('base64url');
 function tokenFor(input,experiments){const content=Buffer.from(JSON.stringify({input,experiments,expires:Date.now()+2*60*60*1000})).toString('base64url');return `${content}.${sign(content)}`;}
 function checkToken(value){
  if(typeof value!=='string'||value.length>32000)throw new Error('invalid');
  const [content,sig]=value.split('.');const expected=sign(content||'');
  if(!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new Error('invalid');
  const d=JSON.parse(Buffer.from(content,'base64url').toString());if(d.expires<Date.now())throw new Error('expired');return d;
 }
 const meta=(requestId,eligible=0)=>({provider:'Gemini Interactions API',model:MODEL,status:'completed',requestId,requestCount:0,repairAttempted:false,validationStatus:'application check',eligibleTemplateCount:eligible});
 app.get('/api/health',(req,res)=>res.json({ok:true,version:'3.0.1',architecture:'One decision agent; curated methods, bounded repair, signed plan confirmation',provider:'Gemini Interactions API',model:MODEL,apiKeyConfigured:keyAvailable()}));
 app.post('/api/agent',async(req,res)=>{
  res.set('Cache-Control','no-store');const requestId=randomUUID();
  if(req.body?.stage==='confirm'){
   try{const plan=checkToken(req.body.planToken);if(!plan.experiments.some(e=>e.templateId===req.body.selectedId))throw new Error('invalid');return res.json({action:'COMPLETE',message:'Planning is ready. Try the three conditions and keep your observations separate from interpretation.',experiments:[],documentationChecklist:['Check the real setup before starting.','Record one observation for each condition.','Compare the notes, then decide what to try next.'],agentMeta:meta(requestId)});}catch{return res.status(409).json({error:'This plan has expired or changed. Generate a fresh plan before starting.',code:'PLAN_EXPIRED',requestId});}
  }
  const input=normalizeInput(req.body),eligible=getEligibleTemplates(input);
  if(detectExplicitBoundary(input))return res.json({action:'REQUEST_HUMAN_REVIEW',message:'This app cannot plan that method or provide diagnosis or therapy. Please ask an instructor or an appropriate professional.',reason:'A limited keyword screen matched an explicit boundary. This is not a complete safety assessment.',experiments:[],questions:[],agentMeta:meta(requestId,eligible.length)});
  const missing=getMissingEssentialFields(input),conflicts=conflictQuestions(input);
  if(missing.length||conflicts.length)return res.json({action:'ASK_CLARIFICATION',message:'A little information needs checking before we plan.',questions:conflicts.length?conflicts:missing.slice(0,3).map(x=>`Please confirm your ${x}.`),missingEssentialFields:missing,reason:'Missing information or a direct equipment conflict.',experiments:[],agentMeta:meta(requestId,eligible.length)});
  if(!eligible.length)return res.json({action:'ASK_CLARIFICATION',message:'No supported test fits these settings yet. You do not need to buy materials.',questions:[!input.materials.includes('Laptop with basic p5.js')?'Do you have a laptop and browser available? If not, this app cannot run its supported digital tests.':'Can you allow at least 8 minutes for one test? If not, save your idea and return when you have more time.'],experiments:[],reason:'No eligible method for the confirmed setup.',agentMeta:meta(requestId)});
  if(!keyAvailable())return res.status(503).json({error:'The model connection is not configured. Please contact the app owner. Your inputs are still here.',code:'NOT_CONFIGURED',requestId});
  const now=Date.now(),ip=req.ip;
  for(const [k,v]of requests)if(now-v.start>600000)requests.delete(k);
  const bucket=requests.get(ip)||{start:now,count:0};
  if(bucket.count>=20||active>=3){res.set('Retry-After','60');return res.status(429).json({error:'The studio is busy. Wait a minute before trying again. Your inputs are still here.',code:'BUSY',requestId});}
  bucket.count++;requests.set(ip,bucket);active++;
  try{
   const result=await runAgent(input,eligible,call,logger);
   result.agentMeta={...meta(requestId,eligible.length),...result.agentMeta,status:result.action==='GENERATION_FAILED'?'stopped after failed validation':'completed'};
   if(result.action==='GENERATE_EXPERIMENTS')result.planToken=tokenFor(input,result.experiments);
   res.json(result);
  }catch(error){
   logger(JSON.stringify({event:'provider_failure',requestId,status:error.status||null,type:error.name}));
   const timeout=error.name==='AbortError';
   res.status(timeout?504:503).json({error:timeout?'The model took too long. Your inputs are still here; you can retry.':'The model is temporarily unavailable. Your inputs are still here; try again later.',code:timeout?'TIMEOUT':'PROVIDER_UNAVAILABLE',requestId});
  }finally{active--;}
 });
 app.use((err,req,res,next)=>res.status(err.status===413?413:400).json({error:err.status===413?'This request is too large. Shorten your notes.':'The request could not be read. Please check the form.',code:'INVALID_REQUEST'}));
 app.use((req,res)=>res.status(404).json({error:'Page not found.'}));return app;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))createApp().listen(process.env.PORT||3000,()=>console.log(`Emotion-to-Material Studio: http://localhost:${process.env.PORT||3000}`));
