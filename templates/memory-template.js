export function memoryTemplate(systemInfo) {
  if (!systemInfo) {
    return "<h2>Memory</h2><p>読み込み中です...</p>";
  }

  return `
    <h2>Memory</h2>
    <div class="spec-grid">
      <div class="label">Total Memory</div><div class="value">${systemInfo.memory?.totalGB || "-"} GB</div>
    </div>
  `;
}