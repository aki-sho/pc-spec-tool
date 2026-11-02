const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pcInfo", {
  getSystemInfo: (sections) => ipcRenderer.invoke("get-system-info", sections),
  getAppInfo: () => ipcRenderer.invoke("get-app-info"),
  copySpecs: (options) => ipcRenderer.invoke("copy-system-info", options),
  saveSpecs: (options) => ipcRenderer.invoke("save-system-info", options)
});
