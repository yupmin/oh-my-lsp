import { existsSync, readFileSync } from "node:fs"

export interface JsoncParseResult<T> {
  data: T | null
  errors: Array<{ message: string; offset: number; length: number }>
}

function stripJsonComments(input: string): string {
  let result = ""
  let inString = false
  let escaped = false
  let i = 0

  while (i < input.length) {
    const char = input[i]
    const next = input[i + 1]

    if (inString) {
      result += char
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      i += 1
      continue
    }

    if (char === '"') {
      inString = true
      result += char
      i += 1
      continue
    }

    if (char === "/" && next === "/") {
      i += 2
      while (i < input.length && input[i] !== "\n") {
        i += 1
      }
      continue
    }

    if (char === "/" && next === "*") {
      i += 2
      while (i < input.length - 1 && !(input[i] === "*" && input[i + 1] === "/")) {
        i += 1
      }
      i += 2
      continue
    }

    result += char
    i += 1
  }

  return result
}

function stripTrailingCommas(input: string): string {
  return input.replace(/,(\s*[}\]])/g, "$1")
}

function normalizeJsonc(input: string): string {
  return stripTrailingCommas(stripJsonComments(input))
}

export function parseJsonc<T = unknown>(content: string): T {
  try {
    return JSON.parse(normalizeJsonc(content)) as T
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new SyntaxError(`JSONC parse error: ${message}`)
  }
}

export function parseJsoncSafe<T = unknown>(content: string): JsoncParseResult<T> {
  try {
    return {
      data: parseJsonc<T>(content),
      errors: [],
    }
  } catch (error) {
    return {
      data: null,
      errors: [
        {
          message: error instanceof Error ? error.message : String(error),
          offset: 0,
          length: content.length,
        },
      ],
    }
  }
}

export function readJsoncFile<T = unknown>(filePath: string): T | null {
  try {
    const content = readFileSync(filePath, "utf-8")
    return parseJsonc<T>(content)
  } catch {
    return null
  }
}

export function detectConfigFile(basePath: string): {
  format: "json" | "jsonc" | "none"
  path: string
} {
  const jsoncPath = `${basePath}.jsonc`
  const jsonPath = `${basePath}.json`

  if (existsSync(jsoncPath)) {
    return { format: "jsonc", path: jsoncPath }
  }
  if (existsSync(jsonPath)) {
    return { format: "json", path: jsonPath }
  }
  return { format: "none", path: jsonPath }
}
