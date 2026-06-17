const ALLOWED_TAGS = new Set([
  "B",
  "BR",
  "DIV",
  "EM",
  "FONT",
  "I",
  "INPUT",
  "LABEL",
  "LI",
  "OL",
  "P",
  "S",
  "SPAN",
  "STRIKE",
  "STRONG",
  "U",
  "UL"
]);

const DROP_WITH_CONTENT = new Set([
  "IFRAME",
  "MATH",
  "OBJECT",
  "SCRIPT",
  "STYLE",
  "SVG",
  "TEMPLATE"
]);

function isSafeColor(value) {
  return /^#[0-9a-f]{3,8}$/i.test(value)
    || /^(rgb|hsl)a?\([\d\s.,%+-]+\)$/i.test(value)
    || /^[a-z]+$/i.test(value);
}

function copySafeStyles(source, target) {
  const color = source.style.color;
  const fontSize = source.style.fontSize;
  const fontFamily = source.style.fontFamily;
  const fontWeight = source.style.fontWeight;
  const fontStyle = source.style.fontStyle;
  const textDecoration = source.style.textDecoration;
  const lineHeight = source.style.lineHeight;
  const textAlign = source.style.textAlign;

  if (color && isSafeColor(color)) target.style.color = color;
  if (fontSize && /^\d+(\.\d+)?(px|em|rem|%)$/i.test(fontSize)) {
    target.style.fontSize = fontSize;
  }
  if (fontFamily && /^[\w\s,"'-]+$/i.test(fontFamily)) {
    target.style.fontFamily = fontFamily;
  }
  if (fontWeight && /^(normal|bold|[1-9]00)$/i.test(fontWeight)) {
    target.style.fontWeight = fontWeight;
  }
  if (fontStyle && /^(normal|italic|oblique)$/i.test(fontStyle)) {
    target.style.fontStyle = fontStyle;
  }
  if (textDecoration && /^(none|underline|line-through)(\s+(underline|line-through))*$/i.test(textDecoration)) {
    target.style.textDecoration = textDecoration;
  }
  if (lineHeight && /^([1-2](\.\d{1,2})?|normal)$/i.test(lineHeight)) {
    target.style.lineHeight = lineHeight;
  }
  if (textAlign && /^(left|center|right|justify)$/i.test(textAlign)) {
    target.style.textAlign = textAlign;
  }
}

function sanitizeNode(node, outputParent) {
  if (node.nodeType === Node.TEXT_NODE) {
    outputParent.appendChild(document.createTextNode(node.textContent || ""));
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const tagName = node.tagName.toUpperCase();

  if (DROP_WITH_CONTENT.has(tagName)) return;

  if (!ALLOWED_TAGS.has(tagName)) {
    [...node.childNodes].forEach(child => sanitizeNode(child, outputParent));
    return;
  }

  if (tagName === "INPUT") {
    if (node.getAttribute("type") !== "checkbox") return;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    if (node.classList.contains("note-checklist-checkbox")) {
      checkbox.className = "note-checklist-checkbox";
    }
    checkbox.checked = node.checked || node.hasAttribute("checked");
    if (checkbox.checked) checkbox.setAttribute("checked", "");
    outputParent.appendChild(checkbox);
    return;
  }

  const cleanNode = document.createElement(tagName.toLowerCase());

  if ((tagName === "DIV" || tagName === "LABEL") && node.classList.contains("note-checklist-item")) {
    cleanNode.className = "note-checklist-item";
  }

  if (tagName === "SPAN" && node.getAttribute("contenteditable") === "true") {
    cleanNode.contentEditable = "true";
    cleanNode.dataset.placeholder = "Digite aqui...";
  }

  if (tagName === "FONT") {
    const color = node.getAttribute("color");
    const face = node.getAttribute("face");

    if (color && isSafeColor(color)) cleanNode.setAttribute("color", color);
    if (face && /^[\w\s,"'-]+$/i.test(face)) cleanNode.setAttribute("face", face);
  }

  copySafeStyles(node, cleanNode);
  [...node.childNodes].forEach(child => sanitizeNode(child, cleanNode));
  outputParent.appendChild(cleanNode);
}

export function sanitizeNotesHtml(html) {
  const template = document.createElement("template");
  const output = document.createElement("div");

  template.innerHTML = typeof html === "string" ? html : "";
  [...template.content.childNodes].forEach(node => sanitizeNode(node, output));

  return output.innerHTML;
}
