// Forms are validated in their submit handlers and the first problem is shown as a toast, so the
// browser's own validation bubbles are switched off (noValidate) and these helpers do the checking.
export type Check = [failed: boolean, message: string]

export const firstProblem = (checks: Check[]): string | null => checks.find(([failed]) => failed)?.[1] ?? null

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
