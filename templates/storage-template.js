import { createMessageView, createCardPage, createCard, formatBytes } from "../renderer/spec-view.js";

export function storageTemplate(systemInfo) {
  if (!systemInfo) return createMessageView("Storage", "読み込み中です...");
  const { disks = [], volumes = [] } = systemInfo.storage || {};
  const cards = disks.map((disk, index) => createCard(disk.name || disk.model || `ディスク ${index + 1}`, [
    ["型番", disk.name || disk.model || "—"], ["種類", disk.type || "—"],
    ["容量", formatBytes(disk.size)], ["接続", disk.interfaceType || "—"]
  ], `DISK ${String(index + 1).padStart(2, "0")}`));
  volumes.forEach((volume) => {
    const card = createCard(volume.mount || volume.fs || "ボリューム", [
      ["ファイルシステム", volume.type || "—"], ["容量", formatBytes(volume.size)],
      ["使用済み", formatBytes(volume.used)], ["空き容量", formatBytes(volume.available)]
    ], "VOLUME");
    if (Number.isFinite(volume.use)) {
      const progress = document.createElement("progress");
      progress.max = 100;
      progress.value = Math.max(0, Math.min(100, volume.use));
      progress.setAttribute("aria-label", `${volume.mount || volume.fs} 使用率 ${progress.value}%`);
      card.append(progress);
    }
    cards.push(card);
  });
  return cards.length
    ? createCardPage("Storage", "物理ディスクとボリュームをそれぞれ表示。空き容量はボリューム単位です。", cards)
    : createMessageView("Storage", "ストレージ情報を取得できませんでした。");
}
