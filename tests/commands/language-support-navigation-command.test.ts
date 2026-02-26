import { fileURLToPath } from "node:url"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockWithLspClient } = vi.hoisted(() => ({
  mockWithLspClient: vi.fn(),
}))

vi.mock("../../src/lsp/lsp-client-wrapper", () => ({
  withLspClient: mockWithLspClient,
  uriToPath: (uri: string) => fileURLToPath(uri),
}))

import { findReferences } from "../../src/commands/find-references-command"
import { gotoDefinition } from "../../src/commands/goto-definition-command"

const fullFeatureLanguages = [
  { name: "go", filePath: "/tmp/sample.go" },
  { name: "bash", filePath: "/tmp/sample.sh" },
  { name: "c", filePath: "/tmp/sample.c" },
  { name: "cpp", filePath: "/tmp/sample.cpp" },
  { name: "csharp", filePath: "/tmp/sample.cs" },
  { name: "css", filePath: "/tmp/sample.css" },
  { name: "kotlin", filePath: "/tmp/sample.kt" },
  { name: "lua", filePath: "/tmp/sample.lua" },
] as const

describe("language support (navigation)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  for (const { name, filePath } of fullFeatureLanguages) {
    it(`formats goto_definition output for ${name}`, async () => {
      const definition = vi.fn().mockResolvedValue({
        uri: `file://${filePath}`,
        range: {
          start: { line: 4, character: 2 },
          end: { line: 4, character: 5 },
        },
      })

      mockWithLspClient.mockImplementation(async (_file, fn) =>
        fn({ definition } as never)
      )

      const output = await gotoDefinition({
        filePath,
        line: 7,
        character: 1,
        basePath: "/tmp/project",
      })

      expect(mockWithLspClient).toHaveBeenCalledWith(
        filePath,
        expect.any(Function),
        { basePath: "/tmp/project" }
      )
      expect(definition).toHaveBeenCalledWith(filePath, 7, 1)
      expect(output).toBe(`${filePath}:5:2`)
    })

    it(`formats find_references output for ${name}`, async () => {
      const references = vi.fn().mockResolvedValue([
        {
          uri: `file://${filePath}`,
          range: {
            start: { line: 1, character: 0 },
            end: { line: 1, character: 3 },
          },
        },
        {
          uri: `file://${filePath}`,
          range: {
            start: { line: 4, character: 3 },
            end: { line: 4, character: 6 },
          },
        },
      ])

      mockWithLspClient.mockImplementation(async (_file, fn) =>
        fn({ references } as never)
      )

      const output = await findReferences({
        filePath,
        line: 2,
        character: 0,
      })

      expect(references).toHaveBeenCalledWith(filePath, 2, 0, true)
      expect(output).toContain(`${filePath}:2:0`)
      expect(output).toContain(`${filePath}:5:3`)
    })
  }
})
