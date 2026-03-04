import { createHash } from "node:crypto"
import { mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Diagnostic, ResolvedServer } from "./types"
import { spawnProcess, type UnifiedProcess } from "./lsp-process"
import { log } from "../shared/logger"
import { detectLombokJar } from "./lombok-detector"

const DEFAULT_REQUEST_TIMEOUT_MS = 15000
const JAVA_REQUEST_TIMEOUT_MS = 60000

function resolveRequestTimeoutMs(serverId: string): number {
  const raw = process.env.OH_MY_LSP_TIMEOUT_MS
  if (!raw) {
    if (serverId === "jdtls") {
      return JAVA_REQUEST_TIMEOUT_MS
    }
    return DEFAULT_REQUEST_TIMEOUT_MS
  }

  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) {
    if (serverId === "jdtls") {
      return JAVA_REQUEST_TIMEOUT_MS
    }
    return DEFAULT_REQUEST_TIMEOUT_MS
  }

  return parsed
}

type JsonRpcRequest = {
  jsonrpc: "2.0"
  id?: number | string
  method: string
  params?: unknown
}

type JsonRpcResponse = {
  jsonrpc: "2.0"
  id: number | string
  result?: unknown
  error?: { code: number; message: string }
}

export class LSPClientTransport {
  protected proc: UnifiedProcess | null = null
  protected readonly stderrBuffer: string[] = []
  protected processExited = false
  protected readonly diagnosticsStore = new Map<string, Diagnostic[]>()
  protected readonly REQUEST_TIMEOUT: number
  protected readonly pendingRequests = new Map<
    number,
    {
      resolve: (value: unknown) => void
      reject: (reason?: unknown) => void
    }
  >()
  protected nextRequestId = 1

  constructor(
    protected root: string,
    protected server: ResolvedServer
  ) {
    this.REQUEST_TIMEOUT = resolveRequestTimeoutMs(server.id)
  }

  protected resolveJdtlsCommand(command: string[]): string[] {
    if (this.server.id !== "jdtls") {
      return command
    }

    const hasData = command.includes("-data")
    const hasConfiguration = command.includes("-configuration")

    const workspaceHash = createHash("sha1").update(this.root).digest("hex")
    const customBaseDir = process.env.OH_MY_LSP_JDTLS_BASE?.trim()
    const candidateBaseDirs = customBaseDir
      ? [customBaseDir, join(tmpdir(), "oh-my-lsp-jdtls")]
      : [join(tmpdir(), "oh-my-lsp-jdtls")]

    let dataDir = ""
    let configurationDir = ""
    let mkdirError: unknown

    for (const candidate of candidateBaseDirs) {
      const candidateDataDir = join(candidate, "workspaces", workspaceHash)
      const candidateConfigurationDir = join(candidate, "configuration")
      try {
        mkdirSync(candidateDataDir, { recursive: true })
        mkdirSync(candidateConfigurationDir, { recursive: true })
        dataDir = candidateDataDir
        configurationDir = candidateConfigurationDir
        break
      } catch (error) {
        mkdirError = error
        continue
      }
    }

    if (!dataDir || !configurationDir) {
      throw new Error(
        `Failed to prepare jdtls directories: ${mkdirError instanceof Error ? mkdirError.message : String(mkdirError)}`
      )
    }

    const resolved = [...command]
    if (!hasConfiguration) {
      resolved.push("-configuration", configurationDir)
    }
    if (!hasData) {
      resolved.push("-data", dataDir)
    }

    // Apply JVM args from config (e.g. -javaagent:/path/to/lombok.jar)
    const jvmArgs = this.server.jvmArgs ?? []
    for (const arg of jvmArgs) {
      resolved.push(`--jvm-arg=${arg}`)
    }

    // Auto-detect lombok unless already provided via config or command
    const hasLombokAgent =
      jvmArgs.some((a) => a.includes("lombok")) ||
      resolved.some((a) => a.includes("lombok"))
    if (!hasLombokAgent) {
      const lombokJar = detectLombokJar(this.root)
      if (lombokJar) {
        resolved.push(`--jvm-arg=-javaagent:${lombokJar}`)
        log("[LSP] Auto-detected lombok agent", { lombokJar })
      }
    }

    log("[LSP] Using explicit jdtls paths", {
      configurationDir,
      dataDir,
    })

    return resolved
  }

  async start(): Promise<void> {
    const command = this.resolveJdtlsCommand(this.server.command)

    this.proc = spawnProcess(command, {
      cwd: this.root,
      env: {
        ...process.env,
        ...this.server.env,
      },
    })

    if (!this.proc) {
      throw new Error(`Failed to spawn LSP server: ${command.join(" ")}`)
    }

    this.startStderrReading()
    this.startStdoutReading()

    this.proc.exited
      .then((code) => {
        this.processExited = true
        const error = new Error(`LSP server exited (code: ${code})`)
        for (const [, pending] of this.pendingRequests) {
          pending.reject(error)
        }
        this.pendingRequests.clear()
      })
      .catch(() => {
        this.processExited = true
      })

    await new Promise((resolve) => setTimeout(resolve, 100))

    if (this.proc.exitCode !== null) {
      const stderr = this.stderrBuffer.join("\n")
      throw new Error(
        `LSP server exited immediately with code ${this.proc.exitCode}` +
          (stderr ? `\nstderr: ${stderr}` : "")
      )
    }
  }

