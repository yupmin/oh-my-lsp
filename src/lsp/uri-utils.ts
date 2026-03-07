/**
 * Normalize a file URI so that different representations of the same path
 * (e.g. `file:///C:/foo` vs `file:///c%3A/foo`) produce the same string.
 * On non-Windows platforms this is effectively a no-op.
 */
export function normalizeFileUri(uri: string): string {
  // Some LSP servers percent-encode the colon in Windows drive letters
  // e.g. file:///c%3A/Users/... → file:///c:/Users/...
  const decoded = uri.replace(/^file:\/\/\/([a-zA-Z])%3A/i, (_, drive: string) =>
    `file:///${drive.toLowerCase()}:`
  )
  // Normalize drive letter to lowercase: file:///C:/ → file:///c:/
  return decoded.replace(/^file:\/\/\/([A-Z]):/, (_, drive: string) =>
    `file:///${drive.toLowerCase()}:`
  )
}
