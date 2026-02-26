import { existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { getLanguageId } from "../../src/lsp/language-config"
import { BUILTIN_SERVERS } from "../../src/lsp/server-definitions"

const fixtureDir = join(process.cwd(), "tests", "fixtures")

const cases = [
  { folder: "elixir", sampleFile: "sample.ex", diagnosticsFailFile: "diagnostics_fail.ex", extension: ".ex", hasBuiltinServer: true, hasLanguageMapping: true },
  { folder: "haskell", sampleFile: "sample.hs", diagnosticsFailFile: "diagnostics_fail.hs", extension: ".hs", hasBuiltinServer: true, hasLanguageMapping: true },
  { folder: "html", sampleFile: "sample.html", diagnosticsFailFile: "diagnostics_fail.html", extension: ".html", hasBuiltinServer: true, hasLanguageMapping: true },
  { folder: "json", sampleFile: "sample.json", diagnosticsFailFile: "diagnostics_fail.json", extension: ".json", hasBuiltinServer: true, hasLanguageMapping: true },
  { folder: "kotlin", sampleFile: "sample.kt", diagnosticsFailFile: "diagnostics_fail.kt", extension: ".kt", hasBuiltinServer: true, hasLanguageMapping: true },
  { folder: "lua", sampleFile: "sample.lua", diagnosticsFailFile: "diagnostics_fail.lua", extension: ".lua", hasBuiltinServer: true, hasLanguageMapping: true },
  { folder: "nix", sampleFile: "sample.nix", diagnosticsFailFile: "diagnostics_fail.nix", extension: ".nix", hasBuiltinServer: true, hasLanguageMapping: true },
  { folder: "ruby", sampleFile: "sample.rb", diagnosticsFailFile: "diagnostics_fail.rb", extension: ".rb", hasBuiltinServer: true, hasLanguageMapping: true },
  { folder: "rust", sampleFile: "sample.rs", diagnosticsFailFile: "diagnostics_fail.rs", extension: ".rs", hasBuiltinServer: true, hasLanguageMapping: true },
  { folder: "scala", sampleFile: "sample.scala", diagnosticsFailFile: "diagnostics_fail.scala", extension: ".scala", hasBuiltinServer: false, hasLanguageMapping: true },
  { folder: "solidity", sampleFile: "sample.sol", diagnosticsFailFile: "diagnostics_fail.sol", extension: ".sol", hasBuiltinServer: false, hasLanguageMapping: false },
  { folder: "swift", sampleFile: "sample.swift", diagnosticsFailFile: "diagnostics_fail.swift", extension: ".swift", hasBuiltinServer: true, hasLanguageMapping: true },
  { folder: "tsx", sampleFile: "sample.tsx", diagnosticsFailFile: "diagnostics_fail.tsx", extension: ".tsx", hasBuiltinServer: true, hasLanguageMapping: true },
] as const

describe("remaining language fixtures", () => {
  it("contains sample and diagnostics files", () => {
    for (const item of cases) {
      expect(existsSync(join(fixtureDir, item.folder, item.sampleFile))).toBe(true)
      expect(existsSync(join(fixtureDir, item.folder, item.diagnosticsFailFile))).toBe(true)
    }
  })

  it("keeps extension language ids mapped", () => {
    for (const item of cases) {
      if (item.hasLanguageMapping) {
        expect(getLanguageId(item.extension)).not.toBe("plaintext")
      } else {
        expect(getLanguageId(item.extension)).toBe("plaintext")
      }
    }
  })

  it("matches builtin server expectations", () => {
    for (const item of cases) {
      const hasServer = Object.values(BUILTIN_SERVERS).some((server) =>
        server.extensions.includes(item.extension)
      )
      expect(hasServer).toBe(item.hasBuiltinServer)
    }
  })
})
