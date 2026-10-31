import { createMessageView, createSpecView } from "../renderer/spec-view.js";

export function gpuTemplate(systemInfo) {
  if (!systemInfo) {
    return createMessageView("Graphics", "読み込み中です...");
  }

  const controllers = systemInfo.graphics?.controllers || [];

  if (controllers.length === 0) {
    return createMessageView("Graphics", "GPU情報を取得できませんでした。");
  }

  const gpu = controllers[0];

  return createSpecView("Graphics", [
    ["Model", gpu.model || "-"],
    ["Vendor", gpu.vendor || "-"],
    ["VRAM", gpu.vram ? gpu.vram + " MB" : "-"],
    ["Bus", gpu.bus || "-"]
  ]);
}
