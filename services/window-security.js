function configureWindowSecurity(win) {
  const denyNavigation = (event) => event.preventDefault();
  win.webContents.on("will-navigate", denyNavigation);
  win.webContents.on("will-frame-navigate", denyNavigation);
  win.webContents.on("will-redirect", denyNavigation);
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
}

function isTrustedIpcSender(event, win, entryUrl) {
  try {
    if (!win || win.isDestroyed() || event.sender !== win.webContents) {
      return false;
    }

    const frame = event.senderFrame;
    // file:// origins are shared. Check the exact entry URL and frame identity.
    return Boolean(
      frame &&
      frame === win.webContents.mainFrame &&
      frame.url === entryUrl &&
      win.webContents.getURL() === entryUrl
    );
  } catch {
    // A frame can disappear while an IPC request is in flight.
    return false;
  }
}

module.exports = { configureWindowSecurity, isTrustedIpcSender };
