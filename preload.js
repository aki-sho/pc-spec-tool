const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pcInfo", {
  async getSystemInfo() {
    return await ipcRenderer.invoke("get-system-info");
  }
});