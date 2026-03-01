import { extname, resolve } from "path"
import { fileURLToPath } from "node:url"
import { existsSync } from "fs"

import { LSPClient, lspManager } from "./client"
import { findServerForExtension } from "./config"
import { LSP_INSTALL_HINTS } from "./constants"
import type { ServerLookupResult } from "./types"

export interface WithLspClientOptions {
  basePath?: string
}

export function findWorkspaceRoot(filePath: string): string {
  let dir = resolve(filePath)

  if (!existsSync(dir) || !require("fs").statSync(dir).isDirectory()) {
    dir = require("path").dirname(dir)
  }

  const markers = [".git", "package.json", "pyproject.toml", "Cargo.toml", "go.mod", "pom.xml", "build.gradle"]

  let prevDir = ""
  while (dir !== prevDir) {
    for (const marker of markers) {
      if (existsSync(require("path").join(dir, marker))) {
        return dir
      }
    }
    prevDir = dir
    dir = require("path").dirname(dir)
  }

  return require("path").dirname(resolve(filePath))
}

export function resolveLspRoot(filePath: string, basePath?: string): string {
  if (!basePath) {
    return findWorkspaceRoot(filePath)
  }

  const resolvedBasePath = resolve(basePath)

  if (!existsSync(resolvedBasePath)) {
    throw new Error(`Base path does not exist: ${resolvedBasePath}`)
  }

  try {
    if (!require("fs").statSync(resolvedBasePath).isDirectory()) {
      throw new Error(`Base path is not a directory: ${resolvedBasePath}`)
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Base path is not a directory:")) {
      throw error
    }
    throw new Error(
      `Cannot access base path: ${resolvedBasePath} (${error instanceof Error ? error.message : String(error)})`
    )
  }

  return resolvedBasePath
}

export function uriToPath(uri: string): string {
  return fileURLToPath(uri)
}

export function formatServerLookupError(result: Exclude<ServerLookupResult, { status: "found" }>): string {
  if (result.status === "not_installed") {
    const { server, installHint } = result
    return [
      `LSP server '${server.id}' is configured but NOT INSTALLED.`,
      ``,
      `Command not found: ${server.command[0]}`,
      ``,
      `To install:`,
      `  ${installHint}`,
      ``,
      `Supported extensions: ${server.extensions.join(", ")}`,
      ``,
      `After installation, the server will be available automatically.`,
      `Run 'LspServers' tool to verify installation status.`,
    ].join("\n")
  }

  return [
    `No LSP server configured for extension: ${result.extension}`,
    ``,
    `Available servers: ${result.availableServers.slice(0, 10).join(", ")}${result.availableServers.length > 10 ? "..." : ""}`,
    ``,
    `To add a custom server, configure 'lsp' in oh-my-opencode.json:`,
    `  {`,
    `    "lsp": {`,
    `      "my-server": {`,
    `        "command": ["my-lsp", "--stdio"],`,
    `        "extensions": ["${result.extension}"]`,
    `      }`,
    `    }`,
    `  }`,
  ].join("\n")
}

export function formatServerExitHint(serverId: string, command: string[], originalMessage: string): string {
  const installHint = LSP_INSTALL_HINTS[serverId] || `Install '${command[0]}' and ensure it's in your PATH`
  return [
    `LSP server '${serverId}' exited immediately.`,
    ``,
    `Command: ${command.join(" ")}`,
    ``,
    `Possible causes:`,
    `  - The server binary is installed but misconfigured or incompatible`,
    `  - Required runtime dependencies are missing`,
    `  - The server needs a specific project setup (e.g., build files, SDK)`,
    ``,
    `To reinstall or verify:`,
    `  ${installHint}`,
    ``,
    originalMessage,
  ].join("\n")
}

export async function withLspClient<T>(
  filePath: string,
  fn: (client: LSPClient) => Promise<T>,
  options: WithLspClientOptions = {}
): Promise<T> {
  const absPath = resolve(filePath)
  const ext = extname(absPath)
  const result = findServerForExtension(ext)

  if (result.status !== "found") {
    throw new Error(formatServerLookupError(result))
  }

  const server = result.server
  const root = resolveLspRoot(absPath, options.basePath)

  let client: LSPClient
  try {
    client = await lspManager.getClient(root, server)
  } catch (e) {
    if (e instanceof Error && e.message.includes("exited immediately")) {
      throw new Error(formatServerExitHint(server.id, server.command, e.message))
    }
    throw e
  }

  try {
    return await fn(client)
  } catch (e) {
    if (e instanceof Error && e.message.includes("exited immediately")) {
      throw new Error(formatServerExitHint(server.id, server.command, e.message))
    }
    if (e instanceof Error && e.message.includes("timeout")) {
      const isInitializing = lspManager.isServerInitializing(root, server.id)
      if (isInitializing) {
        throw new Error(
          `LSP server is still initializing. Please retry in a few seconds. ` +
            `Original error: ${e.message}`
        )
      }
    }
    throw e
  } finally {
    lspManager.releaseClient(root, server.id)
  }
}
