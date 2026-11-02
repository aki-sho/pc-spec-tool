// Hardware values and error messages must only enter the DOM as text.
export function createMessageView(title, message) {
  const fragment = document.createDocumentFragment();
  const heading = document.createElement("h2");
  const paragraph = document.createElement("p");
  heading.textContent = title;
  paragraph.textContent = message;
  paragraph.className = "empty-message";
  fragment.append(heading, paragraph);
  return fragment;
}

export function createSpecView(title, rows) {
  const fragment = document.createDocumentFragment();
  const heading = document.createElement("h2");
  const grid = document.createElement("div");
  heading.textContent = title;
  grid.className = "spec-grid";
  heading.className = "section-title";

  for (const [label, value] of rows) {
    const labelElement = document.createElement("div");
    const valueElement = document.createElement("div");
    labelElement.className = "label";
    valueElement.className = "value";
    labelElement.textContent = label;
    valueElement.textContent = value;
    grid.append(labelElement, valueElement);
  }

  fragment.append(heading, grid);
  return fragment;
}

export function formatBytes(value, binary = false) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  const base = binary ? 1024 : 1000;
  const units = binary ? ["B", "KiB", "MiB", "GiB", "TiB"] : ["B", "KB", "MB", "GB", "TB"];
  const size = Math.max(0, Number(value));
  const index = size ? Math.max(0, Math.min(Math.floor(Math.log(size) / Math.log(base)), units.length - 1)) : 0;
  return `${(size / base ** index).toLocaleString("ja-JP", { maximumFractionDigits: 2 })} ${units[index]}`;
}

export function createCard(title, rows, badge) {
  const card = document.createElement("article");
  card.className = "spec-card";
  const header = document.createElement("div");
  header.className = "card-header";
  const heading = document.createElement("h3");
  heading.textContent = title;
  header.append(heading);
  if (badge) {
    const tag = document.createElement("span");
    tag.className = "badge";
    tag.textContent = badge;
    header.append(tag);
  }
  card.append(header);
  const content = createSpecView("", rows);
  content.querySelector("h2").remove();
  card.append(content);
  return card;
}

export function createCardPage(title, description, cards) {
  const fragment = createMessageView(title, description);
  fragment.querySelector("h2").className = "section-title";
  fragment.querySelector("p").className = "section-description";
  const list = document.createElement("div");
  list.className = "card-list";
  list.append(...cards);
  fragment.append(list);
  return fragment;
}
