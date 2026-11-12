// Neutral defaults preserve the existing scan until the operator adjusts a control.
export const defaultScanTuning = () => ({
  settleUs: 0, blankLeadUs: 0, blankTailUs: 0, colorDelayUs: 0,
  traceStep: 64, cornerSlowdown: 0, route: 'original', returnToCenter: true
});
export function validateScanTuning(raw = defaultScanTuning()) {
  const defaults = defaultScanTuning();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(key => !Object.hasOwn(defaults,key))) throw new Error('Invalid scan tuning');
  const result = {...defaults,...raw};
  for (const [key,min,max] of [['settleUs',0,1500],['blankLeadUs',0,1000],['blankTailUs',0,1000],['colorDelayUs',-1000,1000],['traceStep',8,64],['cornerSlowdown',0,100]]) {
    if (!Number.isFinite(result[key]) || result[key]<min || result[key]>max) throw new Error(`Scan ${key} must be ${min}–${max}`);
  }
  if (!['original','nearest','nearest-reverse'].includes(result.route) || typeof result.returnToCenter !== 'boolean') throw new Error('Invalid scan route');
  return result;
}
