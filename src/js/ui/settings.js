/* =========================================================
   SETTINGS
   ========================================================= */

import { dom } from "../core/selectors.js";
import { state } from "../core/state.js";
import { saveData } from "../core/storage.js";

export function toggleSettingsMenu(event) {
  event.stopPropagation();

  if (dom.categoryPanel.classList.contains("open")) return;

  const isOpen = dom.settingsPanel.classList.toggle("open");
  dom.settingsPanel.setAttribute("aria-hidden", String(!isOpen));
}

export function closeSettingsMenu() {
  dom.settingsPanel.classList.remove("open");
  dom.settingsPanel.setAttribute("aria-hidden", "true");
}

export function closeSettingsOnOutsideClick(event) {
  const clickedInsideMenu = dom.settingsPanel.contains(event.target);
  const clickedSettingsButton = dom.settingsButton.contains(event.target);

  if (!clickedInsideMenu && !clickedSettingsButton) {
    closeSettingsMenu();
  }
}

export function toggleSettingsSection(button, content) {
  const isAlreadyOpen = content.classList.contains("open");

  const sections = [
    [dom.profileToggle, dom.profileContent],
    [dom.securityToggle, dom.securityContent],
    [dom.appearanceToggle, dom.appearanceContent],
    [dom.preferencesToggle, dom.preferencesContent],
    [dom.suggestionsToggle, dom.suggestionsContent]
  ];

  sections.forEach(([sectionButton, sectionContent]) => {
    sectionButton.setAttribute("aria-expanded", "false");
    sectionContent.classList.remove("open", "section-divider-active");
  });

  if (!isAlreadyOpen) {
    content.classList.add("open", "section-divider-active");
    button.setAttribute("aria-expanded", "true");
  }
}

export function toggleSecuritySubsection(button, content) {
  const isAlreadyOpen = content.classList.contains("open");
  const sections = [
    [dom.passwordSettingsToggle, dom.passwordSettingsContent],
    [dom.deleteAccountSettingsToggle, dom.deleteAccountSettingsContent]
  ];

  sections.forEach(([sectionButton, sectionContent]) => {
    sectionButton.setAttribute("aria-expanded", "false");
    sectionContent.classList.remove("open");
  });

  if (!isAlreadyOpen) {
    content.classList.add("open");
    button.setAttribute("aria-expanded", "true");
  }
}

export function loadPreferencesControls() {
  dom.hideDoneToggle.checked = state.preferences.hideCompleted;
  dom.confirmDeleteToggle.checked = state.preferences.confirmDelete;
  dom.carryIncompleteToggle.checked = state.preferences.carryIncomplete;
  dom.blockNotificationsToggle.checked = state.preferences.blockNotifications;
}

export function updatePreference(key, value) {
  state.preferences[key] = value;
  saveData("preferences", state.preferences);
}

export function logout() {
  closeSettingsMenu();
}
