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
  /** Set while done or dismissed. */
  endedAt?: number
  /** Extra words from the app's note: `PR #199`, `started by x`. */
  note?: string
  /** What last told us the status (`start_session`, `linked-note`, `poll`, `tool`). */
  source: string
}

export type CrewPanel = {
  isCompact: boolean
  isDoneHidden: boolean
}

export type CrewPoll = {
  /** False once a `$.mcp.call` to the app's session server failed. */
  isAvailable: boolean
  lastAt: number
  lastError?: string
}

declare module 'claude-code' {
  interface PluginState {
    'session-crew': {
      crew: CrewSession[]
      panel: CrewPanel
      poll: CrewPoll
      now: number
      /** Faces set with /crew face, mirrored from $.store. */
      faces: Record<string, string>
    }
  }
}
