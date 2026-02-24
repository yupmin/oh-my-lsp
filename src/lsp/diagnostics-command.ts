import { DEFAULT_MAX_DIAGNOSTICS } from "./constants"
import { filterDiagnosticsBySeverity, formatDiagnostic } from "./lsp-formatters"
import { withLspClient } from "./lsp-client-wrapper"
import type { Diagnostic } from "./types"

export type DiagnosticSeverityFilter = "error" | "warning" | "information" | "hint" | "all"

export interface DiagnosticsArgs {
  filePath: string
  severity?: DiagnosticSeverityFilter
}

export async function diagnostics(args: DiagnosticsArgs): Promise<string> {
  try {
    const result = await withLspClient(args.filePath, async (client) => {
      return (await client.diagnostics(args.filePath)) as { items?: Diagnostic[] } | Diagnostic[] | null
    })

    let diagnosticsList: Diagnostic[] = []
    if (result) {
      if (Array.isArray(result)) {
        diagnosticsList = result
      } else if (result.items) {
        diagnosticsList = result.items
      }
    }

    diagnosticsList = filterDiagnosticsBySeverity(diagnosticsList, args.severity)

    if (diagnosticsList.length === 0) {
      const output = "No diagnostics found"
      return output
    }

    const total = diagnosticsList.length
    const truncated = total > DEFAULT_MAX_DIAGNOSTICS
    const limited = truncated ? diagnosticsList.slice(0, DEFAULT_MAX_DIAGNOSTICS) : diagnosticsList
    const lines = limited.map(formatDiagnostic)
    if (truncated) {
      lines.unshift(`Found ${total} diagnostics (showing first ${DEFAULT_MAX_DIAGNOSTICS}):`)
    }
    const output = lines.join("\n")
    return output
  } catch (e) {
    const output = `Error: ${e instanceof Error ? e.message : String(e)}`
    return output
  }
}
