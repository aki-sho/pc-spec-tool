const { SECTION_KEYS } = require("./hardware-service");

function validateExportOptions(options, allowFormat = true) {
  const allowed = allowFormat ? ["format", "includeSerial"] : ["includeSerial"];
  if (!options || typeof options !== "object" || Array.isArray(options) ||
      Object.keys(options).some((key) => !allowed.includes(key)) ||
      typeof options.includeSerial !== "boolean" ||
      (allowFormat && !["txt", "json"].includes(options.format))) {
    throw new Error("出力設定が正しくありません。");
  }
  return { format: allowFormat ? options.format : "txt", includeSerial: options.includeSerial };
}

function redact(value, includeSerial) {
  if (Array.isArray(value)) return value.map((item) => redact(item, includeSerial));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => includeSerial || !/^(serial|serialNum|serialNumber|uuid)$/i.test(key))
      .map(([key, item]) => [key, redact(item, includeSerial)]));
  }
  return value;
}

function createReport(snapshot, options, version) {
  if (!SECTION_KEYS.some((key) => snapshot[key])) throw new Error("出力できる情報がありません。先に情報を取得してください。");
  const report = { application: "PC Spec Tool", version, capturedAt: snapshot.capturedAt,
    serialNumbersIncluded: options.includeSerial, sections: snapshot.sections };
  for (const key of SECTION_KEYS) if (snapshot[key]) report[key] = redact(snapshot[key], options.includeSerial);
  if (options.format === "json") return JSON.stringify(report, null, 2) + "\n";

  const lines = ["PC Spec Tool / System report", `Version: ${version}`, `Captured: ${report.capturedAt}`,
    `Serial numbers: ${options.includeSerial ? "included" : "excluded"}`, ""];
  function append(value, prefix = "") {
    for (const [key, item] of Object.entries(value)) {
      if (Array.isArray(item)) {
        lines.push(`${prefix}${key}:`);
        item.forEach((entry, index) => { lines.push(`${prefix}  #${index + 1}`); append(entry, prefix + "    "); });
      } else if (item && typeof item === "object") {
        lines.push(`${prefix}${key}:`);
        append(item, prefix + "  ");
      } else {
        const units = { size: " (bytes)", total: " (bytes)", used: " (bytes)", available: " (bytes)",
          clockSpeed: " (MHz)", speed: " (GHz)", vram: " (MB)", use: " (%)" };
        lines.push(`${prefix}${key}${units[key] || ""}: ${String(item ?? "-").replace(/[\r\n]+/g, " ")}`);
      }
    }
  }
  for (const key of SECTION_KEYS) {
    lines.push(`[${key.toUpperCase()}]`);
    const status = snapshot.sections[key];
    if (status?.state === "error") lines.push(snapshot[key] ? "Status: previous data (refresh failed)" : "Status: unavailable");
    if (status?.updatedAt) lines.push(`Updated: ${status.updatedAt}`);
    if (report[key]) append(report[key]);
    lines.push("");
  }
  return lines.join("\r\n");
}

module.exports = { validateExportOptions, createReport };
