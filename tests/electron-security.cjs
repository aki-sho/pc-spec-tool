const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");
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
      if (heading?.textContent === ${JSON.stringify(title)} && content) {
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

app.whenReady().then(async () => {
  const win = BrowserWindow.getAllWindows()[0];
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
      results.push({ name, literal: [...panel.querySelectorAll('.value')].every(el => el.textContent.includes(payload)),
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
  await waitForPanel(win, "エラー");
  assert.equal(await evaluate(win, `document.querySelector('.panel p').textContent.includes(${JSON.stringify(payload)})`), true);
  assert.equal(await evaluate(win, "Boolean(document.querySelector('.panel img, .panel script'))"), false);
  si.cpu = originalCpu;
  console.log("PASS: actual IPC failure renders error text without HTML interpretation");

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
