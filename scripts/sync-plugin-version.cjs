#!/usr/bin/env node
/**
 * Sync version from package.json to .claude-plugin/ files.
 * Called automatically by npm's "version" lifecycle script.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const version = require(path.join(root, "package.json")).version;

const files = [
  path.join(root, ".claude-plugin/plugin.json"),
  path.join(root, ".claude-plugin/marketplace.json"),
];

for (const file of files) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));

  if (json.version !== undefined) {
    json.version = version;
  }
  if (json.metadata?.version !== undefined) {
    json.metadata.version = version;
  }
  if (json.plugins) {
    for (const plugin of json.plugins) {
      if (plugin.version !== undefined) {
        plugin.version = version;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  console.log(`Updated ${path.relative(root, file)} → ${version}`);
}
