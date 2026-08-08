/**
 * Conversation Orchestrator — AI/NLU decides intent; tools own real data.
 */

export type OrchestratorDomain =
  | 'weather'
  | 'places'
  | 'calendar'
  | 'reminder'
  | 'travel'
  | 'restaurant'
  | 'translation'
  | 'music'
  | 'chat'
  | 'help'
  | 'memory'
  | 'unknown'

export type OrchestratorPlan = {
  domain: OrchestratorDomain
  /** Tool must run for real data — LLM must not invent. */
  requiresTool: boolean
  /** After tool (or alone), Hybrid LLM should phrase the reply. */
  useLlmReply: boolean
  entities: {
    city?: string
    dateHint?: string
    query?: string
    language?: string
  }
  reason: string
  confidence: number
}
