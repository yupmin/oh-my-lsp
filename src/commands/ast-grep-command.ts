import { getEmptyResultHint, formatReplaceResult, formatSearchResult } from "../ast-grep/result-formatter"
import { runSg } from "../ast-grep/cli"
import type { CliLanguage } from "../ast-grep/types"

export interface AstGrepSearchArgs {
  pattern: string
  lang: CliLanguage
  paths?: string[]
  globs?: string[]
  context?: number
  timeoutMs?: number
}

export interface AstGrepReplaceArgs {
  pattern: string
  rewrite: string
  lang: CliLanguage
  paths?: string[]
  globs?: string[]
  dryRun?: boolean
  timeoutMs?: number
}

export async function astGrepSearch(args: AstGrepSearchArgs): Promise<string> {
  try {
    const result = await runSg({
      pattern: args.pattern,
      lang: args.lang,
      paths: args.paths,
      globs: args.globs,
      context: args.context,
      timeoutMs: args.timeoutMs,
    })

    let output = formatSearchResult(result)
    if (result.matches.length === 0 && !result.error) {
      const hint = getEmptyResultHint(args.pattern, args.lang)
      if (hint) {
        output += `\n\n${hint}`
      }
    }

    return output
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : String(e)}`
  }
}

export async function astGrepReplace(args: AstGrepReplaceArgs): Promise<string> {
  try {
    const dryRun = args.dryRun !== false
    const result = await runSg({
      pattern: args.pattern,
      rewrite: args.rewrite,
      lang: args.lang,
      paths: args.paths ?? ["."],
      globs: args.globs,
      updateAll: !dryRun,
      timeoutMs: args.timeoutMs,
    })

    return formatReplaceResult(result, dryRun)
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : String(e)}`
  }
}
