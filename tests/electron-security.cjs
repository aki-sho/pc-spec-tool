const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, clipboard, dialog } = require("electron");
const appRoot = process.env.PC_SPEC_SECURITY_APP_ROOT || path.join(__dirname, "..");
const si = require(path.join(appRoot, "node_modules/systeminformation"));

if (!process.env.PC_SPEC_SECURITY_TEST_DIR) {
  throw new Error("Run this test with npm run test:security");
}

process.env.PORTABLE_EXECUTABLE_DIR = process.env.PC_SPEC_SECURITY_TEST_DIR;
process.env.PORTABLE_EXECUTABLE_FILE = path.join(process.env.PC_SPEC_SECURITY_TEST_DIR, "test.exe");
app.on("browser-window-created", (_event, win) => win.hide());
require(path.join(appRoot, "main.js"));

const payload = `<img src=x onerror="window.__pcSpecXss=true"> & " ' </div><script>window.__pcSpecXss=true</script>`;
const evaluate = (win, source) => win.webContents.executeJavaScript(source, true);

async function waitForPanel(win, title) {
  await evaluate(win, `new Promise((resolve, reject) => {
    const deadline = Date.now() + 30000;
    const check = () => {
      const heading = document.querySelector('.panel h2');
      const content = ${JSON.stringify(title)} === 'CPU'
        ? document.querySelector('.panel .value')
        : document.querySelector('.panel .value, .panel p');
      if (heading?.textContent === ${JSON.stringify(title)} && content && !document.querySelector('#refresh').disabled) {
        resolve();
      } else if (Date.now() > deadline) {
        reject(new Error('Timed out waiting for panel: ' + ${JSON.stringify(title)}));
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  })`);
}

async function waitFor(win, condition) {
  await evaluate(win, `new Promise((resolve, reject) => {
    const deadline = Date.now() + 30000;
    const check = () => {
      if (${condition}) resolve();
      else if (Date.now() > deadline) reject(new Error('UI condition timed out'));
      else setTimeout(check, 25);
    };
    check();
  })`);
}

async function clickAndWait(win, selector, condition = "!document.querySelector('#refresh').disabled && !document.querySelector('#copy').disabled") {
  await evaluate(win, `document.querySelector(${JSON.stringify(selector)}).click()`);
  await waitFor(win, condition);
}

