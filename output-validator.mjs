// Structure and selected known patterns only. This is not a semantic safety guarantee.
export function validateAgentOutput(raw,input,eligible){
 const issues=[];
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {valid:false,issues:['Return a JSON object.'],result:null};
 const text=(v,max=600)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
 if(!['GENERATE_EXPERIMENTS','ASK_CLARIFICATION','REQUEST_HUMAN_REVIEW'].includes(raw.action))issues.push('Choose a supported action.');
 if(!text(raw.message)||!text(raw.reason))issues.push('Include a short message and reason.');
 if(!Array.isArray(raw.experiments)||!Array.isArray(raw.questions))issues.push('experiments and questions must be arrays.');
 const experiments=Array.isArray(raw.experiments)?raw.experiments:[];
 if(raw.action==='GENERATE_EXPERIMENTS'){
  if(experiments.length!==Math.min(3,eligible.length))issues.push('Use the requested number of distinct eligible tests.');
  if(input.mode==='mixed'&&eligible.some(t=>t.kind==='physical')&&!experiments.some(e=>eligible.find(t=>t.id===e?.templateId)?.kind==='physical'))issues.push('Include at least one eligible physical-context test for the mixed-media request.');
  const ids=new Set();
  for(const [i,e]of experiments.entries()){
   const label=`Test ${i+1}`;
   if(!e||typeof e!=='object'){issues.push(`${label}: return an object.`);continue;}
   const template=eligible.find(t=>t.id===e.templateId);
   if(!template||ids.has(e.templateId))issues.push(`${label}: use a distinct eligible ID.`);ids.add(e.templateId);
   if(!text(e.conceptConnection))issues.push(`${label}: conceptConnection must contain 1–600 characters.`);
   for(const key of Object.keys(e))if(!['templateId','conceptConnection'].includes(key))issues.push(`${label}: do not generate ${key}; the application supplies methods and questions.`);
   const connection=String(e.conceptConnection||'');
   if(/\b(?:this (?:means|proves)|will make you feel|always represents|protective or restrictive|revealing or concealing)\b/i.test(connection))issues.push(`${label}: remove fixed emotional meanings.`);
   if(/\b(?:use|connect|attach|mount|apply|ignite|burn)\b[^.!?]{0,30}\b(?:needle|tape|wire|battery|flame|fire|camera|brush)\b/i.test(connection))issues.push(`${label}: remove unconfirmed method instructions.`);
   // Selected claims from the real P01 failures, not a general semantic verifier.
   if(template?.focus==='pace'&&/\b(?:unpredictable|random(?:ized)?)\s+(?:transitions?|movements?|motion|speeds?)\b|\b(?:mirror\w*|examin\w*|test\w*)\b[^.!?]{0,45}\bunpredictability\b|\b(?:chang\w*|vary\w*|adjust\w*)\b[^.!?]{0,20}\b(?:brightness|colou?r|sound|direction)\b/i.test(connection))issues.push(`${label}: only movement speed changes; do not claim randomness, unpredictability or another unimplemented change is tested.`);
   if(/\b(?:makes? you feel|feel more|feel most|feel like|feels? (?:calming|isolated|chaotic|suspenseful)|means? (?:waiting|hesitation)|uncertainty creates|better capture anxious)\b/i.test(connection))issues.push(`${label}: describe the comparison without assigning its emotional result.`);
  }
  if(raw.questions?.length)issues.push('Generation must not include clarification questions.');
 }else{
  if(experiments.length)issues.push('Do not include tests for a non-generation action.');
  if(raw.action==='ASK_CLARIFICATION'&&(!Array.isArray(raw.questions)||raw.questions.length<1||raw.questions.length>2||raw.questions.some(q=>!text(q,300))))issues.push('Ask one or two short questions.');
 }
 return {valid:issues.length===0,issues,result:raw};
}
