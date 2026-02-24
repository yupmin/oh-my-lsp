import { formatLocation } from "./lsp-formatters"
import { withLspClient } from "./lsp-client-wrapper"
import type { Location, LocationLink } from "./types"

export interface GotoDefinitionArgs {
  filePath: string
  line: number
  character: number
}

export async function gotoDefinition(args: GotoDefinitionArgs): Promise<string> {
  try {
    const result = await withLspClient(args.filePath, async (client) => {
      return (await client.definition(args.filePath, args.line, args.character)) as
        | Location
        | Location[]
        | LocationLink[]
        | null
    })

    if (!result) {
      const output = "No definition found"
      return output
    }

    const locations = Array.isArray(result) ? result : [result]
    if (locations.length === 0) {
      const output = "No definition found"
      return output
    }

    const output = locations.map(formatLocation).join("\n")
    return output
  } catch (e) {
    const output = `Error: ${e instanceof Error ? e.message : String(e)}`
    return output
  }
}
