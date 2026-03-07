import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { runCli } from "./cli-test-utils"
import { useTempDirTracker } from "../../test-utils"

const { track } = useTempDirTracker()

describe("CLI missing LSP server behavior", () => {
  it("shows install hint and keeps stderr empty when server is not installed", () => {
    const workspace = mkdtempSync(join(tmpdir(), "oh-my-lsp-not-installed-"))
    track(workspace)

    const opencodeConfigDir = join(workspace, "opencode-config")
    mkdirSync(opencodeConfigDir, { recursive: true })

    const missingCommand = "definitely-not-a-real-lsp-binary"

    writeFileSync(
      join(opencodeConfigDir, "oh-my-opencode.json"),
      JSON.stringify(
        {
          lsp: {
            fake: {
              command: [missingCommand, "--stdio"],
              extensions: [".foo"],
            },
          },
        },
        null,
        2
      ),
      "utf8"
    )

    const sampleFile = join(workspace, "sample.foo")
    writeFileSync(sampleFile, "hello", "utf8")

    const previousConfigDir = process.env.OPENCODE_CONFIG_DIR
    let result

    try {
      process.env.OPENCODE_CONFIG_DIR = opencodeConfigDir
      result = runCli(["diagnostics", sampleFile, "--base-path", workspace])
    } finally {
      if (previousConfigDir === undefined) {
        delete process.env.OPENCODE_CONFIG_DIR
      } else {
        process.env.OPENCODE_CONFIG_DIR = previousConfigDir
      }
    }

    expect(result.status).toBe(1)
    expect(result.error).toBeUndefined()
    expect(result.stdout).toContain("NOT INSTALLED")
    expect(result.stdout).toContain(`Command not found: ${missingCommand}`)
    expect(result.stdout).toContain(`Install '${missingCommand}' and ensure it's in your PATH`)
    expect(result.stderr).toBe("")
  })
})
