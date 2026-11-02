const assert = require("node:assert/strict");
const test = require("node:test");
const { validateExportOptions, createReport } = require("../services/spec-export");
const snapshot = {
  capturedAt: "2026-11-02T00:00:00Z", sections: { cpu: { state: "ok" }, memory: { state: "error" } },
  cpu: { brand: "CPU <test>" }, mainboard: { model: "Board", serial: "private-board" },
  memory: { modules: [{ serial: "private-memory", type: "DDR5" }] },
  storage: { disks: [{ name: "SSD", serial: "private-disk" }], volumes: [{ available: 500 }] }
};

test("TXT and JSON exclude serial numbers recursively unless explicitly requested", () => {
  for (const format of ["txt", "json"]) {
    const report = createReport(snapshot, { format, includeSerial: false }, "1.1.0");
    for (const marker of ["private-board", "private-memory", "private-disk"]) assert.ok(!report.includes(marker));
    assert.ok(report.includes("DDR5"));
    assert.ok(report.includes("500"));
    const included = createReport(snapshot, { format, includeSerial: true }, "1.1.0");
    for (const marker of ["private-board", "private-memory", "private-disk"]) assert.ok(included.includes(marker));
  }
  assert.equal(snapshot.mainboard.serial, "private-board");
});

test("JSON is parseable and preserves version, status, empty values and acquisition time", () => {
  const report = JSON.parse(createReport(snapshot, { format: "json", includeSerial: false }, "1.1.0"));
  assert.equal(report.version, "1.1.0");
  assert.equal(report.capturedAt, snapshot.capturedAt);
  assert.equal(report.sections.memory.state, "error");
  assert.equal(report.serialNumbersIncluded, false);
  assert.equal(report.cpu.brand, "CPU <test>");
});

test("text exports identify stale data and exports before any acquisition are rejected", () => {
  assert.ok(createReport(snapshot, { format: "txt", includeSerial: false }, "1.1.0").includes("previous data"));
  assert.throws(() => createReport({ sections: {} }, { format: "txt", includeSerial: false }, "1.1.0"));
});

test("export IPC settings cannot carry a path, invalid format or truthy non-boolean privacy setting", () => {
  for (const input of [null, [], {}, { format: "exe", includeSerial: false }, { format: "txt", includeSerial: "false" },
    { format: "txt", includeSerial: false, path: "C:/unexpected.txt" }]) assert.throws(() => validateExportOptions(input));
  assert.deepEqual(validateExportOptions({ includeSerial: false }, false), { format: "txt", includeSerial: false });
  assert.throws(() => validateExportOptions({ includeSerial: true, format: "json" }, false));
});
