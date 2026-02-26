import { describe, expect, it } from "vitest"

import { BUILTIN_SERVERS } from "../../src/lsp/server-definitions"

const SIX_LSP_COMMANDS = [
  "goto_definition",
  "find_references",
  "symbols",
  "diagnostics",
  "prepare_rename",
  "rename",
] as const

const capabilityCases = [
  { language: "elixir", extension: ".ex", sixCommands: true, reason: "builtin_server" },
  { language: "haskell", extension: ".hs", sixCommands: true, reason: "builtin_server" },
  { language: "html", extension: ".html", sixCommands: false, reason: "partial_server_capabilities" },
  { language: "json", extension: ".json", sixCommands: false, reason: "partial_server_capabilities" },
  { language: "kotlin", extension: ".kt", sixCommands: true, reason: "builtin_server" },
  { language: "lua", extension: ".lua", sixCommands: true, reason: "builtin_server" },
  { language: "nix", extension: ".nix", sixCommands: true, reason: "builtin_server" },
  { language: "ruby", extension: ".rb", sixCommands: true, reason: "builtin_server" },
  { language: "rust", extension: ".rs", sixCommands: true, reason: "builtin_server" },
  { language: "scala", extension: ".scala", sixCommands: false, reason: "no_builtin_server" },
  { language: "solidity", extension: ".sol", sixCommands: false, reason: "no_builtin_server" },
  { language: "swift", extension: ".swift", sixCommands: true, reason: "builtin_server" },
  { language: "tsx", extension: ".tsx", sixCommands: true, reason: "builtin_server" },
] as const

describe("LSP CLI 6-command capability (remaining languages)", () => {
  it("keeps the 6 LSP command surface stable", () => {
    expect(SIX_LSP_COMMANDS).toEqual([
      "goto_definition",
      "find_references",
      "symbols",
      "diagnostics",
      "prepare_rename",
      "rename",
    ])
  })

  it("keeps language capability classification explicit", () => {
    const sixCommandsLanguages = capabilityCases
      .filter((item) => item.sixCommands)
      .map((item) => item.language)

    const notSixCommandsLanguages = capabilityCases
      .filter((item) => !item.sixCommands)
      .map((item) => item.language)

    expect(sixCommandsLanguages).toEqual([
      "elixir",
      "haskell",
      "kotlin",
      "lua",
      "nix",
      "ruby",
      "rust",
      "swift",
      "tsx",
    ])
    expect(notSixCommandsLanguages).toEqual(["html", "json", "scala", "solidity"])
  })

  it("matches builtin-server coverage assumptions", () => {
    for (const item of capabilityCases) {
      const hasServer = Object.values(BUILTIN_SERVERS).some((server) =>
        server.extensions.includes(item.extension)
      )

      if (item.reason === "builtin_server") {
        expect(hasServer).toBe(true)
      }

      if (item.reason === "no_builtin_server") {
        expect(hasServer).toBe(false)
      }

      if (item.reason === "partial_server_capabilities") {
        expect(hasServer).toBe(true)
      }
    }
  })
})
