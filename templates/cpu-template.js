import { createMessageView, createSpecView } from "../renderer/spec-view.js";

export function cpuTemplate(systemInfo) {
  if (!systemInfo) {
    return createMessageView("CPU", "読み込み中です...");
  }

  return createSpecView("CPU", [
    ["Manufacturer", systemInfo.cpu?.manufacturer || "-"],
    ["Brand", systemInfo.cpu?.brand || "-"],
    ["Cores", systemInfo.cpu?.cores ?? "-"],
    ["Physical Cores", systemInfo.cpu?.physicalCores ?? "-"],
    ["Speed", systemInfo.cpu?.speed ? systemInfo.cpu.speed + " GHz" : "-"]
  ]);
}
