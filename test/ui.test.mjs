import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const script=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
function setup(fetchImpl){
 const dom=new JSDOM(html,{url:'http://localhost:3000',runScripts:'outside-only'}),w=dom.window;
 w.matchMedia=()=>({matches:true});w.scrollTo=()=>{};w.requestAnimationFrame=()=>0;w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>({});w.structuredClone=structuredClone;w.fetch=fetchImpl||(()=>{throw new Error('Unexpected API request in sample');});w.confirm=()=>true;w.eval(script);return {dom,w,q:s=>w.document.querySelector(s)};
}
const tick=()=>new Promise(r=>setTimeout(r,25));
test('sample flow runs without a model, opens notebook, enforces observations',()=>{
 const {dom,w,q}=setup();q('#sample').click();assert.equal(q('#options').hidden,false);assert.match(q('#options-content').textContent,/NO API CALL/);assert.equal(w.document.querySelectorAll('[data-select]').length,3);
 q('[data-select="0"]').click();assert.equal(q('#notebook').hidden,false);assert.equal(w.document.querySelectorAll('#trial-notes textarea').length,3);
 q('#compare').click();assert.match(q('#note-error').textContent,/Add a note/);assert.equal(q('#reflection').hidden,true);
 for(let i=0;i<3;i++){q('#note-'+i).value=`Observed gap ${i}`;q('#note-'+i).dispatchEvent(new w.Event('input',{bubbles:true}));}
 q('#compare').click();assert.equal(q('#reflection').hidden,false);assert.match(q('#comparison').textContent,/Observed gap 2/);
 q('#save-local').click();assert.ok(w.localStorage.getItem('emotion-material-notebook-v3'));q('#remove-local').click();assert.equal(w.localStorage.getItem('emotion-material-notebook-v3'),null);dom.window.close();
});
test('model failure renders one current failure, not a leftover reviewing banner',async()=>{
 const {dom,w,q}=setup(async()=>({ok:true,json:async()=>({action:'GENERATION_FAILED',message:'App output problem.',reason:'Two drafts failed.',questions:[],experiments:[],agentMeta:{requestCount:2,validationStatus:'failed after one repair'}})}));
 q('#emotion').value='Closeness';q('#safe').checked=true;q('#brief-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(q('#busy').hidden,true);assert.match(q('#options-content').textContent,/could not prepare/);assert.ok(!q('#options-content').textContent.includes('reviewing confirmed'));assert.equal(q('#generate').disabled,false);dom.window.close();
});
test('model text is escaped instead of being executed as HTML',async()=>{
 const {dom,w,q}=setup(async()=>({ok:true,json:async()=>({action:'ASK_CLARIFICATION',message:'<img src=x onerror=alert(1)>',reason:'test',questions:['<script>bad()</script>'],experiments:[],agentMeta:{}})}));
 q('#brief-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.equal(q('#options-content img'),null);assert.equal(q('#options-content script'),null);assert.match(q('#options-content').textContent,/<img/);dom.window.close();
});
test('provider HTTP error preserves typed form and ends loading',async()=>{
 const {dom,w,q}=setup(async()=>({ok:false,json:async()=>({error:'Temporarily unavailable',code:'PROVIDER_UNAVAILABLE'})}));q('#emotion').value='Keep my idea';
 q('#brief-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.equal(q('#emotion').value,'Keep my idea');assert.equal(q('#busy').hidden,true);assert.match(q('#notice').textContent,/Temporarily unavailable/);dom.window.close();
});
test('static form fields have explicit labels and essential targets exist',()=>{
 const {dom,w}=setup();for(const e of w.document.querySelectorAll('input:not([type=checkbox]):not([type=radio]),textarea,select'))assert.ok(w.document.querySelector(`label[for="${e.id}"]`),e.id);for(const e of w.document.querySelectorAll('button'))assert.equal(e.type==='submit'||e.type==='button',true);dom.window.close();
});
