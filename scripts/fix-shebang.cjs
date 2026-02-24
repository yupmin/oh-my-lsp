const fs = require("node:fs")
const path = require("node:path")

const distFile = path.join(process.cwd(), "dist", "index.js")
const shebang = "#!/usr/bin/env node"

if (!fs.existsSync(distFile)) {
  process.exit(0)
}

const source = fs.readFileSync(distFile, "utf-8")

if (source.startsWith(`${shebang}\n`)) {
  process.exit(0)
}

const withoutShebangLines = source
  .split("\n")
  .filter((line, index) => !(index <= 2 && line.trim() === shebang))
  .join("\n")

fs.writeFileSync(distFile, `${shebang}\n${withoutShebangLines}`, "utf-8")
