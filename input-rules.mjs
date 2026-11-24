export const MATERIALS = ['Laptop with basic p5.js','Projector','Tracing paper','Thread','Room-temperature modeling wax','Ink','Speakers','Small LEDs without confirmed power setup'];
export const WORKSPACES = ['Tabletop + wall','Tabletop only','Wall area only'];
const text = (value, max = 600) => typeof value === 'string' ? value.trim().slice(0,max) : '';
export function normalizeInput(body = {}) {
  return {
    emotion: text(body.emotion), materials: [...new Set((Array.isArray(body.materials)?body.materials:[]).filter(m=>MATERIALS.includes(m)))],
    workspace: WORKSPACES.includes(body.workspace)?body.workspace:'', safetyLimits:text(body.safetyLimits),
    safetyConfirmed:body.safetyConfirmed===true, mode:body.mode==='digital'?'digital':'mixed',
    projectionTarget:body.projectionTarget==='wall'?'wall':'none',
    skills:text(body.skills),time:text(body.time,200),budget:text(body.budget,100),additionalContext:text(body.additionalContext),
    mediaPriority:text(body.mediaPriority,300),
    availableMinutes: Number.isFinite(Number(body.availableMinutes)) && Number(body.availableMinutes)>0 ? Math.min(10080,Number(body.availableMinutes)):null
  };
}
export function getMissingEssentialFields(input) {
  const missing=[];
  if(!input.emotion) missing.push('emotion or concept');
  if(!input.materials?.length) missing.push('materials and tools');
  if(!input.workspace) missing.push('workspace');
  if(!input.safetyConfirmed && !input.safetyLimits) missing.push('safety or access limits');
  return missing;
}
export function conflictQuestions(input) {
  const c=input.additionalContext.toLowerCase();
  const questions=[];
  if(input.materials.includes('Projector') && /projector.{0,45}(not available|unavailable|mistake|broken)|(?:no|without)\s+(?:a\s+)?projector/.test(c)) questions.push('The projector is selected but your note says it is unavailable. Please deselect it, or correct your note.');
  if(input.materials.includes('Laptop with basic p5.js') && /laptop.{0,35}(not available|unavailable|broken)/.test(c)) questions.push('Is the laptop available? Please make the selection and note agree.');
  return questions;
}
export function minutesFor(input) {
  if(input.availableMinutes) return input.availableMinutes;
  const m=input.time.match(/(\d+(?:\.\d+)?)\s*(minute|min\b|hour|hr\b|day|week)/i);
  if(!m) return null;
  return Number(m[1]) * (/week/i.test(m[2])?10080:/day/i.test(m[2])?1440:/hour|hr/i.test(m[2])?60:1);
}
