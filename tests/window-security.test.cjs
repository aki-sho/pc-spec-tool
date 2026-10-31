const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");
const { configureWindowSecurity, isTrustedIpcSender } = require("../services/window-security");

const entryUrl = "file:///C:/PC%20Spec/index.html";

function trustedContext() {
  const frame = { url: entryUrl };
  const webContents = { mainFrame: frame, getURL: () => entryUrl };
  const win = { isDestroyed: () => false, webContents };
  return { win, event: { sender: webContents, senderFrame: frame } };
}

test("only the owning window's main frame at the exact entry URL is trusted", () => {
  const { event, win } = trustedContext();
  assert.equal(isTrustedIpcSender(event, win, entryUrl), true);
});

test("another window and a subframe are rejected even at the same file URL", () => {
  const { event, win } = trustedContext();
  const other = trustedContext();
  assert.equal(isTrustedIpcSender(other.event, win, entryUrl), false);
  event.senderFrame = { url: entryUrl };
  assert.equal(isTrustedIpcSender(event, win, entryUrl), false);
});

test("untrusted URLs, including other file URLs, cannot use the IPC bridge", () => {
  for (const url of [
    "https://example.invalid/", "data:text/html,test", "about:blank",
    "file:///C:/PC%20Spec/other.html", `${entryUrl}?other`, `${entryUrl}#other`,
    `${entryUrl}/../other.html`
  ]) {
    const { event, win } = trustedContext();
    event.senderFrame.url = url;
    assert.equal(isTrustedIpcSender(event, win, entryUrl), false, url);
  }
});

test("a pending navigation cannot retain access through an old frame", () => {
  const { event, win } = trustedContext();
  win.webContents.getURL = () => "https://example.invalid/";
  assert.equal(isTrustedIpcSender(event, win, entryUrl), false);
});

test("closed windows and missing or detached frames fail closed", () => {
  const { event, win } = trustedContext();
  assert.equal(isTrustedIpcSender(event, null, entryUrl), false);
  win.isDestroyed = () => true;
  assert.equal(isTrustedIpcSender(event, win, entryUrl), false);
  win.isDestroyed = () => false;
  event.senderFrame = null;
  assert.equal(isTrustedIpcSender(event, win, entryUrl), false);
  Object.defineProperty(event, "senderFrame", { get() { throw new Error("Detached frame"); } });
  assert.equal(isTrustedIpcSender(event, win, entryUrl), false);
});

test("navigation, redirects, frame navigation and window creation are denied", () => {
  const webContents = new EventEmitter();
  let openHandler;
  webContents.setWindowOpenHandler = (handler) => { openHandler = handler; };
  configureWindowSecurity({ webContents });

  for (const eventName of ["will-navigate", "will-frame-navigate", "will-redirect"]) {
    let prevented = false;
    webContents.emit(eventName, { preventDefault() { prevented = true; } });
    assert.equal(prevented, true, eventName);
  }
  assert.deepEqual(openHandler({ url: "https://example.invalid/" }), { action: "deny" });
});
