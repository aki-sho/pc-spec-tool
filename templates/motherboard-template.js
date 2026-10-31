import { createMessageView, createSpecView } from "../renderer/spec-view.js";

export function motherboardTemplate(systemInfo) {
  if (!systemInfo) {
    return createMessageView("Mainboard", "読み込み中です...");
  }

  return createSpecView("Mainboard", [
    ["Manufacturer", systemInfo.mainboard?.manufacturer || "-"],
    ["Model", systemInfo.mainboard?.model || "-"],
    ["Version", systemInfo.mainboard?.version || "-"],
    ["Serial", systemInfo.mainboard?.serial || "-"]
  ]);
}
