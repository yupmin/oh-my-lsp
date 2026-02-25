import { fileURLToPath } from "node:url"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockWithLspClient } = vi.hoisted(() => ({
  mockWithLspClient: vi.fn(),
}))

vi.mock("../../src/lsp/lsp-client-wrapper", () => ({
  withLspClient: mockWithLspClient,
  uriToPath: (uri: string) => fileURLToPath(uri),
}))

import { symbols } from "../../src/commands/symbols-command"

describe("symbols", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns error when workspace scope query is missing", async () => {
    const output = await symbols({
      filePath: "/tmp/a.ts",
      scope: "workspace",
    })

    expect(output).toBe("Error: 'query' is required for workspace scope")
    expect(mockWithLspClient).not.toHaveBeenCalled()
  })

  it("formats workspace symbols and applies limit", async () => {
    const openFile = vi.fn().mockResolvedValue(undefined)
    const workspaceSymbols = vi.fn().mockResolvedValue([
      {
        name: "alpha",
        kind: 12,
        location: {
          uri: "file:///tmp/a.ts",
          range: {
            start: { line: 1, character: 2 },
            end: { line: 1, character: 8 },
          },
        },
      },
      {
        name: "beta",
        kind: 12,
        location: {
          uri: "file:///tmp/b.ts",
          range: {
            start: { line: 2, character: 1 },
            end: { line: 2, character: 5 },
          },
        },
      },
    ])

    mockWithLspClient.mockImplementation(async (_filePath, fn) =>
      fn({ openFile, workspaceSymbols } as never)
    )

    const output = await symbols({
      filePath: "/tmp/a.ts",
      scope: "workspace",
      query: "a",
      limit: 1,
      basePath: "/tmp/project",
    })

    expect(mockWithLspClient).toHaveBeenCalledWith(
      "/tmp/a.ts",
      expect.any(Function),
      { basePath: "/tmp/project" }
    )
    expect(openFile).toHaveBeenCalledWith("/tmp/a.ts")
    expect(workspaceSymbols).toHaveBeenCalledWith("a")
    expect(output).toContain("Found 2 symbols (showing first 1):")
    expect(output).toContain("alpha (Function) - /tmp/a.ts:2:2")
  })

  it("opens file before requesting workspace symbols", async () => {
    const callOrder: string[] = []
    const openFile = vi.fn(async () => {
      callOrder.push("openFile")
    })
    const workspaceSymbols = vi.fn(async () => {
      callOrder.push("workspaceSymbols")
      return [
        {
          name: "alpha",
          kind: 12,
          location: {
            uri: "file:///tmp/a.ts",
            range: {
              start: { line: 1, character: 2 },
              end: { line: 1, character: 8 },
            },
          },
        },
      ]
    })

    mockWithLspClient.mockImplementation(async (_filePath, fn) =>
      fn({ openFile, workspaceSymbols } as never)
    )

    await symbols({
      filePath: "/tmp/a.ts",
      scope: "workspace",
      query: "a",
    })

    expect(openFile).toHaveBeenCalledWith("/tmp/a.ts")
    expect(workspaceSymbols).toHaveBeenCalledWith("a")
    expect(callOrder).toEqual(["openFile", "workspaceSymbols"])
  })

  it("formats document symbols", async () => {
    const documentSymbols = vi.fn().mockResolvedValue([
      {
        name: "MyClass",
        kind: 5,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 10, character: 0 },
        },
        selectionRange: {
          start: { line: 0, character: 6 },
          end: { line: 0, character: 13 },
        },
      },
    ])

    mockWithLspClient.mockImplementation(async (_filePath, fn) =>
      fn({ documentSymbols } as never)
    )

    const output = await symbols({
      filePath: "/tmp/a.ts",
      scope: "document",
    })

    expect(documentSymbols).toHaveBeenCalledWith("/tmp/a.ts")
    expect(output).toContain("MyClass (Class) - line 1")
  })

  it("returns formatted error when request fails", async () => {
    mockWithLspClient.mockRejectedValue(new Error("symbol failed"))

    const output = await symbols({
      filePath: "/tmp/a.ts",
    })

    expect(output).toBe("Error: symbol failed")
  })
})
