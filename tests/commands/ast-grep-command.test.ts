import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockRunSg } = vi.hoisted(() => ({
  mockRunSg: vi.fn(),
}))

vi.mock("../../src/ast-grep/cli", () => ({
  runSg: mockRunSg,
}))

import { astGrepReplace, astGrepSearch } from "../../src/commands/ast-grep-command"

describe("astGrepSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("formats match list and forwards options", async () => {
    mockRunSg.mockResolvedValue({
      matches: [
        {
          text: "console.log(result)",
          file: "/tmp/sample.ts",
          lines: "console.log(result)",
          range: {
            start: { line: 5, column: 0 },
            end: { line: 5, column: 19 },
          },
          charCount: { leading: 0, trailing: 0 },
          language: "TypeScript",
        },
      ],
      totalMatches: 1,
      truncated: false,
    })

    const output = await astGrepSearch({
      pattern: "console.log($MSG)",
      lang: "typescript",
      paths: ["src"],
      globs: ["**/*.ts"],
      context: 2,
      timeoutMs: 1234,
    })

    expect(mockRunSg).toHaveBeenCalledWith({
      pattern: "console.log($MSG)",
      lang: "typescript",
      paths: ["src"],
      globs: ["**/*.ts"],
      context: 2,
      timeoutMs: 1234,
    })
    expect(output).toContain("Found 1 match(es):")
    expect(output).toContain("/tmp/sample.ts:6:1")
  })

  it("returns hint for empty python results with trailing colon pattern", async () => {
    mockRunSg.mockResolvedValue({
      matches: [],
      totalMatches: 0,
      truncated: false,
    })

    const output = await astGrepSearch({
      pattern: "def $FUNC($$$):",
      lang: "python",
    })

    expect(output).toContain("No matches found")
    expect(output).toContain("Hint: Remove trailing colon")
  })

  it("returns formatted error when execution fails", async () => {
    mockRunSg.mockRejectedValue(new Error("sg failed"))

    const output = await astGrepSearch({
      pattern: "console.log($MSG)",
      lang: "typescript",
    })

    expect(output).toBe("Error: sg failed")
  })

  it("returns function pattern hint for javascript/typescript", async () => {
    mockRunSg.mockResolvedValue({
      matches: [],
      totalMatches: 0,
      truncated: false,
    })

    const output = await astGrepSearch({
      pattern: "export async function $NAME",
      lang: "typescript",
    })

    expect(output).toContain("No matches found")
    expect(output).toContain("Function patterns need params and body")
  })
})

describe("astGrepReplace", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("formats dry-run replacement output", async () => {
    mockRunSg.mockResolvedValue({
      matches: [
        {
          text: "console.log(result)",
          file: "/tmp/sample.ts",
          lines: "console.log(result)",
          range: {
            start: { line: 5, column: 0 },
            end: { line: 5, column: 19 },
          },
          charCount: { leading: 0, trailing: 0 },
          language: "TypeScript",
        },
      ],
      totalMatches: 1,
      truncated: false,
    })

    const output = await astGrepReplace({
      pattern: "console.log($MSG)",
      rewrite: "logger.info($MSG)",
      lang: "typescript",
      dryRun: true,
    })

    expect(mockRunSg).toHaveBeenCalledWith({
      pattern: "console.log($MSG)",
      rewrite: "logger.info($MSG)",
      lang: "typescript",
      paths: ["."],
      globs: undefined,
      updateAll: false,
      timeoutMs: undefined,
    })
    expect(output).toContain("[DRY RUN] 1 replacement(s):")
    expect(output).toContain("Use --no-dry-run to apply changes")
  })

  it("formats apply mode replacement output", async () => {
    mockRunSg.mockResolvedValue({
      matches: [
        {
          text: "console.log(result)",
          file: "/tmp/sample.ts",
          lines: "console.log(result)",
          range: {
            start: { line: 5, column: 0 },
            end: { line: 5, column: 19 },
          },
          charCount: { leading: 0, trailing: 0 },
          language: "TypeScript",
        },
      ],
      totalMatches: 1,
      truncated: false,
    })

    const output = await astGrepReplace({
      pattern: "console.log($MSG)",
      rewrite: "logger.info($MSG)",
      lang: "typescript",
      dryRun: false,
    })

    expect(mockRunSg).toHaveBeenCalledWith({
      pattern: "console.log($MSG)",
      rewrite: "logger.info($MSG)",
      lang: "typescript",
      paths: ["."],
      globs: undefined,
      updateAll: true,
      timeoutMs: undefined,
    })
    expect(output).toContain("1 replacement(s):")
    expect(output).not.toContain("[DRY RUN]")
  })
})
