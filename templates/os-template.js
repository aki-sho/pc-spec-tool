import { createMessageView, createSpecView } from "../renderer/spec-view.js";

export function osTemplate(systemInfo) {
  if (!systemInfo) {
    return createMessageView("OS", "読み込み中です...");
  }

  return createSpecView("OS", [
    ["Name", systemInfo.os?.distro || "-"],
    ["Release", systemInfo.os?.release || "-"],
    ["Build", systemInfo.os?.build || "-"],
    ["Architecture", systemInfo.os?.arch || "-"]
  ]);
}
