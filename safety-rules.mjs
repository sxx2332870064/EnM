// A selected-pattern screen, not a general safety assessment.
export function detectExplicitBoundary(input={}) {
  const clauses=[input.emotion,input.skills,input.safetyLimits,input.additionalContext,input.mediaPriority].filter(Boolean).join('. ').split(/[.!?;\n]+|\bbut\b|\bhowever\b/i);
  return clauses.some(raw=>{
    const s=raw.toLowerCase();
    if(/\b(?:diagnos(?:e|is|ing)|self[- ]harm|suicid\w*)\b/.test(s) && !/\b(?:no|not|without|do not|don't)\b/.test(s)) return true;
    if(/\b(?:as|for) therapy\b|\btreat my\b/.test(s) && !/\b(?:no|not|without|do not|don't)\b/.test(s)) return true;
    const prohibited=/\b(?:open flame|strobe|rapid(?:ly)? flash(?:ing)?|burn(?:ing)? wax)\b|set.{0,25}wax.{0,15}on fire|(?:light|ignite|use|start).{0,30}\bfire\b/;
    const negated=/\b(?:no|not|cannot|can't|without|avoid|do not|don't|prohibited|never)\b|not allowed|not permitted/;
    return prohibited.test(s) && !negated.test(s);
  });
}