  protected startStdoutReading(): void {
    if (!this.proc) return

    const reader = this.proc.stdout.getReader()

    const read = async () => {
      let buffer = Buffer.alloc(0)

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done || !value) break

          buffer = Buffer.concat([buffer, Buffer.from(value)])

          while (true) {
            const headerEnd = buffer.indexOf("\r\n\r\n")
            if (headerEnd < 0) break

            const header = buffer.subarray(0, headerEnd).toString("utf8")
            const lengthMatch = header.match(/Content-Length:\s*(\d+)/i)
            if (!lengthMatch) {
              buffer = buffer.subarray(headerEnd + 4)
              continue
            }

            const contentLength = Number(lengthMatch[1])
            const bodyStart = headerEnd + 4
            const bodyEnd = bodyStart + contentLength

            if (buffer.length < bodyEnd) {
              break
            }

            const body = buffer.subarray(bodyStart, bodyEnd).toString("utf8")
            buffer = buffer.subarray(bodyEnd)

            this.handleMessage(body)
          }
        }
      } catch {
      }
    }

    void read()
  }

  protected handleMessage(rawMessage: string): void {
    let message: JsonRpcRequest | JsonRpcResponse

    try {
      message = JSON.parse(rawMessage) as JsonRpcRequest | JsonRpcResponse
    } catch {
      return
    }

    if ("id" in message && typeof message.id === "number" && ("result" in message || "error" in message)) {
      const pending = this.pendingRequests.get(message.id)
      if (!pending) return
      this.pendingRequests.delete(message.id)

      if (message.error) {
        pending.reject(new Error(`LSP error ${message.error.code}: ${message.error.message}`))
      } else {
        pending.resolve(message.result)
      }
      return
    }

    if (!("method" in message)) return

    if (typeof message.id === "number" || typeof message.id === "string") {
      void this.handleServerRequest(message.id, message.method, message.params)
      return
    }

    this.handleServerNotification(message.method, message.params)
  }

  protected async handleServerRequest(id: number | string, method: string, params?: unknown): Promise<void> {
    try {
      let result: unknown = null

      if (method === "workspace/configuration") {
        const items = (params as { items?: Array<{ section?: string }> } | undefined)?.items ?? []
        result = items.map((item) => {
          if (item.section === "json") return { validate: { enable: true } }
          return {}
        })
      }

      this.sendRawMessage({ jsonrpc: "2.0", id, result })
    } catch (error) {
      this.sendRawMessage({
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
      })
    }
  }

  protected handleServerNotification(method: string, params?: unknown): void {
    if (method === "textDocument/publishDiagnostics") {
      const typed = params as { uri?: string; diagnostics?: Diagnostic[] } | undefined
      if (typed?.uri) {
        this.diagnosticsStore.set(typed.uri, typed.diagnostics ?? [])
      }
    }
  }

  protected sendRawMessage(message: JsonRpcRequest | JsonRpcResponse): void {
    if (!this.proc || this.processExited || this.proc.exitCode !== null) return

    const body = JSON.stringify(message)
    const payload = `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`
    this.proc.stdin.write(payload)
  }

  protected startStderrReading(): void {
    if (!this.proc) return
    const reader = this.proc.stderr.getReader()
    const read = async () => {
      const decoder = new TextDecoder()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value)
          this.stderrBuffer.push(text)
          if (this.stderrBuffer.length > 100) {
            this.stderrBuffer.shift()
          }
        }
      } catch {
      }
    }
    void read()
  }

  protected async sendRequest<T>(method: string, params?: unknown): Promise<T> {
    if (!this.proc) throw new Error("LSP client not started")

    if (this.processExited || this.proc.exitCode !== null) {
      const stderr = this.stderrBuffer.slice(-10).join("\n")
      throw new Error(`LSP server already exited (code: ${this.proc.exitCode})` + (stderr ? `\nstderr: ${stderr}` : ""))
    }

    const id = this.nextRequestId++

    let timeoutId: ReturnType<typeof setTimeout>
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        const stderr = this.stderrBuffer.slice(-5).join("\n")
        reject(new Error(`LSP request timeout (method: ${method})` + (stderr ? `\nrecent stderr: ${stderr}` : "")))
      }, this.REQUEST_TIMEOUT)
    })

    const requestPromise = new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      })
    })

    this.sendRawMessage({ jsonrpc: "2.0", id, method, params })

    try {
      const result = await Promise.race([requestPromise, timeoutPromise])
      clearTimeout(timeoutId!)
      return result
    } catch (error) {
      clearTimeout(timeoutId!)
      this.pendingRequests.delete(id)
      throw error
    }
  }

  protected sendNotification(method: string, params?: unknown): void {
    this.sendRawMessage({ jsonrpc: "2.0", method, params })
  }

  isAlive(): boolean {
    return this.proc !== null && !this.processExited && this.proc.exitCode === null
  }

  async stop(): Promise<void> {
    this.sendNotification("shutdown", {})
    this.sendNotification("exit")

    const proc = this.proc
    if (!proc) return

    this.proc = null
    let exitedBeforeTimeout = false

    try {
      proc.kill()
      let timeoutId: ReturnType<typeof setTimeout> | undefined
      const timeoutPromise = new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, 5000)
      })

      await Promise.race([
        proc.exited
          .then(() => {
            exitedBeforeTimeout = true
          })
          .finally(() => {
            if (timeoutId) clearTimeout(timeoutId)
          }),
        timeoutPromise,
      ])

      if (!exitedBeforeTimeout) {
        log("[LSPClient] Process did not exit within timeout, escalating to SIGKILL")
        try {
          proc.kill("SIGKILL")
          await Promise.race([proc.exited, new Promise<void>((resolve) => setTimeout(resolve, 1000))])
        } catch {
        }
      }
    } catch {
    }

    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error("LSP client stopped"))
    }
    this.pendingRequests.clear()

    this.processExited = true
    this.diagnosticsStore.clear()
  }
}
