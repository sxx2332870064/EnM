import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {experimentTemplates,getEligibleTemplates,buildExperiment} from '../experiment-library.mjs';
import {normalizeInput} from '../input-rules.mjs';
import {validateAgentOutput} from '../output-validator.mjs';
import {runAgent} from '../server-v2.mjs';

for(const id of ['P01-R2','P01-R3']){
 const record=JSON.parse(await readFile(new URL(`./fixtures/${id}.json`,import.meta.url),'utf8'));
 const input=normalizeInput(record.input),eligible=getEligibleTemplates(input);
 test(`${id}: the old model-written questions are not accepted under the new contract`,()=>{
  const oldDraft={...record.result,experiments:record.result.experiments.map(e=>({templateId:e.templateId,conceptConnection:e.conceptConnection,researchQuestion:e.researchQuestion,emotionalQuestion:e.emotionalQuestion}))};
  const result=validateAgentOutput(oldDraft,input,eligible);
  assert.equal(result.valid,false);assert.ok(result.issues.some(s=>s.includes('application supplies methods and questions')));
 });
 test(`${id}: the observed pace-feature claim is detected even without the old question fields`,()=>{
  const draft={...record.result,experiments:record.result.experiments.map(e=>({templateId:e.templateId,conceptConnection:e.conceptConnection}))};
  const result=validateAgentOutput(draft,input,eligible);
  assert.equal(result.valid,false);assert.ok(result.issues.some(s=>s.includes('only movement speed changes')));
 });
 test(`${id}: question fields cannot override the displayed app questions`,()=>{
  for(const old of record.result.experiments){const t=experimentTemplates[old.templateId],shown=buildExperiment(t,old);assert.equal(shown.researchQuestion,t.researchQuestion);assert.equal(shown.emotionalQuestion,t.prompt);assert.notEqual(shown.emotionalQuestion,old.emotionalQuestion);}
 });
}
test('R1 known leading question cannot override the reviewed spacing question',()=>{
 const t=experimentTemplates.digitalSpacing;
 const e=buildExperiment(t,{emotionalQuestion:'Does the wide gap feel more open, or does it make you feel more isolated?'});
 assert.equal(e.emotionalQuestion,t.prompt);assert.ok(!e.emotionalQuestion.includes('isolated'));
});
test('every template has a nonempty, distinct reviewed reflection and research question',()=>{
 const seen=new Set();for(const t of Object.values(experimentTemplates)){assert.ok(t.researchQuestion?.endsWith('?'),t.id);assert.ok(t.prompt?.includes('?'),t.id);assert.ok(!seen.has(t.prompt));seen.add(t.prompt);assert.ok(!/\b(isolated|chaotic|calming|suspenseful|relieved)\b/.test(t.prompt));}
});
test('neutral conceptual reference to unpredictability is not categorically rejected',()=>{
 const input=normalizeInput({emotion:'Unpredictability',materials:['Laptop with basic p5.js'],mode:'digital',workspace:'Tabletop only',safetyConfirmed:true});
 const eligible=getEligibleTemplates(input);
 const draft={action:'GENERATE_EXPERIMENTS',message:'Compare visible changes.',reason:'Three supported tests.',questions:[],experiments:eligible.map(t=>({templateId:t.id,conceptConnection:`Compare the visible ${t.focus} conditions, then decide whether they relate to your idea of unpredictability.`}))};
 assert.equal(validateAgentOutput(draft,input,eligible).valid,true);
});
test('a known false pace claim triggers one repair before a usable grounded plan',async()=>{
 const record=JSON.parse(await readFile(new URL('./fixtures/P01-R2.json',import.meta.url),'utf8'));
 const input=normalizeInput(record.input),eligible=getEligibleTemplates(input);
 const bad={...record.result,experiments:record.result.experiments.map(e=>({templateId:e.templateId,conceptConnection:e.conceptConnection}))};
 const fixed={action:'GENERATE_EXPERIMENTS',message:'Compare what changes.',reason:'Supported digital comparisons.',questions:[],experiments:eligible.map(t=>({templateId:t.id,conceptConnection:`Compare the visible ${t.focus} conditions while considering anxiety and uncertainty. Decide whether a connection is supported by your notes.`}))};
 let calls=0;const result=await runAgent(input,eligible,async()=>({apiData:{status:'completed',id:'controlled-repair'},outputText:JSON.stringify(++calls===1?bad:fixed)}),()=>{});
 assert.equal(calls,2);assert.equal(result.action,'GENERATE_EXPERIMENTS');assert.equal(result.agentMeta.repairAttempted,true);
 for(const e of result.experiments)assert.equal(e.emotionalQuestion,experimentTemplates[e.templateId].prompt);
});
