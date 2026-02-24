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

describe("prepareRename", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("forwards args and formats result", async () => {
    const prepareRenameClient = vi.fn().mockResolvedValue({ defaultBehavior: true })
    mockWithLspClient.mockImplementation(async (_filePath, fn) =>
      fn({ prepareRename: prepareRenameClient } as never)
    )
    mockFormatPrepareRenameResult.mockReturnValue("prepared")

    const output = await prepareRename({
      filePath: "/tmp/a.ts",
      line: 4,
      character: 2,
      basePath: "/tmp/project",
    })

    expect(mockWithLspClient).toHaveBeenCalledWith(
      "/tmp/a.ts",
      expect.any(Function),
      { basePath: "/tmp/project" }
    )
    expect(prepareRenameClient).toHaveBeenCalledWith("/tmp/a.ts", 4, 2)
    expect(mockFormatPrepareRenameResult).toHaveBeenCalledWith({ defaultBehavior: true })
    expect(output).toBe("prepared")
  })

  it("returns formatted error when request fails", async () => {
    mockWithLspClient.mockRejectedValue(new Error("prepare failed"))

    const output = await prepareRename({
      filePath: "/tmp/a.ts",
      line: 1,
      character: 0,
    })

    expect(output).toBe("Error: prepare failed")
  })
})

describe("rename", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("applies workspace edit and formats apply result", async () => {
    const workspaceEdit = { changes: {} }
    const renameClient = vi.fn().mockResolvedValue(workspaceEdit)

    mockWithLspClient.mockImplementation(async (_filePath, fn) =>
      fn({ rename: renameClient } as never)
    )

    mockApplyWorkspaceEdit.mockReturnValue({
      success: true,
      filesModified: ["/tmp/a.ts"],
      totalEdits: 1,
      errors: [],
    })

    mockFormatApplyResult.mockReturnValue("applied")

    const output = await rename({
      filePath: "/tmp/a.ts",
      line: 3,
      character: 5,
      newName: "renamed",
      basePath: "/tmp/project",
    })

    expect(mockWithLspClient).toHaveBeenCalledWith(
      "/tmp/a.ts",
      expect.any(Function),
      { basePath: "/tmp/project" }
    )
    expect(renameClient).toHaveBeenCalledWith("/tmp/a.ts", 3, 5, "renamed")
    expect(mockApplyWorkspaceEdit).toHaveBeenCalledWith(workspaceEdit)
    expect(mockFormatApplyResult).toHaveBeenCalledWith({
      success: true,
      filesModified: ["/tmp/a.ts"],
      totalEdits: 1,
      errors: [],
    })
    expect(output).toBe("applied")
  })

  it("returns formatted error when request fails", async () => {
    mockWithLspClient.mockRejectedValue(new Error("rename failed"))

    const output = await rename({
      filePath: "/tmp/a.ts",
      line: 1,
      character: 0,
      newName: "renamed",
    })

    expect(output).toBe("Error: rename failed")
  })
})
