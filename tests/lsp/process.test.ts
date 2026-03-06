import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { validateCwd } from "../../src/lsp/lsp-process"
import { useTempDirTracker } from "../test-utils"

const { track } = useTempDirTracker()

describe("validateCwd", () => {
  it("returns valid for an existing directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "oh-my-lsp-cwd-"))
    track(dir)

    expect(validateCwd(dir)).toEqual({ valid: true })
  })

  it("returns invalid for non-existent path", () => {
    const result = validateCwd(join(tmpdir(), "oh-my-lsp-non-existent-path"))
    expect(result.valid).toBe(false)
    expect(result.error).toContain("does not exist")
  })

  it("returns invalid when path is a file", () => {
    const dir = mkdtempSync(join(tmpdir(), "oh-my-lsp-cwd-file-"))
    track(dir)

    const filePath = join(dir, "a.txt")
    writeFileSync(filePath, "x", "utf-8")

    const result = validateCwd(filePath)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("not a directory")
  })
})