app.whenReady().then(async () => {
  const win = BrowserWindow.getAllWindows()[0];
  win.webContents.setBackgroundThrottling(false);
  if (win.webContents.isLoading()) {
    await new Promise((resolve) => win.webContents.once("did-finish-load", resolve));
  }
  await waitForPanel(win, "CPU");
  const entryUrl = win.webContents.getURL();
  const preferences = win.webContents.getLastWebPreferences();
  assert.equal(preferences.sandbox, true);
  assert.equal(preferences.contextIsolation, true);
  assert.equal(preferences.nodeIntegration, false);
  assert.equal(preferences.webSecurity, true);
  assert.equal(await evaluate(win, "typeof require"), "undefined");
  assert.equal(await evaluate(win, "getComputedStyle(document.querySelector('.spec-grid')).display"), "grid");
  console.log(`PASS: Electron ${process.versions.electron}, sandboxed renderer, real hardware IPC and local CSS`);

  if (process.env.PC_SPEC_TEST_SCREENSHOT) {
    fs.writeFileSync(process.env.PC_SPEC_TEST_SCREENSHOT, (await win.webContents.capturePage()).toPNG());
  }

  for (const title of ["CPU", "Mainboard", "Memory", "Graphics", "Storage", "OS", "About"]) {
    assert.equal(await evaluate(win, `(() => {
      document.querySelector('[data-tab="${title}"]').click();
      return document.querySelector('.panel h2').textContent;
    })()`), title);
  }
  console.log("PASS: all seven existing tabs render");

  const privateMarker = "DEMO-PRIVATE-SERIAL";
  const calls = {};
  const demo = {
    cpu: { manufacturer: "AMD", brand: "Ryzen 9 9900X", cores: 24, physicalCores: 12, speed: 4.4 },
    baseboard: { manufacturer: "ASUS", model: "ROG STRIX X870-F", version: "Rev 1.xx", serial: privateMarker },
    mem: { total: 32 * 1024 ** 3 },
    memLayout: [0, 1].map(index => ({ bank: `DIMM ${index + 1}`, size: 16 * 1024 ** 3, type: "DDR5", clockSpeed: 6000, manufacturer: "Kingston", partNum: "KF560C30-16", serialNum: privateMarker })),
    graphics: { controllers: [{ vendor: "NVIDIA", model: "GeForce RTX 5070", vram: 12288, bus: "PCIe", driverVersion: "581.80" }, { vendor: "AMD", model: "Radeon Graphics", vram: 512, bus: "PCIe", driverVersion: "32.0.12033" }] },
    diskLayout: [{ name: "Samsung SSD 990 PRO 1TB", type: "SSD", size: 10 ** 12, interfaceType: "NVMe", serialNum: privateMarker }, { name: "WD Blue 2TB", type: "HD", size: 2 * 10 ** 12, interfaceType: "SATA", serialNum: privateMarker }],
    fsSize: [{ mount: "C:", fs: "C:", type: "NTFS", size: 10 ** 12, used: 382 * 10 ** 9, available: 618 * 10 ** 9, use: 38.2 }, { mount: "D:", fs: "D:", type: "NTFS", size: 2 * 10 ** 12, used: 5 * 10 ** 11, available: 1.5 * 10 ** 12, use: 25 }],
    osInfo: { distro: "Microsoft Windows 11 Pro", release: "10.0.26200", build: "26200", arch: "x64" }
  };
  for (const [key, value] of Object.entries(demo)) si[key] = async () => { calls[key] = (calls[key] || 0) + 1; return value; };
  await clickAndWait(win, "#refresh");
  assert.equal(await evaluate(win, "document.querySelector('#include-serial').checked"), false);
  assert.equal(await evaluate(win, "document.querySelector('#app-version').textContent"), "v" + require(path.join(appRoot, "package.json")).version);
  for (const [tab, count] of [["Graphics", 2], ["Memory", 3], ["Storage", 4]]) {
    await evaluate(win, `document.querySelector('[data-tab="${tab}"]').click()`);
    assert.equal(await evaluate(win, "document.querySelectorAll('.panel .spec-card').length"), count, tab);
  }
  assert.ok(await evaluate(win, "document.querySelector('.panel').textContent.includes('618 GB')"));
  console.log("PASS: multiple GPUs, memory modules, physical disks and per-volume free capacity");

  let copied = "";
  clipboard.writeText = text => { copied = text; };
  await clickAndWait(win, "#copy");
  assert.ok(copied.includes("Ryzen 9 9900X"));
  assert.ok(!copied.includes(privateMarker));
  await evaluate(win, "document.querySelector('#include-serial').checked = true");
  await clickAndWait(win, "#copy");
  assert.ok(copied.includes(privateMarker));
  await evaluate(win, "document.querySelector('#include-serial').checked = false");
  for (const format of ["txt", "json"]) {
    const filePath = path.join(process.env.PC_SPEC_SECURITY_TEST_DIR, `report.${format}`);
    dialog.showSaveDialog = async (_owner, options) => {
      assert.deepEqual(options.filters[0].extensions, [format]);
      return { canceled: false, filePath };
    };
    await evaluate(win, `document.querySelector('#export-format').value = '${format}'`);
    await clickAndWait(win, "#save");
    const contents = fs.readFileSync(filePath, "utf8");
    assert.ok(contents.includes("Ryzen 9 9900X"));
    assert.ok(!contents.includes(privateMarker));
    if (format === "json") assert.equal(JSON.parse(contents).storage.volumes[0].available, 618 * 10 ** 9);
  }
  dialog.showSaveDialog = async () => ({ canceled: true });
  await clickAndWait(win, "#save");
  assert.ok(await evaluate(win, "document.querySelector('#notice').textContent.includes('キャンセル')"));
  dialog.showSaveDialog = async () => ({ canceled: false, filePath: path.join(process.env.PC_SPEC_SECURITY_TEST_DIR, "invalid.exe") });
  await clickAndWait(win, "#save");
  assert.equal(fs.existsSync(path.join(process.env.PC_SPEC_SECURITY_TEST_DIR, "invalid.exe")), false);
  assert.ok(await evaluate(win, "document.querySelector('#notice').textContent.includes('拡張子')"));
  console.log("PASS: copy, TXT/JSON writes, default serial redaction, explicit inclusion, cancellation and extension checks");

  assert.ok(await evaluate(win, "!document.querySelector('#notice').textContent.includes('remote method')"));
  await evaluate(win, "document.querySelector('#export-format').value = 'txt'");
  await clickAndWait(win, "#refresh");

  if (process.env.PC_SPEC_TEST_SCREENSHOT_DIR) {
    fs.mkdirSync(process.env.PC_SPEC_TEST_SCREENSHOT_DIR, { recursive: true });
  }
  for (const size of [[1180, 820], [860, 620]]) {
    win.setSize(...size);
    for (const tab of ["CPU", "Graphics", "Memory", "Storage"]) {
      await evaluate(win, `document.querySelector('[data-tab="${tab}"]').click(); document.querySelector('.content').scrollTop = 0`);
      await evaluate(win, "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      assert.ok(await evaluate(win, "document.documentElement.scrollWidth <= innerWidth && document.querySelector('.panel').scrollWidth <= document.querySelector('.panel').clientWidth"), `${tab} at ${size}`);
      assert.ok(await evaluate(win, "document.querySelector('#save').getBoundingClientRect().bottom <= innerHeight"));
      if (process.env.PC_SPEC_TEST_SCREENSHOT_DIR) {
        fs.writeFileSync(path.join(process.env.PC_SPEC_TEST_SCREENSHOT_DIR, `${tab}-${size[0]}.png`), (await win.webContents.capturePage()).toPNG());
      }
    }
  }
  win.setSize(1180, 820);
  console.log("PASS: desktop and minimum-size layouts, all panels and export controls remain accessible");

  const results = await evaluate(win, `(async () => {
    const payload = ${JSON.stringify(payload)};
    const fixture = {
      cpu: { manufacturer: payload, brand: payload, cores: payload, physicalCores: payload, speed: payload },
      memory: { totalGB: payload },
      mainboard: { manufacturer: payload, model: payload, version: payload, serial: payload },
      os: { distro: payload, release: payload, build: payload, arch: payload },
      graphics: { controllers: [{ model: payload, vendor: payload, vram: payload, bus: payload }] },
      storage: { disks: [{ name: payload, size: 1024 }, { model: payload }] }
    };
    const panel = document.querySelector('.panel');
    const results = [];
    for (const [name, fn] of [
      ['cpu', 'cpuTemplate'], ['gpu', 'gpuTemplate'], ['memory', 'memoryTemplate'],
      ['motherboard', 'motherboardTemplate'], ['os', 'osTemplate'], ['storage', 'storageTemplate']
    ]) {
      const module = await import(new URL('./templates/' + name + '-template.js', location.href).href);
      panel.replaceChildren(module[fn](fixture));
      results.push({ name, literal: panel.textContent.includes(payload),
        injected: Boolean(panel.querySelector('img, script, iframe')) });
      panel.replaceChildren(module[fn](null));
      if (!panel.textContent.includes('読み込み中')) throw new Error('Missing loading state: ' + name);
    }
    const { createMessageView } = await import(new URL('./renderer/spec-view.js', location.href).href);
    panel.replaceChildren(createMessageView(payload, payload));
    results.push({ name: 'message', literal: panel.querySelector('p').textContent === payload,
      injected: Boolean(panel.querySelector('img, script, iframe')) });
    return results;
  })()`);
  for (const result of results) {
    assert.equal(result.literal, true, result.name);
    assert.equal(result.injected, false, result.name);
  }
  assert.equal(await evaluate(win, "window.__pcSpecXss"), undefined);
  console.log("PASS: hostile markup stays literal in all six templates and messages");

  const originalCpu = si.cpu;
  si.cpu = async () => { throw new Error(payload); };
  win.webContents.reload();
  await new Promise((resolve) => win.webContents.once("did-finish-load", resolve));
  await waitFor(win, "!document.querySelector('#refresh').disabled && Boolean(document.querySelector('.error-banner'))");
  assert.equal(await evaluate(win, `document.querySelector('.panel').textContent.includes(${JSON.stringify(payload)})`), false);
  assert.equal(await evaluate(win, "Boolean(document.querySelector('.panel img, .panel script'))"), false);
  si.cpu = originalCpu;
  const memoryCalls = calls.mem;
  await clickAndWait(win, ".retry-section");
  assert.equal(await evaluate(win, "Boolean(document.querySelector('.error-banner'))"), false);
  assert.equal(calls.mem, memoryCalls);
  assert.equal(await evaluate(win, "document.querySelector('#retry-failed').hidden"), true);
  console.log("PASS: partial collection failure preserves other tabs; targeted retry recovers without fetching unrelated hardware");

  const csp = await evaluate(win, `(async () => {
    window.__cspInline = false;
    const directives = [];
    document.addEventListener('securitypolicyviolation', event => directives.push(event.effectiveDirective));
    const script = document.createElement('script');
    script.textContent = 'window.__cspInline = true';
    document.body.append(script);
    let fetchBlocked = false;
    try { await fetch('data:text/plain,blocked'); } catch { fetchBlocked = true; }
    const frame = document.createElement('iframe');
    frame.src = 'data:text/html,blocked';
    document.body.append(frame);
    await new Promise(resolve => setTimeout(resolve, 100));
    script.remove();
    frame.remove();
    return { inlineBlocked: !window.__cspInline, fetchBlocked, directives };
  })()`);
  assert.equal(csp.inlineBlocked, true);
  assert.equal(csp.fetchBlocked, true);
  assert.ok(csp.directives.includes("script-src-elem"));
  assert.ok(csp.directives.includes("connect-src"));
  assert.ok(csp.directives.includes("frame-src"));
  console.log("PASS: CSP blocks inline JavaScript, connections and embedded frames");

  const count = BrowserWindow.getAllWindows().length;
  assert.equal(await evaluate(win, "window.open('https://example.invalid/blocked') === null"), true);
  assert.equal(BrowserWindow.getAllWindows().length, count);
  const navigation = new Promise((resolve) => {
    win.webContents.once("will-frame-navigate", (event) => resolve(event.defaultPrevented));
  });
  await evaluate(win, "location.href = 'https://example.invalid/blocked'; undefined");
  assert.equal(await navigation, true);
  assert.equal(win.webContents.getURL(), entryUrl);
  console.log("PASS: external navigation and new windows are blocked");

  const untrusted = new BrowserWindow({
    show: false,
    webPreferences: { preload: path.join(appRoot, "preload.js"), sandbox: true, contextIsolation: true, nodeIntegration: false }
  });
  await untrusted.loadFile(path.join(appRoot, "index.html"));
  const rejected = "window.pcInfo.getSystemInfo().then(() => false, error => error.message.includes('情報取得を拒否'))";
  assert.equal(await evaluate(untrusted, rejected), true);
  const deniedExports = `Promise.all([
    window.pcInfo.getAppInfo(), window.pcInfo.copySpecs({includeSerial:false}),
    window.pcInfo.saveSpecs({format:'txt',includeSerial:false})
  ].map(promise => promise.then(() => false, () => true)))`;
  assert.deepEqual(await evaluate(untrusted, deniedExports), [true, true, true]);
  untrusted.destroy();
  // Main-process navigation intentionally bypasses will-navigate, exercising the IPC guard independently.
  await win.loadURL("data:text/html,<title>untrusted</title>");
  assert.equal(await evaluate(win, rejected), true);
  console.log("PASS: IPC rejects another window and a navigated main window");
  app.exit(0);
}).catch((error) => {
  console.error(error);
  app.exit(1);
});

setTimeout(() => {
  console.error("Security integration test timed out");
  app.exit(1);
}, 90000).unref();
