// Shared logging utility for the plugin

import * as fs from "fs"
import * as os from "os"
import * as path from "path"

const logFile = path.join(os.tmpdir(), "oh-my-opencode.log")

export function log(message: string, data?: unknown): void {
  try {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ""}\n`
    fs.appendFileSync(logFile, logEntry)
    if (process.env.OH_MY_LSP_VERBOSE === "1" || process.env.OH_MY_LSP_VERBOSE === "true") {
      process.stderr.write(logEntry)
    }
  } catch {
  }
}

export function getLogFilePath(): string {
  return logFile
}
