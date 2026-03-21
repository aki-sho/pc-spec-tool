export function osTemplate(systemInfo) {
  if (!systemInfo) {
    return "<h2>OS</h2><p>読み込み中です...</p>";
  }

  return `
    <h2>OS</h2>
    <div class="spec-grid">
      <div class="label">Name</div><div class="value">${systemInfo.os?.distro || "-"}</div>
      <div class="label">Release</div><div class="value">${systemInfo.os?.release || "-"}</div>
      <div class="label">Build</div><div class="value">${systemInfo.os?.build || "-"}</div>
      <div class="label">Architecture</div><div class="value">${systemInfo.os?.arch || "-"}</div>
    </div>
  `;
}