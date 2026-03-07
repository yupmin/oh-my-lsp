import { pathToFileURL } from "node:url"

import { LSPClientTransport } from "./lsp-client-transport"
import { log } from "../shared/logger"

const SLOW_SERVERS = new Set(["jdtls", "kotlin-ls", "rust", "csharp"])
const PROGRESS_WAIT_TIMEOUT_MS = 120_000

function resolveProgressWaitTimeoutMs(): number {
  const raw = process.env.OH_MY_LSP_PROGRESS_WAIT_MS?.trim()
  if (!raw) return PROGRESS_WAIT_TIMEOUT_MS
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : PROGRESS_WAIT_TIMEOUT_MS
}

export class LSPClientConnection extends LSPClientTransport {
  async initialize(): Promise<void> {
    const rootUri = pathToFileURL(this.root).href
    await this.sendRequest("initialize", {
      processId: process.pid,
      rootUri,
      rootPath: this.root,
      workspaceFolders: [{ uri: rootUri, name: "workspace" }],
      capabilities: {
        textDocument: {
          hover: { contentFormat: ["markdown", "plaintext"] },
          definition: { linkSupport: true },
          references: {},
          documentSymbol: { hierarchicalDocumentSymbolSupport: true },
          publishDiagnostics: {},
          rename: {
            prepareSupport: true,
            prepareSupportDefaultBehavior: 1,
            honorsChangeAnnotations: true,
          },
          codeAction: {
            codeActionLiteralSupport: {
              codeActionKind: {
                valueSet: [
                  "quickfix",
                  "refactor",
                  "refactor.extract",
                  "refactor.inline",
                  "refactor.rewrite",
                  "source",
                  "source.organizeImports",
                  "source.fixAll",
                ],
              },
            },
            isPreferredSupport: true,
            disabledSupport: true,
            dataSupport: true,
            resolveSupport: {
              properties: ["edit", "command"],
            },
          },
        },
        workspace: {
          symbol: {},
          workspaceFolders: true,
          configuration: true,
          applyEdit: true,
          workspaceEdit: {
            documentChanges: true,
          },
        },
      },
      ...this.server.initialization,
    })
    this.sendNotification("initialized", {})
    this.sendNotification("workspace/didChangeConfiguration", {
      settings: { json: { validate: { enable: true } } },
    })

    if (SLOW_SERVERS.has(this.server.id)) {
      // Slow servers (jdtls, kotlin-ls, etc.) index the project asynchronously
      // after initialization. Wait for initial progress tokens to arrive,
      // then wait for all of them to complete before accepting requests.
      const waitMs = resolveProgressWaitTimeoutMs()
      log(`[LSP] Waiting for ${this.server.id} to become ready (up to ${waitMs}ms)`)
      // Give the server a moment to register its initial progress tokens
      await new Promise((r) => setTimeout(r, 2000))
      await this.waitForProgressComplete(waitMs)
      log(`[LSP] ${this.server.id} is ready`)
    } else {
      await new Promise((r) => setTimeout(r, 300))
    }
  }
}
