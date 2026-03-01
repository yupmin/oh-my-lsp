import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { afterEach, describe, expect, it } from "vitest"

import {
  findWorkspaceRoot,
  formatServerLookupError,
  formatServerExitHint,
  resolveLspRoot,
  uriToPath,
} from "../../src/lsp/lsp-client-wrapper"

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

describe("resolveLspRoot", () => {
  it("uses explicit base path when provided", () => {
    const root = mkdtempSync(join(tmpdir(), "oh-my-lsp-base-"))
    tempDirs.push(root)

    const filePath = join(root, "src", "index.ts")
    mkdirSync(join(root, "src"), { recursive: true })
    writeFileSync(filePath, "export const x = 1\n", "utf-8")

    expect(resolveLspRoot(filePath, root)).toBe(root)
  })

  it("throws when base path does not exist", () => {
    const root = mkdtempSync(join(tmpdir(), "oh-my-lsp-base-missing-"))
    tempDirs.push(root)
    const filePath = join(root, "index.ts")
    writeFileSync(filePath, "export const x = 1\n", "utf-8")

    expect(() => resolveLspRoot(filePath, join(root, "missing"))).toThrow("Base path does not exist:")
  })

  it("throws when base path is not a directory", () => {
    const root = mkdtempSync(join(tmpdir(), "oh-my-lsp-base-file-"))
    tempDirs.push(root)
    const filePath = join(root, "index.ts")
    const baseFilePath = join(root, "base.txt")
    writeFileSync(filePath, "export const x = 1\n", "utf-8")
    writeFileSync(baseFilePath, "not dir\n", "utf-8")

    expect(() => resolveLspRoot(filePath, baseFilePath)).toThrow("Base path is not a directory:")
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

describe("formatServerExitHint", () => {
  it("includes server id, command, install hint, and original message", () => {
    const output = formatServerExitHint(
      "jdtls",
      ["jdtls"],
      "LSP server exited immediately with code 1"
    )

    expect(output).toContain("jdtls")
    expect(output).toContain("exited immediately")
    expect(output).toContain("Command: jdtls")
    expect(output).toContain("To reinstall or verify:")
    expect(output).toContain("https://github.com/eclipse-jdtls/eclipse.jdt.ls")
    expect(output).toContain("LSP server exited immediately with code 1")
  })

  it("falls back to generic hint for unknown server id", () => {
    const output = formatServerExitHint(
      "custom-server",
      ["custom-lsp", "--stdio"],
      "LSP server exited immediately with code 1"
    )

    expect(output).toContain("custom-server")
    expect(output).toContain("Command: custom-lsp --stdio")
    expect(output).toContain("Install 'custom-lsp' and ensure it's in your PATH")
  })
})
