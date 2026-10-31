import { cpuTemplate } from "../templates/cpu-template.js";
import { gpuTemplate } from "../templates/gpu-template.js";
import { memoryTemplate } from "../templates/memory-template.js";
import { motherboardTemplate } from "../templates/motherboard-template.js";
import { osTemplate } from "../templates/os-template.js";
import { storageTemplate } from "../templates/storage-template.js";
import { createMessageView } from "./spec-view.js";

let systemInfo = null;

const tabTemplates = new Map([
  ["CPU", cpuTemplate],
  ["Mainboard", motherboardTemplate],
  ["Graphics", gpuTemplate],
  ["Memory", memoryTemplate],
  ["OS", osTemplate],
  ["Storage", storageTemplate]
]);

function renderTab(tabName) {
  const panel = document.querySelector(".panel");

  const template = tabTemplates.get(tabName);
  const view = template
    ? template(systemInfo)
    : tabName === "About"
      ? createMessageView("About", "PC Spec Tool の試作版です。")
      : createMessageView("Not Found", "");
  panel.replaceChildren(view);
}

async function initApp() {
  const panel = document.querySelector(".panel");

  try {
    systemInfo = await window.pcInfo.getSystemInfo();
  } catch (error) {
    console.error(error);
    panel.replaceChildren(createMessageView("エラー", error.message));
    return;
  }

  const tabs = document.querySelectorAll(".tab");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      renderTab(tab.dataset.tab);
    });
  });

  renderTab("CPU");
}

initApp();
