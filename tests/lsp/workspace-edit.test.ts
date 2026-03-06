import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { describe, expect, it } from "vitest"

import { applyWorkspaceEdit } from "../../src/lsp/workspace-edit"
import type { WorkspaceEdit } from "../../src/lsp/types"
import { useTempDirTracker } from "../test-utils"

const { track } = useTempDirTracker()

describe("applyWorkspaceEdit", () => {
  it("applies text edits to a file", () => {
    const dir = mkdtempSync(join(tmpdir(), "oh-my-lsp-edit-"))
    track(dir)

    const filePath = join(dir, "sample.ts")
    writeFileSync(filePath, "const greet = 'hello'\n", "utf-8")

    const edit: WorkspaceEdit = {
      changes: {
        [pathToFileURL(filePath).href]: [
          {
            range: {
              start: { line: 0, character: 6 },
              end: { line: 0, character: 11 },
            },
            newText: "greeter",
          },
        ],
      },
    }

    const result = applyWorkspaceEdit(edit)

    expect(result.success).toBe(true)
    expect(result.totalEdits).toBe(1)
    expect(readFileSync(filePath, "utf-8")).toContain("const greeter")
  })
})
