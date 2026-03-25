import { PILLAR_KEYS } from "./scale-code"

export const PROMPT_CATEGORIES = PILLAR_KEYS

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number]
