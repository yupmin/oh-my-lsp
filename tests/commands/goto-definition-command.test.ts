import { fileURLToPath } from "node:url"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockWithLspClient } = vi.hoisted(() => ({
  mockWithLspClient: vi.fn(),
}))

vi.mock("../../src/lsp/lsp-client-wrapper", () => ({
  withLspClient: mockWithLspClient,
  uriToPath: (uri: string) => fileURLToPath(uri),
}))

import { gotoDefinition } from "../../src/commands/goto-definition-command"

describe("gotoDefinition", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns no definition found when result is null", async () => {
    mockWithLspClient.mockResolvedValue(null)

    const output = await gotoDefinition({
      filePath: "/tmp/a.ts",
      line: 1,
      character: 0,
      basePath: "/tmp/project",
    })

    expect(output).toBe("No definition found")
    expect(mockWithLspClient).toHaveBeenCalledWith(
      "/tmp/a.ts",
      expect.any(Function),
      { basePath: "/tmp/project" }
    )
  })

  it("formats single definition location and forwards request args", async () => {
    const definition = vi.fn().mockResolvedValue({
      uri: "file:///tmp/defs.ts",
      range: {
        start: { line: 4, character: 2 },
        end: { line: 4, character: 9 },
      },
    })

    mockWithLspClient.mockImplementation(async (_filePath, fn) =>
      fn({ definition } as never)
    )

    const output = await gotoDefinition({
      filePath: "/tmp/a.ts",
      line: 5,
      character: 8,
    })

    expect(definition).toHaveBeenCalledWith("/tmp/a.ts", 5, 8)
    expect(output).toBe("/tmp/defs.ts:5:2")
  })

  it("returns formatted error when client throws", async () => {
    mockWithLspClient.mockRejectedValue(new Error("boom"))

    const output = await gotoDefinition({
      filePath: "/tmp/a.ts",
      line: 1,
      character: 0,
    })

    expect(output).toBe("Error: boom")
  })
})
