import { createMessageView, createSpecView } from "../renderer/spec-view.js";

export function storageTemplate(systemInfo) {
  if (!systemInfo) {
    return createMessageView("Storage", "読み込み中です...");
  }

  const disks = systemInfo.storage?.disks || [];

  if (disks.length === 0) {
    return createMessageView("Storage", "ストレージ情報を取得できませんでした。");
  }

  const rows = disks.map((disk, index) => [
    `Drive ${index + 1}`,
    `${disk.name || disk.model || "-"}${disk.size ? ` / ${(disk.size / 1024 / 1024 / 1024).toFixed(2)} GB` : ""}`
  ]);

  return createSpecView("Storage", rows);
}
