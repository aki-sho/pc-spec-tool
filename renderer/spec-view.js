// Hardware values and error messages must only enter the DOM as text.
export function createMessageView(title, message) {
  const fragment = document.createDocumentFragment();
  const heading = document.createElement("h2");
  const paragraph = document.createElement("p");
  heading.textContent = title;
  paragraph.textContent = message;
  fragment.append(heading, paragraph);
  return fragment;
}

export function createSpecView(title, rows) {
  const fragment = document.createDocumentFragment();
  const heading = document.createElement("h2");
  const grid = document.createElement("div");
  heading.textContent = title;
  grid.className = "spec-grid";

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
