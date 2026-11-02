import { createMessageView, createSpecView } from "../renderer/spec-view.js";

export function motherboardTemplate(systemInfo) {
  if (!systemInfo) {
    return createMessageView("Mainboard", "読み込み中です...");
  }

  return createSpecView("Mainboard", [
    ["メーカー", systemInfo.mainboard?.manufacturer || "—"],
    ["モデル", systemInfo.mainboard?.model || "—"],
    ["リビジョン", systemInfo.mainboard?.version || "—"],
    ["シリアル番号", systemInfo.mainboard?.serial || "—"]
  ]);
}
