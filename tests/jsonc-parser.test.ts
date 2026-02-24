import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { afterEach, describe, expect, it } from "vitest"

import { detectConfigFile, parseJsonc } from "../src/shared/jsonc-parser"

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("parseJsonc", () => {
  it("parses comments and trailing commas", () => {
    const input = `{
      // comment
      "name": "oh-my-lsp",
      "enabled": true,
    }`

    const result = parseJsonc<{ name: string; enabled: boolean }>(input)
    expect(result).toEqual({ name: "oh-my-lsp", enabled: true })
  })
})

describe("detectConfigFile", () => {
  it("prefers .jsonc when both json and jsonc exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "oh-my-lsp-jsonc-"))
    tempDirs.push(dir)

    const base = join(dir, "oh-my-lsp")
    writeFileSync(`${base}.json`, "{}", "utf-8")
    writeFileSync(`${base}.jsonc`, "{}", "utf-8")

    const result = detectConfigFile(base)
    expect(result).toEqual({ format: "jsonc", path: `${base}.jsonc` })
  })
})
