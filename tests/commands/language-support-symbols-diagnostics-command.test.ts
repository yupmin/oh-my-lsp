import { fileURLToPath } from "node:url"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockWithLspClient } = vi.hoisted(() => ({
  mockWithLspClient: vi.fn(),
}))

vi.mock("../../src/lsp/lsp-client-wrapper", () => ({
  withLspClient: mockWithLspClient,
  uriToPath: (uri: string) => fileURLToPath(uri),
}))

import { diagnostics } from "../../src/commands/diagnostics-command"
import { symbols } from "../../src/commands/symbols-command"

const symbolDiagnosticLanguages = [
  { name: "go", filePath: "/tmp/sample.go" },
  { name: "bash", filePath: "/tmp/sample.sh" },
  { name: "c", filePath: "/tmp/sample.c" },
  { name: "cpp", filePath: "/tmp/sample.cpp" },
  { name: "csharp", filePath: "/tmp/sample.cs" },
  { name: "css", filePath: "/tmp/sample.css" },
  { name: "yaml", filePath: "/tmp/sample.yaml" },
  { name: "dockerfile", filePath: "/tmp/sample.dockerfile" },
] as const

describe("language support (symbols/diagnostics)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  for (const { name, filePath } of symbolDiagnosticLanguages) {
    it(`supports symbols for ${name}`, async () => {
      const documentSymbols = vi.fn().mockResolvedValue([
        {
          name: "add",
          kind: 12,
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 3 },
          },
          selectionRange: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 3 },
          },
        },
      ])

      mockWithLspClient.mockImplementation(async (_file, fn) =>
        fn({ documentSymbols } as never)
      )

      const output = await symbols({
        filePath,
        scope: "document",
      })

      expect(documentSymbols).toHaveBeenCalledWith(filePath)
      expect(output).toContain("add (Function) - line 1")
    })

    it(`supports diagnostics for ${name}`, async () => {
      mockWithLspClient.mockResolvedValue([
        {
          range: {
            start: { line: 2, character: 4 },
            end: { line: 2, character: 7 },
          },
          severity: 1,
          source: "unit",
          message: `diagnostic-${name}`,
        },
      ])

      const output = await diagnostics({
        filePath,
      })

      expect(mockWithLspClient).toHaveBeenCalledWith(
        filePath,
        expect.any(Function),
        { basePath: undefined }
      )
      expect(output).toContain("error[unit] at 3:4")
      expect(output).toContain(`diagnostic-${name}`)
    })
  }
})
