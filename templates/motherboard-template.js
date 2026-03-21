export function motherboardTemplate(systemInfo) {
  if (!systemInfo) {
    return "<h2>Mainboard</h2><p>読み込み中です...</p>";
  }

  return `
    <h2>Mainboard</h2>
    <div class="spec-grid">
      <div class="label">Manufacturer</div><div class="value">${systemInfo.mainboard?.manufacturer || "-"}</div>
      <div class="label">Model</div><div class="value">${systemInfo.mainboard?.model || "-"}</div>
      <div class="label">Version</div><div class="value">${systemInfo.mainboard?.version || "-"}</div>
      <div class="label">Serial</div><div class="value">${systemInfo.mainboard?.serial || "-"}</div>
    </div>
  `;
}