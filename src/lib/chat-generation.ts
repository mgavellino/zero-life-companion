/** Keep UI suggestions out of the action loop and always reserve the last step for prose. */
export function chatStepPolicy(stepNumber: number, hasSavedAction = false, retry = false) {
  return stepNumber >= 4 || hasSavedAction || retry ? { toolChoice: "none" as const } : {};
}