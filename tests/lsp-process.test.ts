import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { validateCwd } from "../src/lsp/lsp-process"

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("validateCwd", () => {
  it("returns valid for an existing directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "oh-my-lsp-cwd-"))
    tempDirs.push(dir)

    expect(validateCwd(dir)).toEqual({ valid: true })
  })

  it("returns invalid for non-existent path", () => {
    const result = validateCwd(join(tmpdir(), "oh-my-lsp-non-existent-path"))
    expect(result.valid).toBe(false)
    expect(result.error).toContain("does not exist")
  })

  it("returns invalid when path is a file", () => {
    const dir = mkdtempSync(join(tmpdir(), "oh-my-lsp-cwd-file-"))
    tempDirs.push(dir)

    const filePath = join(dir, "a.txt")
    writeFileSync(filePath, "x", "utf-8")

    const result = validateCwd(filePath)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("not a directory")
  })
})
