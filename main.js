const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const si = require("systeminformation");

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 760,
    minHeight: 520,
    title: "PC Spec Tool",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile("index.html");
}

ipcMain.handle("get-system-info", async () => {
  const [cpu, mem, os, graphics, baseboard] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.osInfo(),
    si.graphics(),
    si.baseboard()
  ]);

  return {
    cpu: {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
      speed: cpu.speed
    },
    memory: {
      totalGB: (mem.total / 1024 / 1024 / 1024).toFixed(2)
    },
    os: {
      distro: os.distro,
      release: os.release,
      build: os.build,
      arch: os.arch
    },
    graphics: {
      controllers: graphics.controllers || []
    },
    mainboard: {
      manufacturer: baseboard.manufacturer,
      model: baseboard.model,
      version: baseboard.version,
      serial: baseboard.serial
    }
  };
});

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});