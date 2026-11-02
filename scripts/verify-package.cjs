const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const asar = require("@electron/asar");

function verifyPackage(archive) {
  const files = asar.listPackage(archive).map(name => name.replaceAll("\\", "/"));
  for (const file of ["main.js", "preload.js", "index.html", "renderer/app.js", "styles/app.css", "services/hardware-service.js", "services/spec-export.js", "services/window-security.js"]) {
    assert.ok(files.includes("/" + file), `Missing packaged file: ${file}`);
  }
  assert.ok(!files.some(name => /^\/(tests|scripts|dist|\.agents|\.codex|\.github|release-history)(\/|$)/.test(name)));
  const libraries = new Set(files.map(name => name.match(/^\/node_modules\/([^/]+)/)?.[1]).filter(Boolean));
  assert.deepEqual([...libraries], ["systeminformation"], "Unexpected development dependencies in app.asar");
  const app = JSON.parse(asar.extractFile(archive, "package.json"));
  assert.equal(app.version, require("../package.json").version);
  const dependency = JSON.parse(asar.extractFile(archive, path.join("node_modules", "systeminformation", "package.json")));
  assert.equal(dependency.version, require("systeminformation/package.json").version);
  for (const name of files.filter(name => !name.startsWith("/node_modules/") && name !== "/node_modules" && name !== "/package.json")) {
    const relative = path.normalize(name.slice(1));
    if (asar.statFile(archive, relative).files) continue;
    assert.deepEqual(asar.extractFile(archive, relative), fs.readFileSync(path.join(__dirname, "..", relative)), `Stale packaged source: ${name}`);
  }
  console.log("PASS: package version, production files and dependency allowlist; development libraries excluded");
}

module.exports = { verifyPackage };
if (require.main === module) verifyPackage(process.argv[2]);
