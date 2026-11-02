import { createMessageView, createCardPage, createCard, formatBytes } from "../renderer/spec-view.js";

export function memoryTemplate(systemInfo) {
  if (!systemInfo) return createMessageView("Memory", "読み込み中です...");
  const memory = systemInfo.memory || {};
  const modules = memory.modules || [];
  const cards = [createCard("搭載メモリ", [
    ["総容量", memory.total ? formatBytes(memory.total, true) : `${memory.totalGB || "—"} GB`],
    ["検出モジュール数", modules.length ? `${modules.length} 枚` : "取得できませんでした"]
  ], "MEMORY")];
  modules.forEach((item, index) => cards.push(createCard(item.bank || `モジュール ${index + 1}`, [
    ["容量", formatBytes(item.size, true)], ["規格", item.type || "—"],
    ["速度", item.clockSpeed ? `${item.clockSpeed} MHz` : "—"],
    ["メーカー", item.manufacturer || "—"], ["型番", item.partNum || "—"]
  ], `MODULE ${String(index + 1).padStart(2, "0")}`)));
  return createCardPage("Memory", "搭載容量と、検出した各モジュールの構成。", cards);
}
