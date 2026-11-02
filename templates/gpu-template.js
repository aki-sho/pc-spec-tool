import { createMessageView, createCardPage, createCard } from "../renderer/spec-view.js";

export function gpuTemplate(systemInfo) {
  if (!systemInfo) return createMessageView("Graphics", "読み込み中です...");
  const controllers = systemInfo.graphics?.controllers || [];
  const cards = controllers.map((gpu, index) => createCard(gpu.model || `GPU ${index + 1}`, [
    ["メーカー", gpu.vendor || "—"], ["モデル", gpu.model || "—"],
    ["VRAM", gpu.vram !== null && gpu.vram !== undefined ? `${gpu.vram} MB` : "—"],
    ["接続", gpu.bus || "—"], ["ドライバー", gpu.driverVersion || "—"]
  ], `GPU ${String(index + 1).padStart(2, "0")}`));
  return cards.length
    ? createCardPage("Graphics", `${controllers.length} 台のグラフィックスを検出。内蔵・外付けの両方を表示します。`, cards)
    : createMessageView("Graphics", "GPU情報を取得できませんでした。");
}
