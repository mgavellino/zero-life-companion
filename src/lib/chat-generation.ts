/** Keep UI suggestions out of the action loop and always reserve the last step for prose. */
export function chatStepPolicy(stepNumber: number) {
  return stepNumber >= 4 ? { toolChoice: "none" as const } : {};
}