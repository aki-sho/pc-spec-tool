export function cpuTemplate(systemInfo) {
  if (!systemInfo) {
    return "<h2>CPU</h2><p>読み込み中です...</p>";
  }

  return `
    <h2>CPU</h2>
    <div class="spec-grid">
      <div class="label">Manufacturer</div><div class="value">${systemInfo.cpu?.manufacturer || "-"}</div>
      <div class="label">Brand</div><div class="value">${systemInfo.cpu?.brand || "-"}</div>
      <div class="label">Cores</div><div class="value">${systemInfo.cpu?.cores ?? "-"}</div>
      <div class="label">Physical Cores</div><div class="value">${systemInfo.cpu?.physicalCores ?? "-"}</div>
      <div class="label">Speed</div><div class="value">${systemInfo.cpu?.speed ? systemInfo.cpu.speed + " GHz" : "-"}</div>
    </div>
  `;
}