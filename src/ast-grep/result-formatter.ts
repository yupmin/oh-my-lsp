import type { CliLanguage, SgResult } from "./types"

export function formatSearchResult(result: SgResult): string {
  if (result.error) {
    return `Error: ${result.error}`
  }

  if (result.matches.length === 0) {
    return "No matches found"
  }

  const lines: string[] = []

  if (result.truncated) {
    const reason =
      result.truncatedReason === "max_matches"
        ? `showing first ${result.matches.length} of ${result.totalMatches}`
        : result.truncatedReason === "max_output_bytes"
          ? "output exceeded 1MB limit"
          : "search timed out"
    lines.push(`[TRUNCATED] Results truncated (${reason})\n`)
  }

  lines.push(
    `Found ${result.matches.length} match(es)${
      result.truncated ? ` (truncated from ${result.totalMatches})` : ""
    }:\n`
  )

  for (const match of result.matches) {
    const loc = `${match.file}:${match.range.start.line + 1}:${match.range.start.column + 1}`
    lines.push(loc)
    lines.push(`  ${match.lines.trim()}`)
    lines.push("")
  }

  return lines.join("\n")
}

export function formatReplaceResult(result: SgResult, isDryRun: boolean): string {
  if (result.error) {
    return `Error: ${result.error}`
  }

  if (result.matches.length === 0) {
    return "No matches found to replace"
  }

  const prefix = isDryRun ? "[DRY RUN] " : ""
  const lines: string[] = []

  if (result.truncated) {
    const reason =
      result.truncatedReason === "max_matches"
        ? `showing first ${result.matches.length} of ${result.totalMatches}`
        : result.truncatedReason === "max_output_bytes"
          ? "output exceeded 1MB limit"
          : "search timed out"
    lines.push(`[TRUNCATED] Results truncated (${reason})\n`)
  }

  lines.push(`${prefix}${result.matches.length} replacement(s):\n`)

  for (const match of result.matches) {
    const loc = `${match.file}:${match.range.start.line + 1}:${match.range.start.column + 1}`
    lines.push(loc)
    lines.push(`  ${match.text}`)
    lines.push("")
  }

  if (isDryRun) {
    lines.push("Use --no-dry-run to apply changes")
  }

  return lines.join("\n")
}

export function getEmptyResultHint(pattern: string, lang: CliLanguage): string | null {
  const src = pattern.trim()

  if (lang === "python") {
    if (src.startsWith("class ") && src.endsWith(":")) {
      const withoutColon = src.slice(0, -1)
      return `Hint: Remove trailing colon. Try: "${withoutColon}"`
    }
    if ((src.startsWith("def ") || src.startsWith("async def ")) && src.endsWith(":")) {
      const withoutColon = src.slice(0, -1)
      return `Hint: Remove trailing colon. Try: "${withoutColon}"`
    }
  }

  if (["javascript", "typescript", "tsx"].includes(lang)) {
    if (/^(export\s+)?(async\s+)?function\s+\$[A-Z_]+\s*$/i.test(src)) {
      return 'Hint: Function patterns need params and body. Try "function $NAME($$$) { $$$ }"'
    }
  }

  return null
}
