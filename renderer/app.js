import { cpuTemplate } from "../templates/cpu-template.js";
import { gpuTemplate } from "../templates/gpu-template.js";
import { memoryTemplate } from "../templates/memory-template.js";
import { motherboardTemplate } from "../templates/motherboard-template.js";
import { osTemplate } from "../templates/os-template.js";
import { storageTemplate } from "../templates/storage-template.js";

let systemInfo = null;

function createStaticHtml(tabName) {
  const staticData = {
    About: `<h2>About</h2><p>PC Spec Tool の試作版です。</p>`
  };

  return staticData[tabName] || "<h2>Not Found</h2>";
}

function renderTab(tabName) {
  const panel = document.querySelector(".panel");

  if (tabName === "CPU") {
    panel.innerHTML = cpuTemplate(systemInfo);
    return;
  }

  if (tabName === "Mainboard") {
    panel.innerHTML = motherboardTemplate(systemInfo);
    return;
  }

  if (tabName === "Graphics") {
    panel.innerHTML = gpuTemplate(systemInfo);
    return;
  }

  if (tabName === "Memory") {
    panel.innerHTML = memoryTemplate(systemInfo);
    return;
  }

  if (tabName === "OS") {
    panel.innerHTML = osTemplate(systemInfo);
    return;
  }

  if (tabName === "Storage") {
    panel.innerHTML = storageTemplate(systemInfo);
    return;
  }

  panel.innerHTML = createStaticHtml(tabName);
}

async function initApp() {
  const panel = document.querySelector(".panel");

  try {
    systemInfo = await window.pcInfo.getSystemInfo();
    console.log(systemInfo);
  } catch (error) {
    console.error(error);
    panel.innerHTML = `
      <h2>エラー</h2>
      <p>${error.message}</p>
    `;
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