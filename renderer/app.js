import { cpuTemplate } from "../templates/cpu-template.js";
import { gpuTemplate } from "../templates/gpu-template.js";
import { memoryTemplate } from "../templates/memory-template.js";
import { motherboardTemplate } from "../templates/motherboard-template.js";
import { osTemplate } from "../templates/os-template.js";
import { storageTemplate } from "../templates/storage-template.js";
import { createMessageView, formatBytes } from "./spec-view.js";

const tabs = [
  ["CPU", "cpu", cpuTemplate], ["Mainboard", "mainboard", motherboardTemplate],
  ["Memory", "memory", memoryTemplate], ["Graphics", "graphics", gpuTemplate],
  ["Storage", "storage", storageTemplate], ["OS", "os", osTemplate]
];
let systemInfo = null;
let activeTab = "CPU";
let collecting = false;
let exporting = false;
let version = "";
const panel = document.querySelector(".panel");
const notice = document.querySelector("#notice");

function announce(message, error = false) {
  notice.textContent = message;
  notice.classList.toggle("is-error", error);
}

function errorMessage(error, fallback) {
  return String(error?.message || fallback).replace(/^Error invoking remote method '[^']+': (?:Error: )?/, "");
}

function setControls() {
  document.querySelector("#refresh").disabled = collecting || exporting;
  document.querySelector("#refresh").textContent = collecting ? "取得中…" : "すべて更新";
  for (const element of document.querySelectorAll(".export-control")) {
    element.disabled = collecting || exporting || !tabs.some(([, key]) => systemInfo?.[key]);
  }
  document.querySelector("#retry-failed").hidden = !Object.values(systemInfo?.sections || {}).some((item) => item.state === "error");
  document.querySelector("#retry-failed").disabled = collecting || exporting;
}

function updateSummary() {
  const summaries = {
    cpu: systemInfo?.cpu?.brand || "—",
    memory: systemInfo?.memory?.total ? formatBytes(systemInfo.memory.total, true) : "—",
    graphics: systemInfo?.graphics?.controllers?.length ? `${systemInfo.graphics.controllers.length} GPU` : "—",
    storage: systemInfo?.storage?.disks?.length ? `${systemInfo.storage.disks.length} DISKS` : "—"
  };
  for (const [key, value] of Object.entries(summaries)) document.querySelector(`#summary-${key}`).textContent = value;
  const failed = Object.values(systemInfo?.sections || {}).filter((item) => item.state === "error").length;
  const stamp = systemInfo?.capturedAt ? new Date(systemInfo.capturedAt).toLocaleTimeString("ja-JP") : "未取得";
  document.querySelector("#last-updated").textContent = `${failed ? `${failed} 項目で取得エラー · ` : ""}最終取得 ${stamp}`;
  document.querySelector("#system-state").textContent = collecting ? "SCANNING" : failed ? "PARTIAL DATA" : systemInfo ? "SYSTEM READY" : "READY";
  document.querySelector(".system-status").classList.toggle("warning", failed > 0);
}

function renderTab() {
  const config = tabs.find(([name]) => name === activeTab);
  let view;
  if (!config) {
    view = createMessageView("About", `PC Spec Tool ${version} · Windowsの構成情報を、ローカルで確認するためのツールです。`);
  } else {
    const [, key, template] = config;
    const status = systemInfo?.sections?.[key];
    view = status?.state === "error" && !systemInfo[key]
      ? createMessageView(activeTab, "この項目の情報を取得できませんでした。ほかのタブは引き続き利用できます。")
      : template(systemInfo);
    if (status?.state === "error") {
      const banner = document.createElement("div");
      banner.className = "error-banner";
      const message = document.createElement("span");
      message.textContent = systemInfo[key] ? "更新に失敗しました。前回の取得結果を表示しています。" : status.error;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "button small retry-section";
      retry.textContent = "この項目を再試行";
      retry.disabled = collecting;
      retry.addEventListener("click", () => refresh([key]));
      banner.append(message, retry);
      view.prepend(banner);
    }
  }
  panel.replaceChildren(view);
  panel.setAttribute("aria-labelledby", `tab-${activeTab}`);
}

async function refresh(sections) {
  if (collecting) return;
  collecting = true;
  announce("PCの情報を取得しています…");
  setControls();
  updateSummary();
  renderTab();
  try {
    systemInfo = await window.pcInfo.getSystemInfo(sections);
    const failed = Object.values(systemInfo.sections).filter((item) => item.state === "error").length;
    announce(failed ? `${failed} 項目を取得できませんでした。各項目から再試行できます。` : "PCの情報を更新しました。", failed > 0);
  } catch (error) {
    announce(errorMessage(error, "情報の取得に失敗しました。もう一度更新してください。"), true);
  } finally {
    collecting = false;
    setControls();
    updateSummary();
    renderTab();
  }
}

async function exportSpecs(save) {
  if (collecting || exporting) return;
  exporting = true;
  setControls();
  const includeSerial = document.querySelector("#include-serial").checked;
  try {
    if (save) {
      const result = await window.pcInfo.saveSpecs({ format: document.querySelector("#export-format").value, includeSerial });
      announce(result.canceled ? "保存をキャンセルしました。" : `${result.fileName} を保存しました。`);
    } else {
      await window.pcInfo.copySpecs({ includeSerial });
      announce(includeSerial ? "シリアル番号を含む一覧をコピーしました。" : "シリアル番号を除いた一覧をコピーしました。");
    }
  } catch (error) {
    announce(errorMessage(error, "出力に失敗しました。"), true);
  } finally {
    exporting = false;
    setControls();
  }
}

const tabButtons = [...document.querySelectorAll(".tab")];
tabButtons.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    activeTab = tab.dataset.tab;
    tabButtons.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    renderTab();
  });
  tab.addEventListener("keydown", (event) => {
    let next;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % tabButtons.length;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + tabButtons.length) % tabButtons.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabButtons.length - 1;
    if (next !== undefined) { event.preventDefault(); tabButtons[next].click(); tabButtons[next].focus(); }
  });
});
document.querySelector("#refresh").addEventListener("click", () => refresh());
document.querySelector("#retry-failed").addEventListener("click", () => refresh(Object.entries(systemInfo.sections).filter(([, value]) => value.state === "error").map(([key]) => key)));
document.querySelector("#copy").addEventListener("click", () => exportSpecs(false));
document.querySelector("#save").addEventListener("click", () => exportSpecs(true));
window.pcInfo.getAppInfo().then((info) => { version = info.version; document.querySelector("#app-version").textContent = `v${version}`; }).catch(() => {});
refresh();
