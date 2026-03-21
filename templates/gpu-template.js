export function gpuTemplate(systemInfo) {
  if (!systemInfo) {
    return "<h2>Graphics</h2><p>読み込み中です...</p>";
  }

  const controllers = systemInfo.graphics?.controllers || [];

  if (controllers.length === 0) {
    return `
      <h2>Graphics</h2>
      <p>GPU情報を取得できませんでした。</p>
    `;
  }

  const gpu = controllers[0];

  return `
    <h2>Graphics</h2>
    <div class="spec-grid">
      <div class="label">Model</div><div class="value">${gpu.model || "-"}</div>
      <div class="label">Vendor</div><div class="value">${gpu.vendor || "-"}</div>
      <div class="label">VRAM</div><div class="value">${gpu.vram ? gpu.vram + " MB" : "-"}</div>
      <div class="label">Bus</div><div class="value">${gpu.bus || "-"}</div>
    </div>
  `;
}