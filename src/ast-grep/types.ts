import type { CLI_LANGUAGES } from "./constants"

export type CliLanguage = (typeof CLI_LANGUAGES)[number]

export interface Position {
  line: number
  column: number
}

export interface Range {
  start: Position
  end: Position
}

export interface CliMatch {
  text: string
  range: {
    start: Position
    end: Position
  }
  file: string
  lines: string
  charCount: {
    leading: number
    trailing: number
  }
  language: string
}

export interface SgResult {
  matches: CliMatch[]
  totalMatches: number
  truncated: boolean
  truncatedReason?: "max_matches" | "max_output_bytes" | "timeout"
  error?: string
}

export interface RunSgOptions {
  pattern: string
  lang: CliLanguage
  paths?: string[]
  globs?: string[]
  rewrite?: string
  context?: number
  updateAll?: boolean
  timeoutMs?: number
  cwd?: string
}
