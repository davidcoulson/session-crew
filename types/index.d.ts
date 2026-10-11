export type CrewStatus = 'proposed' | 'working' | 'idle' | 'done' | 'dismissed'

export type CrewSession = {
  /** `local_…` once it runs; `task_…` while it is a proposal card. */
  id: string
  /** The proposal's task id, kept once it became a session. */
  taskId?: string
  /** The short handle the app gives a session (`nut-pr-review-fixes`). */
  name: string
  title: string
  status: CrewStatus
  /** First seen by this mod (or the proposal's time); not the app's createdAt. */
  startedAt: number
  /** When the status last changed. */
  changedAt: number
  /** When this crew last saw the status change (not just learned it): the strip shows only such changes. */
  changeSeenAt?: number
  /** Set while done or dismissed. */
  endedAt?: number
  /** Extra words from the app's note: `PR #199`, `started by x`. */
  note?: string
  /** Order it joined the crew; picks its costume when no rule and no `costume` does. */
  slot?: number
  /** The costume it was given when it first joined any crew (kept in $.store), when no rule picks one. */
  costume?: string
  /** Brought in by /crew import or the sync tool rather than seen being started. */
  isImported?: true
  /** What last told us the status (`start_session`, `linked-note`, `poll`, `tool`). */
  source: string
}

export type CrewPanel = {
  isCompact: boolean
  isDoneHidden: boolean
}

export type CrewPoll = {
  /** False once the mod could not fetch list_sessions itself, by either route. */
  isAvailable: boolean
  /** How the last fetch got through: the MCP server directly, or the session's own tool call. */
  via?: 'mcp' | 'tool'
  lastAt: number
  lastError?: string
}

export type CrewListed = {
  id: string
  name?: string
  title?: string
  isRunning?: boolean
  isArchived?: boolean
  startedBy?: string
  prNumber?: number
  status?: string
  /** The app's ISO time of the session's last activity. */
  lastActivityAt?: string
}

export type CrewImport = {
  parent?: string
  match?: string
  includeArchived?: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'session-crew': {
      crew: CrewSession[]
      panel: CrewPanel
      poll: CrewPoll
      now: number
      /** The last list_sessions result seen, for the sync tool to import from. */
      listing: CrewListed[]
      /** The /crew import filter in force (mirrored in $.store), or null. */
      importing: CrewImport | null
      /** Whether the strip above the prompt shows (the `strip` option, overridden by /crew strip, kept in $.store). */
      stripOn: boolean
      /** When the person last sent a prompt: finished sessions leave the strip after it. */
      lastPromptAt: number
      /** The strip's own clock, ticked only while a finished crab is due to change. */
      bandNow: number
      /** Costume rules set with /crew face (pattern to costume), mirrored from $.store. */
      faces: Record<string, string>
    }
  }
}
