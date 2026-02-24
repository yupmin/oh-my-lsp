import { formatApplyResult, formatPrepareRenameResult } from "./lsp-formatters"
import { withLspClient } from "./lsp-client-wrapper"
import { applyWorkspaceEdit } from "./workspace-edit"
import type { PrepareRenameDefaultBehavior, PrepareRenameResult, WorkspaceEdit } from "./types"

export interface PrepareRenameArgs {
  filePath: string
  line: number
  character: number
  basePath?: string
}

export interface RenameArgs {
  filePath: string
  line: number
  character: number
  newName: string
  basePath?: string
}

export async function prepareRename(args: PrepareRenameArgs): Promise<string> {
  try {
    const result = await withLspClient(
      args.filePath,
      async (client) => {
        return (await client.prepareRename(args.filePath, args.line, args.character)) as
          | PrepareRenameResult
          | PrepareRenameDefaultBehavior
          | null
      },
      { basePath: args.basePath }
    )
    const output = formatPrepareRenameResult(result)
    return output
  } catch (e) {
    const output = `Error: ${e instanceof Error ? e.message : String(e)}`
    return output
  }
}

export async function rename(args: RenameArgs): Promise<string> {
  try {
    const edit = await withLspClient(
      args.filePath,
      async (client) => {
        return (await client.rename(
          args.filePath,
          args.line,
          args.character,
          args.newName
        )) as WorkspaceEdit | null
      },
      { basePath: args.basePath }
    )
    const result = applyWorkspaceEdit(edit)
    const output = formatApplyResult(result)
    return output
  } catch (e) {
    const output = `Error: ${e instanceof Error ? e.message : String(e)}`
    return output
  }
}
