import { spawn } from "node:child_process"
import { createSgResultFromStdout } from "./sg-compact-json-output"
import { DEFAULT_TIMEOUT_MS, getSgCliPath } from "./constants"
import type { RunSgOptions, SgResult } from "./types"

interface ProcessOutput {
  stdout: string
  stderr: string
  exitCode: number
}

function collectProcessOutput(
  command: string,
  args: string[],
  timeoutMs: number,
  cwd: string
): Promise<ProcessOutput> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: process.platform === "win32",
    })

    let stdout = ""
    let stderr = ""
    let timedOut = false

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8")
    })
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8")
    })

    const timeoutId = setTimeout(() => {
      timedOut = true
      proc.kill("SIGKILL")
    }, timeoutMs)

    proc.on("error", (error) => {
      clearTimeout(timeoutId)
      reject(error)
    })

    proc.on("close", (code) => {
      clearTimeout(timeoutId)
      if (timedOut) {
        reject(new Error(`ast-grep request timeout (${timeoutMs}ms)`))
        return
      }
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
      })
    })
  })
}

export async function runSg(options: RunSgOptions): Promise<SgResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const cwd = options.cwd ?? process.cwd()
  const command = getSgCliPath() ?? "sg"
  const paths = options.paths && options.paths.length > 0 ? options.paths : ["."]
  const shouldSeparateWritePass = !!(options.rewrite && options.updateAll)

  const args = ["run", "-p", options.pattern, "--lang", options.lang, "--json=compact"]

  if (options.rewrite) {
    args.push("-r", options.rewrite)
    if (options.updateAll && !shouldSeparateWritePass) {
      args.push("--update-all")
    }
  }

  if (options.context && options.context > 0) {
    args.push("-C", String(options.context))
  }

  if (options.globs) {
    for (const glob of options.globs) {
      args.push("--globs", glob)
    }
  }

  args.push(...paths)

  let output: ProcessOutput
  try {
    output = await collectProcessOutput(command, args, timeoutMs, cwd)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const missingBinary = message.includes("ENOENT") || message.includes("not found")
    if (missingBinary) {
      return {
        matches: [],
        totalMatches: 0,
        truncated: false,
        error:
          "ast-grep (sg) binary not found.\n\nInstall options:\n  npm install -D @ast-grep/cli\n  cargo install ast-grep --locked\n  brew install ast-grep",
      }
    }
    if (message.includes("timeout")) {
      return {
        matches: [],
        totalMatches: 0,
        truncated: true,
        truncatedReason: "timeout",
        error: message,
      }
    }
    return {
      matches: [],
      totalMatches: 0,
      truncated: false,
      error: `Failed to run ast-grep: ${message}`,
    }
  }

  if (output.exitCode !== 0 && output.stdout.trim() === "") {
    if (output.stderr.includes("No files found")) {
      return { matches: [], totalMatches: 0, truncated: false }
    }
    if (output.stderr.trim()) {
      return {
        matches: [],
        totalMatches: 0,
        truncated: false,
        error: output.stderr.trim(),
      }
    }
    return { matches: [], totalMatches: 0, truncated: false }
  }

  const jsonResult = createSgResultFromStdout(output.stdout)

  if (shouldSeparateWritePass && jsonResult.matches.length > 0) {
    const writeArgs = args.filter((arg) => arg !== "--json=compact")
    writeArgs.push("--update-all")

    const writeResult = await collectProcessOutput(command, writeArgs, timeoutMs, cwd).catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      return {
        stdout: "",
        stderr: message,
        exitCode: 1,
      }
    })

    if (writeResult.exitCode !== 0) {
      const detail = writeResult.stderr.trim() || `ast-grep exited with code ${writeResult.exitCode}`
      return { ...jsonResult, error: `Replace failed: ${detail}` }
    }
  }

  return jsonResult
}
