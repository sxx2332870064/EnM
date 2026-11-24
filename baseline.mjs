import {getEligibleTemplates,buildExperiment} from './experiment-library.mjs';
import {getMissingEssentialFields,conflictQuestions} from './input-rules.mjs';
import {detectExplicitBoundary} from './safety-rules.mjs';
export function baseline(input){
 if(detectExplicitBoundary(input))return {action:'REQUEST_HUMAN_REVIEW',experiments:[],message:'Ask an instructor or appropriate professional before continuing.'};
 const missing=getMissingEssentialFields(input),conflicts=conflictQuestions(input);
 if(missing.length||conflicts.length)return {action:'ASK_CLARIFICATION',experiments:[],message:'Resolve the missing or conflicting information.',questions:conflicts.length?conflicts:missing.map(x=>`Please confirm ${x}.`)};
 const eligible=getEligibleTemplates(input);
 if(!eligible.length)return {action:'ASK_CLARIFICATION',experiments:[],message:'No supported tests fit this setup.',questions:['Can you confirm laptop access or allow more time?']};
 const chosen=eligible.slice(0,3);
 if(input.mode==='mixed'&&eligible.some(t=>t.kind==='physical')&&!chosen.some(t=>t.kind==='physical'))chosen[chosen.length-1]=eligible.find(t=>t.kind==='physical');
 return {action:'GENERATE_EXPERIMENTS',message:'Fixed library order, no model personalization.',experiments:chosen.map(t=>buildExperiment(t))};
}
