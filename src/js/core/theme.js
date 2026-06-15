/* =========================================================
   THEME
   ========================================================= */

import { dom } from "./selectors.js";
import { loadText, saveText } from "./storage.js";

export function loadTheme() {
  const savedTheme = loadText("theme", "light");

  document.body.classList.toggle("dark", savedTheme === "dark");
  document.body.classList.toggle("green", savedTheme === "green");

  dom.darkModeToggle.checked = savedTheme === "dark";
  dom.greenModeToggle.checked = savedTheme === "green";
}

export function setTheme(themeName) {
  document.body.classList.toggle("dark", themeName === "dark");
  document.body.classList.toggle("green", themeName === "green");

  dom.darkModeToggle.checked = themeName === "dark";
  dom.greenModeToggle.checked = themeName === "green";

  saveText("theme", themeName);
}

export function toggleDarkMode() {
  setTheme(dom.darkModeToggle.checked ? "dark" : "light");
}

export function toggleGreenMode() {
  setTheme(dom.greenModeToggle.checked ? "green" : "light");
}
