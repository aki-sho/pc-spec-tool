import { createMessageView, createSpecView } from "../renderer/spec-view.js";

export function cpuTemplate(systemInfo) {
  if (!systemInfo) {
    return createMessageView("CPU", "読み込み中です...");
  }

  return createSpecView("CPU", [
    ["メーカー", systemInfo.cpu?.manufacturer || "—"],
    ["モデル", systemInfo.cpu?.brand || "—"],
    ["論理コア", systemInfo.cpu?.cores ?? "—"],
    ["物理コア", systemInfo.cpu?.physicalCores ?? "—"],
    ["クロック", systemInfo.cpu?.speed ? systemInfo.cpu.speed + " GHz" : "—"]
  ]);
}
