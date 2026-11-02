import { createMessageView, createSpecView } from "../renderer/spec-view.js";

export function osTemplate(systemInfo) {
  if (!systemInfo) {
    return createMessageView("OS", "読み込み中です...");
  }

  return createSpecView("OS", [
    ["OS", systemInfo.os?.distro || "—"],
    ["リリース", systemInfo.os?.release || "—"],
    ["ビルド", systemInfo.os?.build || "—"],
    ["アーキテクチャ", systemInfo.os?.arch || "—"]
  ]);
}
