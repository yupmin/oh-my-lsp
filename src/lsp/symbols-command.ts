import { DEFAULT_MAX_SYMBOLS } from "./constants"
import { formatDocumentSymbol, formatSymbolInfo } from "./lsp-formatters"
import { withLspClient } from "./lsp-client-wrapper"
import type { DocumentSymbol, SymbolInfo } from "./types"

export interface SymbolsArgs {
  filePath: string
  scope?: "document" | "workspace"
  query?: string
  limit?: number
}

export async function symbols(args: SymbolsArgs): Promise<string> {
  try {
    const scope = args.scope ?? "document"

    if (scope === "workspace") {
      if (!args.query) {
        return "Error: 'query' is required for workspace scope"
      }

      const result = await withLspClient(args.filePath, async (client) => {
        return (await client.workspaceSymbols(args.query!)) as SymbolInfo[] | null
      })

      if (!result || result.length === 0) {
        return "No symbols found"
      }

      const total = result.length
      const limit = Math.min(args.limit ?? DEFAULT_MAX_SYMBOLS, DEFAULT_MAX_SYMBOLS)
      const truncated = total > limit
      const limited = result.slice(0, limit)
      const lines = limited.map(formatSymbolInfo)
      if (truncated) {
        lines.unshift(`Found ${total} symbols (showing first ${limit}):`)
      }
      return lines.join("\n")
    }

    const result = await withLspClient(args.filePath, async (client) => {
      return (await client.documentSymbols(args.filePath)) as DocumentSymbol[] | SymbolInfo[] | null
    })

    if (!result || result.length === 0) {
      return "No symbols found"
    }

    const total = result.length
    const limit = Math.min(args.limit ?? DEFAULT_MAX_SYMBOLS, DEFAULT_MAX_SYMBOLS)
    const truncated = total > limit
    const limited = truncated ? result.slice(0, limit) : result

    const lines: string[] = []
    if (truncated) {
      lines.push(`Found ${total} symbols (showing first ${limit}):`)
    }

    if ("range" in limited[0]) {
      lines.push(...(limited as DocumentSymbol[]).map((s) => formatDocumentSymbol(s)))
    } else {
      lines.push(...(limited as SymbolInfo[]).map(formatSymbolInfo))
    }
    return lines.join("\n")
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : String(e)}`
  }
}
