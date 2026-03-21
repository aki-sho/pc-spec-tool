export function storageTemplate(systemInfo) {
  if (!systemInfo) {
    return "<h2>Storage</h2><p>読み込み中です...</p>";
  }

  const disks = systemInfo.storage?.disks || [];

  if (disks.length === 0) {
    return `
      <h2>Storage</h2>
      <p>ストレージ情報を取得できませんでした。</p>
    `;
  }

  const rows = disks.map((disk, index) => `
    <div class="label">Drive ${index + 1}</div>
    <div class="value">
      ${(disk.name || disk.model || "-")}
      ${disk.size ? ` / ${(disk.size / 1024 / 1024 / 1024).toFixed(2)} GB` : ""}
    </div>
  `).join("");

  return `
    <h2>Storage</h2>
    <div class="spec-grid">
      ${rows}
    </div>
  `;
}