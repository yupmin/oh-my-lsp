import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  mockWithLspClient,
  mockApplyWorkspaceEdit,
  mockFormatApplyResult,
  mockFormatPrepareRenameResult,
} = vi.hoisted(() => ({
  mockWithLspClient: vi.fn(),
  mockApplyWorkspaceEdit: vi.fn(),
  mockFormatApplyResult: vi.fn(),
  mockFormatPrepareRenameResult: vi.fn(),
}))

vi.mock("../../src/lsp/lsp-client-wrapper", () => ({
  withLspClient: mockWithLspClient,
}))

vi.mock("../../src/lsp/workspace-edit", () => ({
  applyWorkspaceEdit: mockApplyWorkspaceEdit,
}))

vi.mock("../../src/lsp/lsp-formatters", () => ({
  formatApplyResult: mockFormatApplyResult,
  formatPrepareRenameResult: mockFormatPrepareRenameResult,
}))

import { prepareRename, rename } from "../../src/commands/rename-command"

const fullFeatureLanguages = [
  { name: "go", filePath: "/tmp/sample.go" },
  { name: "bash", filePath: "/tmp/sample.sh" },
  { name: "c", filePath: "/tmp/sample.c" },
  { name: "cpp", filePath: "/tmp/sample.cpp" },
  { name: "csharp", filePath: "/tmp/sample.cs" },
  { name: "css", filePath: "/tmp/sample.css" },
] as const

describe("language support (rename)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  for (const { name, filePath } of fullFeatureLanguages) {
    it(`supports prepare_rename for ${name}`, async () => {
      const prepareRenameClient = vi.fn().mockResolvedValue({ defaultBehavior: true })
      mockWithLspClient.mockImplementation(async (_file, fn) =>
        fn({ prepareRename: prepareRenameClient } as never)
      )
      mockFormatPrepareRenameResult.mockReturnValue("prepared")

      const output = await prepareRename({
        filePath,
        line: 1,
        character: 0,
      })

      expect(prepareRenameClient).toHaveBeenCalledWith(filePath, 1, 0)
      expect(output).toBe("prepared")
    })

    it(`supports rename for ${name}`, async () => {
      const workspaceEdit = { changes: {} }
      const renameClient = vi.fn().mockResolvedValue(workspaceEdit)

      mockWithLspClient.mockImplementation(async (_file, fn) =>
        fn({ rename: renameClient } as never)
      )

      mockApplyWorkspaceEdit.mockReturnValue({
        success: true,
        filesModified: [filePath],
        totalEdits: 1,
        errors: [],
      })
      mockFormatApplyResult.mockReturnValue("applied")

      const output = await rename({
        filePath,
        line: 2,
        character: 1,
        newName: "renamed",
      })

      expect(renameClient).toHaveBeenCalledWith(filePath, 2, 1, "renamed")
      expect(mockApplyWorkspaceEdit).toHaveBeenCalledWith(workspaceEdit)
      expect(output).toBe("applied")
    })
  }
})
