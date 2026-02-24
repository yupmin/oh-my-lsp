import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { mockWithLspClient } = vi.hoisted(() => ({
  mockWithLspClient: vi.fn(),
}))

vi.mock("../../src/lsp/lsp-client-wrapper", () => ({
  withLspClient: mockWithLspClient,
  uriToPath: (uri: string) => fileURLToPath(uri),
}))

import { findReferences } from "../../src/commands/find-references-command"

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("findReferences", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns no references found when result is empty", async () => {
    mockWithLspClient.mockResolvedValue([])

    const output = await findReferences({
      filePath: "/tmp/a.ts",
      line: 1,
      character: 0,
    })

    expect(output).toBe("No references found")
  })

  it("uses includeDeclaration=true by default and formats output", async () => {
    const references = vi.fn().mockResolvedValue([
      {
        uri: "file:///tmp/a.ts",
        range: {
          start: { line: 2, character: 4 },
          end: { line: 2, character: 8 },
        },
      },
    ])

    mockWithLspClient.mockImplementation(async (_filePath, fn) =>
      fn({ references } as never)
    )

    const output = await findReferences({
      filePath: "/tmp/a.ts",
      line: 3,
      character: 7,
      basePath: "/tmp/project",
    })

    expect(mockWithLspClient).toHaveBeenCalledWith(
      "/tmp/a.ts",
      expect.any(Function),
      { basePath: "/tmp/project" }
    )
    expect(references).toHaveBeenCalledWith("/tmp/a.ts", 3, 7, true)
    expect(output).toBe("/tmp/a.ts:3:4")
  })

  it("truncates long reference list with header", async () => {
    const large = Array.from({ length: 201 }, (_, index) => ({
      uri: "file:///tmp/a.ts",
      range: {
        start: { line: index, character: 0 },
        end: { line: index, character: 1 },
      },
    }))

    mockWithLspClient.mockResolvedValue(large)

    const output = await findReferences({
      filePath: "/tmp/a.ts",
      line: 1,
      character: 0,
      includeDeclaration: false,
    })

    const lines = output.split("\n")
    expect(lines[0]).toBe("Found 201 references (showing first 200):")
    expect(lines).toHaveLength(201)
  })

  it("returns formatted error when request fails", async () => {
    mockWithLspClient.mockRejectedValue(new Error("failed"))

    const output = await findReferences({
      filePath: "/tmp/a.ts",
      line: 1,
      character: 0,
    })

    expect(output).toBe("Error: failed")
  })

  it("retries with inferred symbol when default cursor has no references", async () => {
    const dir = mkdtempSync(join(tmpdir(), "oh-my-lsp-refs-"))
    tempDirs.push(dir)
    const filePath = join(dir, "sample.php")
    writeFileSync(
      filePath,
      "<?php\n\nfunction add(int $a, int $b): int { return $a + $b; }\n\necho add(1, 2);\n",
      "utf-8"
    )

    const references = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          uri: `file://${filePath}`,
          range: {
            start: { line: 2, character: 9 },
            end: { line: 2, character: 12 },
          },
        },
      ])

    const documentSymbols = vi.fn().mockResolvedValue([])

    mockWithLspClient.mockImplementation(async (_filePath, fn) =>
      fn({ references, documentSymbols } as never)
    )

    const output = await findReferences({
      filePath,
      line: 1,
      character: 0,
    })

    expect(references).toHaveBeenCalledTimes(2)
    expect(references).toHaveBeenNthCalledWith(1, filePath, 1, 0, true)
    expect(references).toHaveBeenNthCalledWith(2, filePath, 3, 9, true)
    expect(output).toContain(`${filePath}:3:9`)
  })

  it("falls back to text-based references when LSP references remain empty", async () => {
    const dir = mkdtempSync(join(tmpdir(), "oh-my-lsp-refs-text-"))
    tempDirs.push(dir)
    const filePath = join(dir, "sample.php")
    writeFileSync(
      filePath,
      "<?php\n\nfunction add(int $a, int $b): int { return $a + $b; }\n\necho add(1, 2);\n",
      "utf-8"
    )

    const references = vi.fn().mockResolvedValue([])
    const documentSymbols = vi.fn().mockResolvedValue([])

    mockWithLspClient.mockImplementation(async (_filePath, fn) =>
      fn({ references, documentSymbols } as never)
    )

    const output = await findReferences({
      filePath,
      line: 1,
      character: 0,
      basePath: dir,
    })

    expect(references).toHaveBeenCalledTimes(2)
    expect(output).toContain(`${filePath}:3:9`)
    expect(output).toContain(`${filePath}:5:5`)
  })
})
