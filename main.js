const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const si = require("systeminformation");

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function configureStoragePaths() {
  const portableExecutableDirectory = process.env.PORTABLE_EXECUTABLE_DIR;
  const portableExecutableFile = process.env.PORTABLE_EXECUTABLE_FILE;
  const isPortable =
    process.platform === "win32" &&
    Boolean(portableExecutableDirectory) &&
    Boolean(portableExecutableFile);

  if (!isPortable) {
    app.setAppLogsPath();

    return {
      mode: "installed",
      portableData: null,
      userData: app.getPath("userData"),
      sessionData: app.getPath("sessionData"),
      logs: app.getPath("logs"),
      cache: path.join(app.getPath("sessionData"), "Cache"),
      temp: app.getPath("temp"),
      crashDumps: app.getPath("crashDumps")
    };
  }

  const portableData = path.join(
    path.resolve(portableExecutableDirectory),
    "PC-Spec-Tool-PortableData"
  );
  const storagePaths = {
    mode: "portable",
    portableData,
    userData: path.join(portableData, "UserData"),
    sessionData: path.join(portableData, "SessionData"),
    logs: path.join(portableData, "Logs"),
    cache: path.join(portableData, "Cache"),
    temp: path.join(portableData, "Temp"),
    crashDumps: path.join(portableData, "CrashDumps")
  };

  for (const directoryPath of Object.values(storagePaths).filter(
    (value) => typeof value === "string" && path.isAbsolute(value)
  )) {
    ensureDirectory(directoryPath);
  }

  process.env.TEMP = storagePaths.temp;
  process.env.TMP = storagePaths.temp;

  app.setPath("userData", storagePaths.userData);
  app.setPath("sessionData", storagePaths.sessionData);
  app.setPath("temp", storagePaths.temp);
  app.setPath("crashDumps", storagePaths.crashDumps);
  app.setAppLogsPath(storagePaths.logs);
  app.commandLine.appendSwitch("disk-cache-dir", storagePaths.cache);

  return storagePaths;
}

// Electron/Chromiumの初期化前に保存先を確定する必要があるため、whenReadyより前に実行する。
const storagePaths = configureStoragePaths();

function writeStartupLog() {
  ensureDirectory(storagePaths.logs);
  fs.appendFileSync(
    path.join(storagePaths.logs, "pc-spec-tool.log"),
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      ...storagePaths
    })}\n`,
    "utf8"
  );
}

writeStartupLog();

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
