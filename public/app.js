const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels=['Laptop with basic p5.js','Projector','Tracing paper','Thread','Room-temperature modeling wax','Ink','Speakers','Small LEDs without confirmed power setup'];
const short=['Laptop / browser','Projector','Tracing paper','Thread','Modeling wax','Ink','Speakers','LEDs (setup unconfirmed)'];
const state={result:null,input:null,selected:null,notes:['','',''],setup:'',technical:'',emotional:'',next:'',nextNote:'',comparison:false,sample:false,history:[]};
let controller=null,working=false,visualTrial=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,clock=0,previousTime=0;
$('#resources').innerHTML=labels.map((s,i)=>`<label class="choice"><input type="checkbox" name="materials" value="${escape(s)}" ${i===0?'checked':''}><span>${short[i]}</span></label>`).join('');
function notify(message,error=false){$('#notice').innerHTML=message?`<div class="notice-box ${error?'error':''}">${escape(message)}</div>`:'';}
function go(page,focus=true){
 $$('.page').forEach(p=>p.hidden=p.id!==page);
 $$('.step').forEach(b=>{b.classList.toggle('current',b.dataset.page===page);if(b.dataset.page===page)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
 if(focus){$('#main').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
}
function updateFields(){const mixed=$('input[name=mode]:checked').value==='mixed';const projector=$('input[value="Projector"]').checked;$('#projection-field').hidden=!(mixed&&projector);$('#custom-time-field').hidden=$('#time').value!=='custom';}
function collect(){return {stage:'plan',emotion:$('#emotion').value.trim(),mode:$('input[name=mode]:checked').value,materials:$$('input[name=materials]:checked').map(x=>x.value),workspace:$('#workspace').value,projectionTarget:$('#projection').value,safetyLimits:$('#safety').value.trim(),safetyConfirmed:$('#safe').checked,availableMinutes:$('#time').value==='custom'?null:Number($('#time').value),time:$('#time').value==='custom'?$('#custom-time').value:`${$('#time').value} minutes`,skills:$('#skill').value,budget:$('#budget').value,additionalContext:$('#context').value.trim()};}
function fill(input){
 $('#emotion').value=input.emotion||'';$('#workspace').value=input.workspace||'';$('#safety').value=input.safetyLimits||'';$('#safe').checked=Boolean(input.safetyConfirmed);$('#projection').value=input.projectionTarget||'none';$('#context').value=input.additionalContext||'';$('#budget').value=input.budget||'';
 $$('input[name=materials]').forEach(x=>x.checked=input.materials?.includes(x.value));$$('input[name=mode]').forEach(x=>x.checked=x.value===input.mode);
 if([15,30,60].includes(input.availableMinutes))$('#time').value=String(input.availableMinutes);else{$('#time').value='custom';$('#custom-time').value=input.time||'';}
 if([...$('#skill').options].some(o=>o.value===input.skills))$('#skill').value=input.skills;updateFields();
}
function disable(value){working=value;$('#generate').disabled=value;$('#retry').disabled=value;$('#sample').disabled=value;$('#reset').disabled=value;$('#busy').hidden=!value;$('#main').setAttribute('aria-busy',String(value));}
async function request(payload){
 if(working)return null;controller=new AbortController();disable(true);notify('');
 const timer=setTimeout(()=>{if(working)$('#busy-text').textContent='Still waiting. The app allows only one repair; it will not keep calling the model.';},20000);
 const deadline=setTimeout(()=>controller?.abort(),195000);
 try{
  const r=await fetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
  const d=await r.json();if(!r.ok){const e=new Error(d.error||'The request failed.');e.code=d.code;e.requestId=d.requestId;throw e;}return d;
 }catch(e){
  const message=e.name==='AbortError'?'Request cancelled or timed out. Your inputs are unchanged. The server may finish a request already sent.':e.message;
  const failure={input:payload.stage==='confirm'?{stage:'confirm'}:payload,result:{action:'REQUEST_ERROR',message,code:e.code||null,requestId:e.requestId||null},date:new Date().toISOString()};state.history.push(failure);
  notify(message,true);const save=document.createElement('button');save.type='button';save.className='secondary';save.textContent='Download error record';save.addEventListener('click',()=>download('emotion-material-error.json',JSON.stringify(failure,null,2)));$('#notice .notice-box').append(document.createElement('br'),save);return null;
 }finally{clearTimeout(timer);clearTimeout(deadline);controller=null;disable(false);$('#busy-text').textContent='Checking your brief and asking the agent. This can take a moment.';}
}
async function generate(){
 const input=collect();state.input=input;state.sample=false;
 // Clear the previous output before starting, so a stale stopped result never looks current.
 state.result=null;state.selected=null;$('.step[data-page=options]').disabled=true;$('.step[data-page=notebook]').disabled=true;$('#options-content').replaceChildren();
 const result=await request(input);if(!result)return;
 state.result=result;state.history.push({date:new Date().toISOString(),input:structuredClone(input),result:exportableResult(result)});renderOptions();go('options');
}
function renderOptions(){
 const r=state.result;if(!r)return;$('#retry').hidden=!['GENERATE_EXPERIMENTS','GENERATION_FAILED'].includes(r.action);
 $('.step[data-page=options]').disabled=false;
 $('#brief-summary').textContent=`${state.sample?'Sample brief · ':''}${state.input.emotion} · ${state.input.time||'Time not set'} · ${state.input.mode==='digital'?'On screen':'Screen + materials'}`;
 const notice=state.sample?'<div class="notice-box">SAMPLE / NO API CALL. This fixed example demonstrates the notebook. It is not a live Gemini result or evaluation evidence.</div>':'';
 if(r.action==='GENERATE_EXPERIMENTS'){
  $('#options-content').innerHTML=notice+`<p class="hint">${escape(r.message)}</p>`+r.experiments.map((e,i)=>`<article class="card test-card"><div class="test-card-head"><div><span class="badge ${e.kind==='physical'?'physical':''}">${e.kind==='physical'?'DIGITAL + MATERIAL':'SCREEN TEST'} · ABOUT ${e.minutes} MIN</span><h2>${escape(e.title)}</h2></div><button class="primary" data-select="${i}">Choose this test</button></div><p class="concept">${escape(e.conceptConnection)}</p><p class="hint">Change only: ${escape(e.primaryVariable)}</p><div class="trials-mini">${e.trials.map(t=>`<span>${escape(t)}</span>`).join('')}</div><details><summary>What will I need to do?</summary><p class="hint">${escape(e.researchQuestion)}</p><ol class="method-text">${e.steps.map(s=>`<li>${escape(s)}</li>`).join('')}</ol><p class="constraint">${escape(e.constraintCheck)}</p></details></article>`).join('');
 }else{
  const title={ASK_CLARIFICATION:'Check one thing first',REQUEST_HUMAN_REVIEW:'Pause for human review',GENERATION_FAILED:'The app could not prepare a plan'}[r.action]||'No usable plan';
  $('#options-content').innerHTML=`<article class="card"><span class="badge">${escape(r.action)}</span><h2>${title}</h2><p>${escape(r.message)}</p>${r.questions?.length?`<ul>${r.questions.map(q=>`<li>${escape(q)}</li>`).join('')}</ul><p class="hint">Use Edit my setup to correct the field or add your answer under More context.</p>`:''}<p class="hint">${escape(r.reason)}</p></article>`;
 }
 $('#diagnostics').textContent=JSON.stringify({action:r.action,...r.agentMeta,sample:state.sample,reason:r.reason},null,2);
}
async function choose(index){
 if(working)return;const e=state.result?.experiments?.[index];if(!e)return;if(state.selected&&state.notes.some(n=>n.trim())&&!confirm('Choosing another test clears the open trial notes. Download or save them first if needed. Continue?'))return;
 if(!state.sample){const result=await request({stage:'confirm',planToken:state.result.planToken,selectedId:e.templateId});if(!result)return;state.history.push({date:new Date().toISOString(),input:{stage:'confirm',selectedId:e.templateId},result});if(result.action!=='COMPLETE'){notify('The plan was not confirmed. Please generate a fresh set.',true);return;}}
 state.selected=e;state.notes=['','',''];state.setup='';state.technical='';state.emotional='';state.next='';state.nextNote='';state.comparison=false;visualTrial=0;clock=0;renderNotebook();go('notebook');
}
function list(items){return `<ul>${items.map(s=>`<li>${escape(s)}</li>`).join('')}</ul>`;}
function renderNotebook(){
 const e=state.selected;if(!e)return;$('.step[data-page=notebook]').disabled=false;
 $('#test-title').textContent=e.title;$('#test-link').textContent=e.conceptConnection;$('#research-question').textContent=e.researchQuestion;$('#estimate').textContent=`About ${e.minutes} minutes for this test. Physical setup or drying may take longer.`;
 $('#method').innerHTML=`<p class="method-label">CHANGE ONLY</p><p class="method-text">${escape(e.primaryVariable)}</p><p class="method-label">KEEP THE SAME</p><div class="method-text">${list(e.constants)}</div><p class="method-label">RESOURCES</p><p class="method-text">${escape(e.materials.join(', '))}</p><p class="method-label">METHOD</p><ol class="method-text">${e.steps.map(s=>`<li>${escape(s)}</li>`).join('')}</ol><p class="constraint">${escape(e.constraintCheck)}</p>`;
 $('#evidence-hint').textContent=`${e.observableEvidence} “No visible difference” is a useful observation too.`;
 $('#trial-notes').innerHTML=e.trials.map((t,i)=>`<label for="note-${i}">${escape(t)}</label><textarea id="note-${i}" data-note="${i}" rows="3" maxlength="2000" placeholder="Describe what you see, not what it means.">${escape(state.notes[i])}</textarea>`).join('');
 $('#setup-note').value=state.setup;$('#technical').value=state.technical;$('#emotional').value=state.emotional;$('#next-note').value=state.nextNote;$$('input[name=next]').forEach(x=>x.checked=x.value===state.next);
 $('#technical-label').textContent=e.technicalQuestion;$('#emotional-label').textContent=e.emotionalQuestion;$('#reflection').hidden=!state.comparison;$('#note-error').textContent='';
 const tip=$('.visual-card > p:last-child');if(tip)tip.textContent=e.kind==='digital'||e.digitalVariable?'Change only the trial control. If you use a physical object, keep it unchanged. Full screen is optional. Stop if uncomfortable.':'Keep this visual setting fixed and change only the material condition. Full screen is optional. Stop if uncomfortable.';
 renderVisualControls();if(state.comparison)renderComparison();
}
function renderVisualControls(){const e=state.selected;if(!e)return;const changing=e.kind==='digital'||e.digitalVariable;const labels=changing?e.trials:['Fixed visual'];$('#visual-trials').innerHTML=labels.map((t,i)=>`<button type="button" data-trial="${i}" aria-pressed="${i===visualTrial}">${escape(t)}</button>`).join('');$('#visual-description').textContent=changing?`Current condition: ${e.trials[visualTrial]}. Keep the physical context unchanged if used.`:'Keep this same digital visual for every physical trial. Change only the listed material condition.';$('#motion').textContent=paused?'Play motion':'Pause motion';}
function renderComparison(){
 $('#comparison').innerHTML=`<div class="compare-grid">${state.selected.trials.map((t,i)=>`<div><strong>${escape(t)}</strong><p>${escape(state.notes[i])}</p></div>`).join('')}</div><p class="hint">These are your notes, not an AI interpretation. What stayed consistent? What differed? Could a setup change explain it?</p>`;
}
function compare(){
 const missing=state.notes.findIndex(n=>!n.trim());if(missing>=0){$('#note-error').textContent='Add a note for each trial. If you stopped or saw no change, record that.';$('#note-'+missing).focus();return;}
 state.comparison=true;renderComparison();$('#reflection').hidden=false;$('#reflection').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function exportableResult(result){const {planToken,...rest}=result;return rest;}
function download(name,data,type='application/json'){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function notebookText(){const e=state.selected;return `EMOTION-TO-MATERIAL NOTEBOOK\n${new Date().toISOString()}\n${state.sample?'SAMPLE WORKFLOW — NO API CALL\n':''}Concept: ${state.input.emotion}\nTest: ${e.title}\nQuestion: ${e.researchQuestion}\nChange: ${e.primaryVariable}\nKeep the same: ${e.constants.join('; ')}\nResources: ${e.materials.join(', ')}\n\nMETHOD\n${e.steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\nOBSERVATIONS\n${e.trials.map((t,i)=>`${t}: ${state.notes[i]}`).join('\n\n')}\nSetup changes / stopped conditions: ${state.setup}\n\nREFLECTION\n${e.technicalQuestion}\n${state.technical}\n\n${e.emotionalQuestion}\n${state.emotional}\n\nNEXT\n${state.next}\n${state.nextNote}\n\nLIMIT\nThis notebook is not safety approval, a diagnosis, or proof of a completed physical test. Interpretation stays with the student.\n`;}
function sample(){
 const input={emotion:'Wanting closeness but also needing distance.',materials:[labels[0]],workspace:'Tabletop only',mode:'digital',availableMinutes:15,time:'15 minutes',skills:'Beginner — no coding needed',safetyLimits:'',safetyConfirmed:true,budget:'$0',projectionTarget:'none',additionalContext:''};
 fill(input);state.input=input;state.sample=true;state.selected=null;$('.step[data-page=notebook]').disabled=true;
 const specs=[['digitalSpacing','Space between','spacing','Gap between two moving shapes',['Small gap','Medium gap','Wide gap'],'Compare how much space remains between the moving shapes before deciding whether any gap connects to your idea.','Which observed gap connects to your idea, if any, and why?'],['digitalDensity','How much is enough?','density','Number of slowly moving marks',['Few marks','Some marks','Many marks'],'Compare what you can track as the number of marks changes. Decide for yourself whether this relates to emotional distance.','Which grouping of marks connects with your idea, if any?'],['digitalPace','Time to notice','pace','Speed of continuous, non-flashing movement',['Still','Slow movement','Moderate movement'],'Compare the time you have to follow motion before interpreting its link to your concept.','How does the observed pace connect with your idea, if at all?']];
 state.result={action:'GENERATE_EXPERIMENTS',message:'A fixed example. Live suggestions require Find my tests.',reason:'Sample only',agentMeta:{provider:'No provider call',model:'None',requestCount:0,validationStatus:'sample — not a model test'},experiments:specs.map(([templateId,title,focus,primaryVariable,trials,conceptConnection,emotionalQuestion])=>({templateId,title,focus,primaryVariable,trials,conceptConnection,emotionalQuestion,kind:'digital',minutes:8,researchQuestion:`What changes across ${trials.join(', ')}?`,constants:['Same screen and room light','Same color and shape size','Same viewing position'],materials:[labels[0]],steps:['Open the built-in visual.','Compare each trial for a similar short period.','Record visible changes before interpreting them.'],observableEvidence:'Record arrangement, grouping, and movement.',technicalQuestion:'What visible difference can you describe?',constraintCheck:'Use slow motion at a comfortable brightness. Stop if uncomfortable.'}))};
 notify('');renderOptions();go('options');
}
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b)return;
 if(b.dataset.page&&!b.disabled){go(b.dataset.page);return;}
 if(b.dataset.idea){$('#emotion').value=b.dataset.idea;$('#emotion').focus();}
 if(b.dataset.select!==undefined)choose(Number(b.dataset.select));
 if(b.dataset.trial!==undefined){visualTrial=Number(b.dataset.trial);clock=0;renderVisualControls();}
});
$('#brief-form').addEventListener('submit',e=>{e.preventDefault();generate();});
$('#brief-form').addEventListener('change',updateFields);
$('#retry').addEventListener('click',generate);$('#sample').addEventListener('click',sample);
$('#cancel').addEventListener('click',()=>controller?.abort());
$('#compare').addEventListener('click',compare);
$('#trial-notes').addEventListener('input',e=>{if(e.target.dataset.note!==undefined){state.notes[Number(e.target.dataset.note)]=e.target.value;if(state.comparison)renderComparison();}});
for(const [id,key]of [['setup-note','setup'],['technical','technical'],['emotional','emotional'],['next-note','nextNote']])$('#'+id).addEventListener('input',e=>state[key]=e.target.value);
$$('input[name=next]').forEach(x=>x.addEventListener('change',()=>state.next=x.value));
$('#export-notebook').addEventListener('click',()=>download('emotion-material-notebook.txt',notebookText(),'text/plain;charset=utf-8'));
$('#export-run').addEventListener('click',()=>download('emotion-material-run-record.json',JSON.stringify({version:'3.0.1',sample:state.sample,input:state.input,result:exportableResult(state.result||{}),history:state.history},null,2)));
$('#save-local').addEventListener('click',()=>{try{localStorage.setItem('emotion-material-notebook-v3',JSON.stringify({version:3,date:new Date().toISOString(),input:state.input,selected:state.selected,notes:state.notes,setup:state.setup,technical:state.technical,emotional:state.emotional,next:state.next,nextNote:state.nextNote,comparison:state.comparison,sample:state.sample}));notify('Notebook saved on this device. Export a copy before clearing browser data.');}catch{notify('This browser could not save the notebook. Download a copy instead.',true);}});
$('#remove-local').addEventListener('click',()=>{try{localStorage.removeItem('emotion-material-notebook-v3');notify('Saved device copy removed. The open notebook has not been cleared.');}catch{notify('Device storage is unavailable.',true);}});
window.addEventListener('beforeprint',()=>{document.body.classList.toggle('notebook-print',Boolean(state.selected));if(state.selected)$('#print-report').textContent=notebookText();});
window.addEventListener('afterprint',()=>document.body.classList.remove('notebook-print'));
$('#print').addEventListener('click',()=>window.print());
$('#reset').addEventListener('click',()=>{if((state.selected||state.result)&&!confirm('Start again? Unsaved work in this tab will be cleared. A saved device copy will remain.'))return;location.reload();});
$('#motion').addEventListener('click',()=>{paused=!paused;renderVisualControls();});$('#restart-motion').addEventListener('click',()=>clock=0);
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#visual').requestFullscreen();}catch{notify('Full screen is not available here. You can still use the visual on this page.',true);}});
const canvas=$('#visual'),ctx=canvas.getContext('2d');
function draw(time){
 const dt=previousTime?Math.min(50,time-previousTime):0;previousTime=time;
 if(state.selected&&!$('#notebook').hidden&&!document.hidden){
  if(!paused)clock+=dt/1000;
  const e=state.selected,trial=e.kind==='digital'||e.digitalVariable?visualTrial:1,focus=e.focus;
  ctx.fillStyle='#10182c';ctx.fillRect(0,0,1000,560);
  ctx.strokeStyle='#26334a';ctx.lineWidth=1;for(let x=50;x<1000;x+=100){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,560);ctx.stroke();}
  const speed=focus==='pace'?[0,.12,.26][trial]:.12;
  const t=clock*speed;
  if(focus==='density'){
   const count=[4,12,28][trial];for(let i=0;i<count;i++){const x=100+((i*137)%800),y=100+((i*71)%340)+Math.sin(t+i)*16;ctx.fillStyle=i%3?'#b4c6ef':'#ddec9c';ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.fill();}
  }else{
   const gap=focus==='spacing'?[90,240,450][trial]:240,y=280+Math.sin(t)*40;
   ctx.fillStyle='#b4c6ef';ctx.beginPath();ctx.arc(500-gap/2,y,35,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ddec9c';ctx.beginPath();ctx.arc(500+gap/2,y,35,0,Math.PI*2);ctx.fill();
  }
 }requestAnimationFrame(draw);
}
requestAnimationFrame(draw);updateFields();
try{const saved=JSON.parse(localStorage.getItem('emotion-material-notebook-v3'));if(saved?.version===3&&saved.selected&&Array.isArray(saved.notes)&&saved.notes.length===3){notify('A notebook is saved on this device.');const b=document.createElement('button');b.className='secondary';b.textContent='Resume saved notebook';b.addEventListener('click',()=>{Object.assign(state,saved);state.result={action:'GENERATE_EXPERIMENTS',message:'Restored notebook. Generate again to choose a different test.',experiments:[saved.selected],agentMeta:{validationStatus:'restored local notebook — not a new API run'}};fill(saved.input);renderOptions();renderNotebook();go('notebook');notify('Restored locally. No model request was made.');});$('#notice .notice-box').append(document.createElement('br'),b);}}catch{/* Storage may be unavailable. It is optional. */}
