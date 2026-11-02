const SECTION_KEYS = Object.freeze(["cpu", "mainboard", "memory", "graphics", "storage", "os"]);
const number = (value) => value !== null && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;

function validateSections(sections = SECTION_KEYS) {
  if (!Array.isArray(sections) || !sections.length || sections.length > SECTION_KEYS.length ||
      sections.some((key) => !SECTION_KEYS.includes(key)) || new Set(sections).size !== sections.length) {
    throw new Error("再取得する項目が正しくありません。");
  }
  return [...sections];
}

function createHardwareService(si, { timeoutMs = 20000 } = {}) {
  const state = { sections: {}, capturedAt: null };
  const pending = new Map();
  const collectors = {
    cpu: async () => {
      const data = await si.cpu();
      return { manufacturer: data.manufacturer, brand: data.brand, cores: data.cores,
        physicalCores: data.physicalCores, speed: data.speed };
    },
    mainboard: async () => {
      const data = await si.baseboard();
      return { manufacturer: data.manufacturer, model: data.model, version: data.version, serial: data.serial };
    },
    memory: async () => {
      const [data, modules] = await Promise.all([si.mem(), si.memLayout()]);
      return { totalGB: ((number(data.total) || 0) / 1024 ** 3).toFixed(2), total: number(data.total),
        modules: modules.map((item) => ({ bank: item.bank, size: number(item.size), type: item.type,
          clockSpeed: number(item.clockSpeed), manufacturer: item.manufacturer, partNum: item.partNum,
          serial: item.serialNum })) };
    },
    graphics: async () => {
      const data = await si.graphics();
      return { controllers: (data.controllers || []).map((item) => ({ model: item.model, vendor: item.vendor,
        vram: number(item.vram), bus: item.bus, driverVersion: item.driverVersion })) };
    },
    storage: async () => {
      const [disks, volumes] = await Promise.all([si.diskLayout(), si.fsSize()]);
      return {
        disks: disks.map((item) => ({ name: item.name, type: item.type === "HD" ? "HDD" : item.type,
          size: number(item.size), interfaceType: item.interfaceType, serial: item.serialNum })),
        volumes: volumes.map((item) => ({ fs: item.fs, mount: item.mount, type: item.type,
          size: number(item.size), used: number(item.used), available: number(item.available), use: number(item.use) }))
      };
    },
    os: async () => {
      const data = await si.osInfo();
      return { distro: data.distro, release: data.release, build: data.build, arch: data.arch };
    }
  };

  async function collectSection(key) {
    let timer;
    try {
      const data = await Promise.race([
        Promise.resolve().then(collectors[key]),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), timeoutMs); })
      ]);
      state[key] = data;
      state.sections[key] = { state: "ok", updatedAt: new Date().toISOString() };
    } catch {
      state.sections[key] = { state: "error", updatedAt: state.sections[key]?.updatedAt || null,
        error: "情報を取得できませんでした。再試行してください。" };
    } finally {
      clearTimeout(timer);
      pending.delete(key);
    }
  }

  return {
    async collect(sections) {
      const keys = validateSections(sections);
      await Promise.all(keys.map((key) => {
        if (!pending.has(key)) pending.set(key, collectSection(key));
        return pending.get(key);
      }));
      state.capturedAt = new Date().toISOString();
      return structuredClone(state);
    },
    snapshot() { return structuredClone(state); }
  };
}

module.exports = { SECTION_KEYS, validateSections, createHardwareService };
