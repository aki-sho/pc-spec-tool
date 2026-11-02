const assert = require("node:assert/strict");
const test = require("node:test");
const { createHardwareService, validateSections, SECTION_KEYS } = require("../services/hardware-service");

function fixture() {
  const calls = {};
  const values = {
    cpu: { brand: "Test CPU", cores: 8 }, baseboard: { model: "Test board", serial: "board-private" },
    mem: { total: 32 * 1024 ** 3 },
    memLayout: [{ bank: "DIMM A1", size: 16 * 1024 ** 3, type: "DDR5", clockSpeed: 5600, serialNum: "mem-private" }, { bank: "DIMM B1", size: 16 * 1024 ** 3 }],
    graphics: { controllers: [{ model: "GPU 1", vram: 8192, secret: "unused" }, { model: "GPU 2", vram: 0 }] },
    diskLayout: [{ name: "Test HDD", type: "HD", size: 1000, serialNum: "disk-private" }],
    fsSize: [{ mount: "C:", size: 1000, used: 200, available: 800, use: 20 }],
    osInfo: { distro: "Windows", arch: "x64" }
  };
  const si = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, async () => {
    calls[key] = (calls[key] || 0) + 1;
    return value;
  }]));
  return { si, calls };
}

test("collects physical disks, free volume space, memory modules and every GPU", async () => {
  const { si } = fixture();
  const result = await createHardwareService(si).collect();
  assert.deepEqual(Object.keys(result.sections).sort(), [...SECTION_KEYS].sort());
  assert.equal(result.memory.totalGB, "32.00");
  assert.equal(result.memory.modules.length, 2);
  assert.equal(result.graphics.controllers.length, 2);
  assert.equal(result.graphics.controllers[1].vram, 0);
  assert.equal(result.graphics.controllers[0].secret, undefined);
  assert.equal(result.storage.disks[0].type, "HDD");
  assert.equal(result.storage.volumes[0].available, 800);
  assert.ok(Object.values(result.sections).every((section) => section.state === "ok"));
});

test("one failed section leaves the other five usable and retry only fetches the failed section", async () => {
  const { si, calls } = fixture();
  const cpu = si.cpu;
  si.cpu = async () => { throw new Error("failure"); };
  const service = createHardwareService(si);
  const failed = await service.collect();
  assert.equal(failed.sections.cpu.state, "error");
  assert.equal(failed.cpu, undefined);
  assert.equal(failed.storage.volumes[0].available, 800);
  assert.equal(Object.values(failed.sections).filter((item) => item.state === "ok").length, 5);
  si.cpu = cpu;
  const recovered = await service.collect(["cpu"]);
  assert.equal(recovered.sections.cpu.state, "ok");
  assert.equal(calls.cpu, 1);
  assert.equal(calls.diskLayout, 1);
  assert.equal(calls.memLayout, 1);
});

test("refresh failure preserves old data and marks it stale; returned snapshots cannot alter the cache", async () => {
  const { si } = fixture();
  const service = createHardwareService(si);
  const initial = await service.collect(["cpu"]);
  initial.cpu.brand = "tampered";
  assert.equal(service.snapshot().cpu.brand, "Test CPU");
  si.cpu = async () => { throw new Error("failure"); };
  const stale = await service.collect(["cpu"]);
  assert.equal(stale.cpu.brand, "Test CPU");
  assert.equal(stale.sections.cpu.state, "error");
  assert.equal(stale.sections.cpu.updatedAt, initial.sections.cpu.updatedAt);
});

test("hanging collectors time out without blocking successful sections", async () => {
  const { si } = fixture();
  si.cpu = () => new Promise(() => {});
  const result = await createHardwareService(si, { timeoutMs: 15 }).collect(["cpu", "os"]);
  assert.equal(result.sections.cpu.state, "error");
  assert.equal(result.sections.os.state, "ok");
});

test("overlapping requests share an in-flight hardware query", async () => {
  const { si, calls } = fixture();
  const service = createHardwareService(si);
  await Promise.all([service.collect(["cpu"]), service.collect(["cpu", "memory"])]);
  assert.equal(calls.cpu, 1);
  assert.equal(calls.mem, 1);
});

test("section selection rejects unsupported names, duplicate keys and malformed IPC inputs", () => {
  for (const input of [null, "cpu", [], ["__proto__"], ["cpu", "cpu"], ["cpu", "exec"], {}]) {
    assert.throws(() => validateSections(input));
  }
});
