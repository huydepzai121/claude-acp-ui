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

// When a tool call started (clock ms) and how long it ran, by tool_use_id;
// `isErrored` is set once the call ends in an error or a refusal.
export type Timing = { startedAt: number; ms: number | null; isErrored?: boolean }

// The main loop's tool calls grouped into runs, so consecutive rows share one
// frame: the open run's id (empty when the next call starts a new one), each
// call's run, and each run's calls in order.
export type ToolRuns = { current: string; byId: Record<string, string>; order: Record<string, string[]> }

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
      // Folded/unfolded state by tool_use_id (a diff) or run id (a whole run).
      expanded: Record<string, boolean>
      toolRuns: ToolRuns
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
