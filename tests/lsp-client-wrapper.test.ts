import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { afterEach, describe, expect, it } from "vitest"

import { findWorkspaceRoot, formatServerLookupError, uriToPath } from "../src/lsp/lsp-client-wrapper"

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("findWorkspaceRoot", () => {
  it("finds nearest ancestor containing a workspace marker", () => {
    const root = mkdtempSync(join(tmpdir(), "oh-my-lsp-root-"))
    tempDirs.push(root)

    writeFileSync(join(root, "package.json"), "{}", "utf-8")
    const nested = join(root, "src", "nested")
    mkdirSync(nested, { recursive: true })
    const filePath = join(nested, "index.ts")
    writeFileSync(filePath, "export const x = 1\n", "utf-8")

    expect(findWorkspaceRoot(filePath)).toBe(root)
  })
})

describe("uriToPath", () => {
  it("converts file uri to absolute path", () => {
    const root = mkdtempSync(join(tmpdir(), "oh-my-lsp-uri-"))
    tempDirs.push(root)
    const filePath = join(root, "a.ts")
    const uri = pathToFileURL(filePath).href

    expect(uriToPath(uri)).toBe(filePath)
  })
})

describe("formatServerLookupError", () => {
  it("formats not_installed errors with install hint", () => {
    const output = formatServerLookupError({
      status: "not_installed",
      server: {
        id: "typescript",
        command: ["typescript-language-server", "--stdio"],
        extensions: [".ts", ".tsx"],
      },
      installHint: "npm install -g typescript-language-server typescript",
    })

    expect(output).toContain("NOT INSTALLED")
    expect(output).toContain("typescript-language-server")
    expect(output).toContain("npm install -g")
  })

  it("formats not_configured errors with extension", () => {
    const output = formatServerLookupError({
      status: "not_configured",
      extension: ".foo",
      availableServers: ["typescript", "pyright"],
    })

    expect(output).toContain("No LSP server configured for extension: .foo")
    expect(output).toContain("typescript, pyright")
  })
})
