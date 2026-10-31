import { createMessageView, createSpecView } from "../renderer/spec-view.js";

export function memoryTemplate(systemInfo) {
  if (!systemInfo) {
    return createMessageView("Memory", "読み込み中です...");
  }

  return createSpecView("Memory", [
    ["Total Memory", `${systemInfo.memory?.totalGB || "-"} GB`]
  ]);
}
