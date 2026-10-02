export type FileChange = {
  status: string
  path: string
  added: number
  removed: number
  // The first changed lines, each led by `+` or `-`; empty for a new file.
  preview: string[]
}

export type Git = { branch: string; head: string; files: FileChange[] }

export type Band = { model: string; ctxPercent: number | null }

export type Footer = { test: 'pass' | 'fail' | null; minutes: number; usd: number | null }

export type Stats = { total: number; tools: Record<string, number> }

// When a tool call started (clock ms) and how long it ran, by tool_use_id.
export type Timing = { startedAt: number; ms: number | null }

// What Claude did, in order: one entry per tool call, `think` for a quiet gap.
export type Beat = 'think' | 'read' | 'search' | 'edit' | 'run' | 'other'

// One step a subagent took: a tool call, as its card lists it.
export type AgentStep = { id: string; tool: string; target: string; isDone: boolean; isErrored: boolean }

// A subagent the session started, from spawn to its last turn.
export type AgentRun = {
  agentId: string
  toolUseId: string
  type: string
  description: string
  startedAt: number
  endedAt: number | null
  tools: number
  steps: AgentStep[]
  filesRead: string[]
  filesEdited: string[]
  answer: string
}

// The band's scene: what the cat says, how far the turn got, and the game.
export type Scene = {
  enabled: boolean
  bubble: string
  turnTools: number
  playing: boolean
  jumpSeq: number
  score: number
  best: number
}

declare module 'claude-code' {
  interface PluginState {
    'acp-ui': {
      git: Git | null
      band: Band | null
      footer: Footer | null
      stats: Stats
      timings: Record<string, Timing>
      expanded: Record<string, boolean>
      beats: Beat[]
      // Tool calls per clock minute (minute index → count).
      activity: Record<string, number>
      // Subagents by agentId, and the Agent tool call that started each.
      agents: Record<string, AgentRun>
      agentByToolUse: Record<string, string>
      scene: Scene
    }
  }
}
