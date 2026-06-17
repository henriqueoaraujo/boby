/* =========================================================
   APP
   ---------------------------------------------------------
   Ponto de entrada do sistema.
   Aqui apenas conectamos eventos e inicializamos os módulos.
   ========================================================= */

import { dom } from "./core/selectors.js";
import { state } from "./core/state.js";
import { loadTheme, toggleDarkMode, toggleGreenMode } from "./core/theme.js";
import {
  closeSettingsMenu,
  closeSettingsOnOutsideClick,
  loadPreferencesControls,
  logout,
  toggleSettingsMenu,
  toggleSettingsSection,
  toggleSecuritySubsection,
  updatePreference
} from "./ui/settings.js";
import { resetGreetingAnimation, runGreetingAnimation, runHeadlineAnimation } from "./ui/animations.js";
import {
  initializeAuth,
  loadAuthProviderAvailability,
  onAuthChange,
  resendSignupConfirmation,
  deleteUserAccount,
  signInWithEmail,
  signInWithProvider,
  resetPassword,
  signOut,
  signUpWithEmail,
  updateUserPassword,
  updateUserProfile
} from "./repositories/authRepository.js";
import {
  flushCategorySyncQueue,
  loadCategories,
  persistCategories
} from "./repositories/categoriesRepository.js";
import {
  deleteTaskFromBackend,
  flushTaskSyncQueue,
  loadTasks,
  persistTasks
} from "./repositories/tasksRepository.js";
import {
  clearAuthPasswords,
  clearAuthErrors,
  closeAuthPanel,
  getAuthCredentials,
  renderAuthState,
  refreshAuthCaptcha,
  setAuthMode,
  setAuthBusy,
  setAuthStatus,
  showResendConfirmation,
  togglePasswordVisibility,
  updateOfflineState,
  validateCurrentAuthForm
} from "./ui/authModal.js";

import {
  addTask,
  clearSearch,
  renderTasks,
  toggleSearchInput,
  toggleTaskInput,
  updateCompletedDateFilter,
  updateSearchCategory,
  updateSearchTerm,
  closeDeleteConfirmation,
  closeDeleteConfirmationOnBackdrop,
  closeTaskNotes,
  closeTaskNotesOnBackdrop,
  confirmPendingTaskDeletion,
  formatTaskNote,
  handleNotesEditorKeydown,
  saveActiveTaskNotes,
  saveNotesSelection
  ,
  closeTaskEditor,
  closeTaskEditorOnBackdrop,
  saveTaskEdits,
  toggleTaskExtraField,
  setAgendaFilter,
  setDueDateFilter,
  toggleRecurrenceOptions,
  updateRecurrenceMode,
  applyRecurrencePreset,
  updateRecurrenceSummary,
  carryIncompleteToDate
} from "./features/tasks.js";
import {
  addDraftCategory,
  closeCategoryPanel,
  closeCategoryPanelOnBackdrop,
  openCategoryPanel,
  renderCategoryFilters,
  renderCategorySelect
} from "./features/categories.js";
import { runAssistantCommand } from "./features/assistant.js";
import {
  closeNotificationsPanel,
  closeNotificationsPanelOnBackdrop,
  initializeReminders,
  openNotificationsPanel,
  renderNotificationsPanel,
  requestReminderPermission
} from "./features/reminders.js";
import { initializeSyncStatus, renderSyncStatus } from "./ui/syncStatus.js";
import { alertUser, closePageNotice, playAlertSound, unlockAlertSound } from "./ui/pageAlerts.js";
import {
  closeCalendar,
  closeCalendarOnBackdrop,
  goToToday,
  openCalendar,
  renderWeekCalendar,
  setHomeCalendarView,
  setCalendarView,
  toggleCalendarPeriodPicker,
  showNextCalendarPeriod,
  showNextWeek,
  showPreviousCalendarPeriod,
  showPreviousWeek
} from "./features/calendar.js";
import {
  initializeWeather,
  updateWeatherForCity
} from "./features/weather.js";
import { getTodayKey } from "./core/taskRules.js";
import {
  applyStaticTranslations,
  getLanguage,
  setLanguage,
  t
} from "./core/i18n.js";
import {
  applyBackupPayload,
  createAutomaticSnapshot,
  exportCurrentBackup,
  getLatestSnapshot,
  readBackupFile
} from "./core/backup.js";
import { loadData, saveData } from "./core/storage.js";
import { initializeMonitoring, reportError } from "./core/monitoring.js";

dom.addTaskButton.addEventListener("click", addTask);

dom.taskInput.addEventListener("keydown", event => {
  if (event.key === "Enter") addTask();
});

dom.openTaskInputButton.addEventListener("click", toggleTaskInput);

dom.openSearchButton.addEventListener("click", toggleSearchInput);

dom.searchInput.addEventListener("input", event => {
  updateSearchTerm(event.target.value);
});

dom.searchCategoryInput.addEventListener("change", event => {
  updateSearchCategory(event.target.value);
});

dom.searchCompletedDateInput.addEventListener("change", event => {
  updateCompletedDateFilter(event.target.value);
});

dom.clearSearchButton.addEventListener("click", clearSearch);

dom.settingsButton.addEventListener("click", toggleSettingsMenu);
document.addEventListener("click", closeSettingsOnOutsideClick);

dom.profileToggle.addEventListener("click", () => {
  toggleSettingsSection(dom.profileToggle, dom.profileContent);
});

dom.securityToggle.addEventListener("click", () => {
  toggleSettingsSection(dom.securityToggle, dom.securityContent);
});

dom.passwordSettingsToggle.addEventListener("click", () => {
  toggleSecuritySubsection(dom.passwordSettingsToggle, dom.passwordSettingsContent);
});

dom.deleteAccountSettingsToggle.addEventListener("click", () => {
  toggleSecuritySubsection(dom.deleteAccountSettingsToggle, dom.deleteAccountSettingsContent);
});

dom.appearanceToggle.addEventListener("click", () => {
  toggleSettingsSection(dom.appearanceToggle, dom.appearanceContent);
});

dom.preferencesToggle.addEventListener("click", () => {
  toggleSettingsSection(dom.preferencesToggle, dom.preferencesContent);
});

dom.suggestionsToggle.addEventListener("click", () => {
  toggleSettingsSection(dom.suggestionsToggle, dom.suggestionsContent);
});

dom.logoutButton.addEventListener("click", async () => {
  setAuthStatus("");
  resetAuthenticatedAppRuntime();
  await signOut();
  renderAuthState();
  closeSettingsMenu();
});

let pendingProfilePhoto = "";

function resizeProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      image.src = reader.result;
    });
    reader.addEventListener("error", reject);
    image.addEventListener("load", () => {
      const canvas = document.createElement("canvas");
      const size = 256;
      const scale = Math.max(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;

      canvas.width = size;
      canvas.height = size;
      canvas.getContext("2d").drawImage(
        image,
        (size - width) / 2,
        (size - height) / 2,
        width,
        height
      );
      resolve(canvas.toDataURL("image/jpeg", .82));
    });
    image.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

dom.profilePhotoInput.addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 6 * 1024 * 1024) {
    dom.profileStatus.textContent = getLanguage() === "en"
      ? "Choose an image up to 6 MB."
      : getLanguage() === "es" ? "Elige una imagen de hasta 6 MB." : "Escolha uma imagem de até 6 MB.";
    dom.profileStatus.dataset.type = "error";
    return;
  }

  try {
    pendingProfilePhoto = await resizeProfilePhoto(file);
    dom.profileAvatar.replaceChildren();
    const image = document.createElement("img");
    image.src = pendingProfilePhoto;
    image.alt = "";
    dom.profileAvatar.appendChild(image);
    dom.profileStatus.textContent = t("photoReady");
    dom.profileStatus.dataset.type = "success";
  } catch {
    dom.profileStatus.textContent = getLanguage() === "en"
      ? "This image could not be processed."
      : getLanguage() === "es" ? "No se pudo procesar esta imagen." : "Não foi possível processar esta imagem.";
    dom.profileStatus.dataset.type = "error";
  }
});

dom.profileForm.addEventListener("submit", async event => {
  event.preventDefault();
  dom.saveProfileButton.disabled = true;
  dom.profileStatus.textContent = t("saving");
  dom.profileStatus.dataset.type = "";

  const result = await updateUserProfile(
    dom.profileNameInput.value,
    dom.profileBirthDateInput.value,
    dom.profileCityInput.value,
    pendingProfilePhoto
  );

  dom.saveProfileButton.disabled = false;
  dom.profileStatus.textContent = result.message;
  dom.profileStatus.dataset.type = result.ok ? "success" : "error";
  if (result.ok) {
    pendingProfilePhoto = "";
    renderAuthState();
    await updateWeatherForCity(dom.profileCityInput.value);
  }
});

dom.updatePasswordButton.addEventListener("click", async () => {
  dom.updatePasswordButton.disabled = true;
  dom.securityStatus.textContent = t("updatingPassword");
  dom.securityStatus.dataset.type = "";

  const result = await updateUserPassword(
    dom.profileCurrentPasswordInput.value,
    dom.profilePasswordInput.value,
    dom.profileConfirmPasswordInput.value
  );

  dom.updatePasswordButton.disabled = false;
  dom.securityStatus.textContent = result.message;
  dom.securityStatus.dataset.type = result.ok ? "success" : "error";

  if (result.ok) {
    dom.profileCurrentPasswordInput.value = "";
    dom.profilePasswordInput.value = "";
    dom.profileConfirmPasswordInput.value = "";
  }
});

dom.sendRecoveryButton.addEventListener("click", async () => {
  dom.sendRecoveryButton.disabled = true;
  const result = await resetPassword(state.session.user?.email || "");
  dom.sendRecoveryButton.disabled = false;
  dom.securityStatus.textContent = result.message;
  dom.securityStatus.dataset.type = result.ok ? "success" : "error";
});

dom.deleteAccountButton.addEventListener("click", async () => {
  dom.deleteAccountButton.disabled = true;
  dom.securityStatus.textContent = "Excluindo conta...";
  dom.securityStatus.dataset.type = "";

  const result = await deleteUserAccount(
    dom.deleteAccountPasswordInput.value,
    dom.deleteAccountConfirmationInput.value
  );

  dom.deleteAccountButton.disabled = false;
  dom.securityStatus.textContent = result.message;
  dom.securityStatus.dataset.type = result.ok ? "success" : "error";

  if (result.ok) {
    dom.deleteAccountPasswordInput.value = "";
    dom.deleteAccountConfirmationInput.value = "";
    renderAuthState();
    closeSettingsMenu();
  }
});

async function persistRestoredBackup(payload) {
  createAutomaticSnapshot();
  const previousTaskIds = new Set(state.tasks.map(task => task.id));
  applyBackupPayload(payload);
  const restoredTaskIds = new Set(state.tasks.map(task => task.id));
  saveData("preferences", state.preferences);
  await persistCategories();
  await Promise.all(
    [...previousTaskIds]
      .filter(taskId => !restoredTaskIds.has(taskId))
      .map(taskId => deleteTaskFromBackend(taskId))
  );
  await persistTasks();
  loadPreferencesControls();
  renderCategorySelect();
  renderCategoryFilters();
  renderWeekCalendar();
  renderTasks();
}

dom.exportDataButton.addEventListener("click", () => {
  createAutomaticSnapshot();
  exportCurrentBackup();
  dom.dataManagementStatus.textContent = "Backup exportado.";
  dom.dataManagementStatus.dataset.type = "success";
});

dom.importDataInput.addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const payload = await readBackupFile(file);
    await persistRestoredBackup(payload);
    dom.dataManagementStatus.textContent = "Backup importado com sucesso.";
    dom.dataManagementStatus.dataset.type = "success";
  } catch (error) {
    reportError(error, { feature: "backup-import" });
    dom.dataManagementStatus.textContent = error.message || "Não foi possível importar o backup.";
    dom.dataManagementStatus.dataset.type = "error";
  } finally {
    event.target.value = "";
  }
});

dom.restoreSnapshotButton.addEventListener("click", async () => {
  const snapshot = getLatestSnapshot();
  if (!snapshot) {
    dom.dataManagementStatus.textContent = "Nenhuma cópia local disponível.";
    dom.dataManagementStatus.dataset.type = "error";
    return;
  }

  await persistRestoredBackup(snapshot);
  dom.dataManagementStatus.textContent = "Cópia local restaurada.";
  dom.dataManagementStatus.dataset.type = "success";
});

dom.darkModeToggle.addEventListener("change", toggleDarkMode);
dom.greenModeToggle.addEventListener("change", toggleGreenMode);

dom.hideDoneToggle.addEventListener("change", event => {
  updatePreference("hideCompleted", event.target.checked);
  renderTasks();
});

dom.confirmDeleteToggle.addEventListener("change", event => {
  updatePreference("confirmDelete", event.target.checked);
});

dom.languageSelect.addEventListener("change", async event => {
  setLanguage(event.target.value);
  await setAuthMode("login");
  renderAuthState();
  renderCategorySelect();
  renderCategoryFilters();
  renderWeekCalendar();
  renderTasks();
  initializeReminders();
});

dom.carryIncompleteToggle.addEventListener("change", event => {
  updatePreference("carryIncomplete", event.target.checked);
  if (event.target.checked) {
    goToToday();
    carryIncompleteToDate(getTodayKey());
  }
});

dom.blockNotificationsToggle.addEventListener("change", event => {
  updatePreference("blockNotifications", event.target.checked);
  renderNotificationsPanel();
});

document.addEventListener("pointerdown", unlockAlertSound, { once: true });
dom.enableNotificationsButton.addEventListener("click", requestReminderPermission);
dom.closePageNoticeButton.addEventListener("click", closePageNotice);
dom.openNotificationsPanelButton.addEventListener("click", openNotificationsPanel);
dom.closeNotificationsPanelButton.addEventListener("click", closeNotificationsPanel);
dom.notificationsPanel.addEventListener("click", closeNotificationsPanelOnBackdrop);
dom.openPomodoroPanelButton.addEventListener("click", openPomodoroPanel);
dom.closePomodoroPanelButton.addEventListener("click", closePomodoroPanel);
dom.pomodoroPanel.addEventListener("click", closePomodoroPanelOnBackdrop);
dom.pomodoroFocusButton.addEventListener("click", () => setPomodoroMode("focus", "Foco por {minutes} minutos. Bora domar a lista."));
dom.pomodoroShortBreakButton.addEventListener("click", () => setPomodoroMode("short", "Pausa de {minutes} minutos. O foco também respira."));
dom.pomodoroLongBreakButton.addEventListener("click", () => setPomodoroMode("long", "Pausa longa de {minutes} minutos. Recarregando o cérebro."));
dom.startPomodoroButton.addEventListener("click", togglePomodoroTimer);
dom.resetPomodoroButton.addEventListener("click", resetPomodoroTimer);
dom.togglePomodoroSettingsButton.addEventListener("click", togglePomodoroSettingsPanel);
dom.pomodoroSoundSelect.addEventListener("change", updatePomodoroSoundSettings);
dom.pomodoroVolumeInput.addEventListener("input", updatePomodoroSoundSettings);
dom.previewPomodoroSoundButton.addEventListener("click", previewPomodoroSound);
[dom.pomodoroFocusMinutesInput, dom.pomodoroShortBreakMinutesInput, dom.pomodoroLongBreakMinutesInput].forEach(input => {
  input.addEventListener("input", updatePomodoroDurations);
});

dom.recurrenceEnabledInput.addEventListener("change", toggleRecurrenceOptions);
dom.recurrenceModeInputs.forEach(input => {
  input.addEventListener("change", updateRecurrenceMode);
});
dom.recurrencePresetButtons.forEach(button => {
  button.addEventListener("click", () => {
    applyRecurrencePreset(button.dataset.weekdayPreset);
  });
});
dom.recurrenceEndDateInput.addEventListener("change", updateRecurrenceSummary);
dom.recurrenceMonthlyDayInput.addEventListener("input", updateRecurrenceSummary);
dom.recurrenceWeekdayInputs.forEach(input => {
  input.addEventListener("change", () => {
    dom.recurrencePresetButtons.forEach(button => button.classList.remove("active"));
    updateRecurrenceSummary();
  });
});
dom.dueDateInput.addEventListener("change", event => {
  if (event.target.value) {
    setDueDateFilter(event.target.value);
    if (dom.recurrenceEnabledInput.checked) toggleRecurrenceOptions();
  }
});

dom.openCalendarButton.addEventListener("click", openCalendar);
dom.dayAgendaViewButton.addEventListener("click", () => setHomeCalendarView("day"));
dom.weekAgendaViewButton.addEventListener("click", () => setHomeCalendarView("week"));
dom.monthAgendaViewButton.addEventListener("click", () => setHomeCalendarView("month"));
dom.previousWeekButton.addEventListener("click", showPreviousWeek);
dom.nextWeekButton.addEventListener("click", showNextWeek);
dom.goToTodayButton.addEventListener("click", goToToday);
dom.calendarPanel.addEventListener("click", closeCalendarOnBackdrop);
dom.closeCalendarButton.addEventListener("click", closeCalendar);
dom.previousCalendarPeriodButton.addEventListener("click", showPreviousCalendarPeriod);
dom.nextCalendarPeriodButton.addEventListener("click", showNextCalendarPeriod);
dom.calendarMonthViewButton.addEventListener("click", () => setCalendarView("months"));
dom.calendarYearViewButton.addEventListener("click", () => setCalendarView("years"));
dom.calendarPeriodButton.addEventListener("click", toggleCalendarPeriodPicker);
dom.syncStatus.addEventListener("click", flushPendingSync);

window.addEventListener("boby:date-change", event => {
  setDueDateFilter(event.detail.date);
});

dom.runAssistantCommandButton.addEventListener("click", runAssistantCommand);
dom.assistantCommandInput.addEventListener("keydown", event => {
  if (event.key === "Enter") runAssistantCommand();
});

dom.taskEditPanel.addEventListener("click", closeTaskEditorOnBackdrop);
dom.closeTaskEditButton.addEventListener("click", closeTaskEditor);
dom.cancelTaskEditButton.addEventListener("click", closeTaskEditor);
dom.toggleTaskReminderButton.addEventListener("click", () => toggleTaskExtraField("reminder"));
dom.toggleTaskLocationButton.addEventListener("click", () => toggleTaskExtraField("location"));
dom.taskEditForm.addEventListener("submit", event => {
  event.preventDefault();
  saveTaskEdits();
});


dom.confirmDeletePanel.addEventListener("click", closeDeleteConfirmationOnBackdrop);
dom.cancelDeleteTaskButton.addEventListener("click", closeDeleteConfirmation);
dom.confirmDeleteTaskButton.addEventListener("click", confirmPendingTaskDeletion);

dom.taskNotesPanel.addEventListener("click", closeTaskNotesOnBackdrop);

dom.closeTaskNotesButton.addEventListener("click", closeTaskNotes);

dom.taskNotesEditor.addEventListener("input", () => {
  saveNotesSelection();
  saveActiveTaskNotes();
});

dom.taskNotesEditor.addEventListener("change", event => {
  if (!event.target.matches("input[type='checkbox']")) return;
  saveNotesSelection();
  saveActiveTaskNotes();
});

dom.taskNotesEditor.addEventListener("mouseup", saveNotesSelection);
dom.taskNotesEditor.addEventListener("keyup", saveNotesSelection);
dom.taskNotesEditor.addEventListener("keydown", handleNotesEditorKeydown);

document.querySelectorAll(".notes-toolbar button, .notes-color-option").forEach(button => {
  button.addEventListener("mousedown", event => {
    event.preventDefault();
  });
});

document.querySelectorAll(".notes-toolbar [data-command]").forEach(button => {
  button.addEventListener("click", () => {
    formatTaskNote(button.dataset.command);
  });
});

dom.notesFontName.addEventListener("change", event => {
  formatTaskNote("fontName", event.target.value);
});

dom.notesFontSize.addEventListener("change", event => {
  formatTaskNote("fontSizePx", event.target.value);
});

dom.notesLineHeight.addEventListener("change", event => {
  formatTaskNote("lineHeight", event.target.value);
});

dom.notesChecklistButton.addEventListener("click", () => {
  formatTaskNote("checklist");
});

function applyNoteColor(color) {
  dom.notesCurrentColor.style.setProperty("--current-note-color", color);
  formatTaskNote("foreColor", color);
  dom.notesColorPopover.classList.remove("open");
  dom.notesColorPopover.setAttribute("aria-hidden", "true");
}

dom.notesColorToggle.addEventListener("click", event => {
  event.stopPropagation();
  dom.notesColorPopover.classList.toggle("open");
  dom.notesColorPopover.setAttribute(
    "aria-hidden",
    String(!dom.notesColorPopover.classList.contains("open"))
  );
});

document.querySelectorAll(".notes-color-option").forEach(button => {
  button.addEventListener("click", () => {
    applyNoteColor(button.dataset.color);
  });
});

dom.notesTextColor.addEventListener("change", event => {
  applyNoteColor(event.target.value);
});

document.addEventListener("click", event => {
  const clickedInsideColorMenu = dom.notesColorPopover.contains(event.target);
  const clickedColorButton = dom.notesColorToggle.contains(event.target);

  if (!clickedInsideColorMenu && !clickedColorButton) {
    dom.notesColorPopover.classList.remove("open");
    dom.notesColorPopover.setAttribute("aria-hidden", "true");
  }
});

dom.authLoginTab.addEventListener("click", () => setAuthMode("login"));
dom.authSignupTab.addEventListener("click", () => setAuthMode("signup"));
[
  dom.authEmailInput,
  dom.authNameInput,
  dom.authBirthDateInput,
  dom.authPasswordInput,
  dom.authConfirmPasswordInput,
  dom.authCaptchaInput
].forEach(input => {
  input.addEventListener("input", () => {
    clearAuthErrors();
    setAuthStatus("");
  });
});

dom.authPasswordToggle.addEventListener("click", () => {
  togglePasswordVisibility(dom.authPasswordInput, dom.authPasswordToggle);
});

dom.authConfirmPasswordToggle.addEventListener("click", () => {
  togglePasswordVisibility(
    dom.authConfirmPasswordInput,
    dom.authConfirmPasswordToggle
  );
});

dom.authCaptchaRefreshButton.addEventListener("click", refreshAuthCaptcha);

dom.authForm.addEventListener("submit", async event => {
  event.preventDefault();
  clearAuthErrors();
  const validation = validateCurrentAuthForm();
  if (!validation.valid) {
    setAuthStatus("Revise os campos destacados.", "error");
    return;
  }

  const credentials = getAuthCredentials();
  setAuthBusy(true);
  setAuthStatus("");

  const result = credentials.mode === "signup"
    ? await signUpWithEmail(
        credentials.email,
        credentials.password,
        credentials.confirmPassword,
        credentials.remember,
        credentials.captchaAnswer,
        credentials.expectedCaptchaAnswer,
        credentials.name,
        credentials.birthDate
      )
    : await signInWithEmail(
        credentials.email,
        credentials.password,
        credentials.remember
      );

  clearAuthPasswords();
  setAuthBusy(false);

  if (!result.ok) {
    if (credentials.mode === "signup") refreshAuthCaptcha();
    showResendConfirmation(result.code === "email_not_confirmed");
    setAuthStatus(result.message, "error");
    return;
  }

  if (!result.session) {
    await setAuthMode("login");
    setAuthStatus(result.message, "success");
    return;
  }

  setAuthStatus("Acesso realizado.", "success");
  renderAuthState();
  await initializeAuthenticatedApp();
});

dom.authResetPasswordButton.addEventListener("click", async () => {
  setAuthBusy(true);
  const { email } = getAuthCredentials();
  const result = await resetPassword(email);
  setAuthStatus(result.message, result.ok ? "success" : "error");
  setAuthBusy(false);
});

async function handleProviderLogin(provider, label) {
  setAuthBusy(true);
  setAuthStatus("");
  const result = await signInWithProvider(provider, true);
  setAuthStatus(
    result.ok ? `Redirecionando para ${label}...` : result.message,
    result.ok ? "success" : "error"
  );
  if (!result.ok) setAuthBusy(false);
}

dom.authGoogleButton.addEventListener("click", () => handleProviderLogin("google", "Google"));
dom.authGithubButton.addEventListener("click", () => handleProviderLogin("github", "GitHub"));
dom.authLinkedinButton.addEventListener("click", () => {
  handleProviderLogin("linkedin_oidc", "LinkedIn");
});

dom.authResendButton.addEventListener("click", async () => {
  setAuthBusy(true);
  const { email } = getAuthCredentials();
  const result = await resendSignupConfirmation(email);
  setAuthStatus(result.message, result.ok ? "success" : "error");
  setAuthBusy(false);
});

dom.openCategorySettingsButton.addEventListener("click", openCategoryPanel);
dom.categoryPanel.addEventListener("click", closeCategoryPanelOnBackdrop);

dom.closeCategoryPanelButton.addEventListener("click", event => {
  event.preventDefault();
  event.stopPropagation();
  closeCategoryPanel();
});

dom.addCategoryButton.addEventListener("click", addDraftCategory);

dom.newCategoryInput.addEventListener("keydown", event => {
  if (event.key === "Enter") addDraftCategory();
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;

  closeCategoryPanel();
  closeSettingsMenu();
  closeTaskNotes();
  closeDeleteConfirmation();
  closeTaskEditor();
  closeCalendar();
  closeNotificationsPanel();
  closePomodoroPanel();
});

const POMODORO_MODES = {
  focus: {
    button: () => dom.pomodoroFocusButton,
    input: () => dom.pomodoroFocusMinutesInput,
    template: "Foco por {minutes} minutos. Bora domar a lista."
  },
  short: {
    button: () => dom.pomodoroShortBreakButton,
    input: () => dom.pomodoroShortBreakMinutesInput,
    template: "Pausa de {minutes} minutos. O foco também respira."
  },
  long: {
    button: () => dom.pomodoroLongBreakButton,
    input: () => dom.pomodoroLongBreakMinutesInput,
    template: "Pausa longa de {minutes} minutos. Recarregando o cérebro."
  }
};
const DEFAULT_POMODORO_SETTINGS = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sound: "pomodoro",
  volume: 70
};
let pomodoroSettings = {
  ...DEFAULT_POMODORO_SETTINGS,
  ...loadData("pomodoro-settings", DEFAULT_POMODORO_SETTINGS)
};
let activePomodoroMode = "focus";
let pomodoroTotalSeconds = 25 * 60;
let pomodoroRemainingSeconds = pomodoroTotalSeconds;
let pomodoroIntervalId = 0;
let pomodoroRunning = false;

function clampNumber(value, min, max, fallback = min) {
  const numeric = Math.round(Number(value));
  return Math.min(max, Math.max(min, Number.isFinite(numeric) ? numeric : fallback));
}

function normalizePomodoroSettings(settings) {
  const safeSettings = settings && typeof settings === "object"
    ? settings
    : DEFAULT_POMODORO_SETTINGS;

  return {
    focusMinutes: clampNumber(safeSettings.focusMinutes, 1, 180, DEFAULT_POMODORO_SETTINGS.focusMinutes),
    shortBreakMinutes: clampNumber(safeSettings.shortBreakMinutes, 1, 60, DEFAULT_POMODORO_SETTINGS.shortBreakMinutes),
    longBreakMinutes: clampNumber(safeSettings.longBreakMinutes, 1, 120, DEFAULT_POMODORO_SETTINGS.longBreakMinutes),
    sound: ["pomodoro", "focus-pop", "soft-bell", "double-tap", "rise", "calm"].includes(safeSettings.sound)
      ? safeSettings.sound
      : DEFAULT_POMODORO_SETTINGS.sound,
    volume: clampNumber(safeSettings.volume, 0, 100, DEFAULT_POMODORO_SETTINGS.volume)
  };
}

function savePomodoroSettings() {
  pomodoroSettings = normalizePomodoroSettings({
    focusMinutes: dom.pomodoroFocusMinutesInput.value,
    shortBreakMinutes: dom.pomodoroShortBreakMinutesInput.value,
    longBreakMinutes: dom.pomodoroLongBreakMinutesInput.value,
    sound: dom.pomodoroSoundSelect.value,
    volume: dom.pomodoroVolumeInput.value
  });

  saveData("pomodoro-settings", pomodoroSettings);
}

function loadPomodoroSettingsControls() {
  pomodoroSettings = normalizePomodoroSettings(pomodoroSettings);
  dom.pomodoroFocusMinutesInput.value = String(pomodoroSettings.focusMinutes);
  dom.pomodoroShortBreakMinutesInput.value = String(pomodoroSettings.shortBreakMinutes);
  dom.pomodoroLongBreakMinutesInput.value = String(pomodoroSettings.longBreakMinutes);
  dom.pomodoroSoundSelect.value = pomodoroSettings.sound;
  dom.pomodoroVolumeInput.value = String(pomodoroSettings.volume);
}

function formatPomodoroTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function renderPomodoroTimer() {
  dom.pomodoroTimer.textContent = formatPomodoroTime(pomodoroRemainingSeconds);
  dom.startPomodoroButton.textContent = pomodoroRunning ? "Pausar" : "Iniciar";
  [
    dom.pomodoroFocusMinutesInput,
    dom.pomodoroShortBreakMinutesInput,
    dom.pomodoroLongBreakMinutesInput
  ]
    .forEach(input => {
      input.disabled = pomodoroRunning;
    });
  dom.togglePomodoroSettingsButton.disabled = pomodoroRunning;
}

function openPomodoroPanel() {
  loadPomodoroSettingsControls();
  setPomodoroMode(activePomodoroMode);
  renderPomodoroTimer();
  dom.pomodoroPanel.classList.add("open");
  dom.pomodoroPanel.setAttribute("aria-hidden", "false");
}

function closePomodoroPanel() {
  dom.pomodoroPanel.classList.remove("open");
  dom.pomodoroPanel.setAttribute("aria-hidden", "true");
}

function closePomodoroPanelOnBackdrop(event) {
  if (event.target === event.currentTarget) closePomodoroPanel();
}

function getPomodoroMinutes(mode = activePomodoroMode) {
  const input = POMODORO_MODES[mode].input();
  const min = Number(input.min || 1);
  const max = Number(input.max || 180);
  return clampNumber(input.value, min, max, min);
}

function setPomodoroMode(mode, statusTemplate = POMODORO_MODES[mode].template) {
  if (pomodoroRunning) return;

  activePomodoroMode = mode;
  const minutes = getPomodoroMinutes(mode);
  stopPomodoroTimer();
  pomodoroTotalSeconds = minutes * 60;
  pomodoroRemainingSeconds = pomodoroTotalSeconds;
  dom.pomodoroStatusText.textContent = statusTemplate.replace("{minutes}", String(minutes));
  Object.entries(POMODORO_MODES)
    .forEach(([key, config]) => config.button().classList.toggle("active", key === mode));
  renderPomodoroTimer();
}

function updatePomodoroDurations(event) {
  const input = event.target;
  input.value = String(clampNumber(input.value, Number(input.min), Number(input.max), Number(input.min)));
  savePomodoroSettings();

  if (pomodoroRunning) return;
  setPomodoroMode(activePomodoroMode);
}

function updatePomodoroSoundSettings() {
  savePomodoroSettings();
}

function previewPomodoroSound() {
  savePomodoroSettings();
  playAlertSound(pomodoroSettings.sound, pomodoroSettings.volume / 100);
}

function togglePomodoroSettingsPanel() {
  if (pomodoroRunning) return;

  const willOpen = dom.pomodoroSettingsPanel.hidden;
  dom.pomodoroSettingsPanel.hidden = !willOpen;
  dom.togglePomodoroSettingsButton.classList.toggle("active", willOpen);
  dom.togglePomodoroSettingsButton.setAttribute("aria-expanded", String(willOpen));
}

function stopPomodoroTimer() {
  window.clearInterval(pomodoroIntervalId);
  pomodoroIntervalId = 0;
  pomodoroRunning = false;
}

function togglePomodoroTimer() {
  if (pomodoroRunning) {
    stopPomodoroTimer();
    renderPomodoroTimer();
    return;
  }

  pomodoroRunning = true;
  renderPomodoroTimer();
  pomodoroIntervalId = window.setInterval(() => {
    pomodoroRemainingSeconds = Math.max(0, pomodoroRemainingSeconds - 1);
    renderPomodoroTimer();

    if (pomodoroRemainingSeconds > 0) return;

    stopPomodoroTimer();
    dom.pomodoroStatusText.textContent = "Tempo concluído. Pode riscar essa vitória mental.";
    notifyPomodoroDone();
    renderPomodoroTimer();
  }, 1000);
}

function resetPomodoroTimer() {
  stopPomodoroTimer();
  pomodoroRemainingSeconds = pomodoroTotalSeconds;
  renderPomodoroTimer();
}

function notifyPomodoroDone() {
  alertUser({
    title: "Pomodoro concluído",
    message: "Tempo finalizado. Bora decidir: pausa ou próxima missão?",
    type: "pomodoro",
    sound: pomodoroSettings.sound,
    volume: pomodoroSettings.volume / 100,
    actionLabel: "Abrir",
    onAction: openPomodoroPanel
  });

  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification("Boby: Pomodoro concluído", {
    body: "Tempo finalizado. Bora decidir: pausa ou próxima missão?",
    icon: "/apple-touch-icon-180x180.png",
    tag: "boby-pomodoro"
  });
}

loadPomodoroSettingsControls();
setPomodoroMode(activePomodoroMode);

async function reloadDataFromActiveStorage() {
  if (!state.session.isAuthenticated) return;

  await loadCategories();
  await loadTasks();

  if (state.preferences.carryIncomplete) {
    carryIncompleteToDate(getTodayKey());
  }

  if (state.currentFilter !== "Todas" && !state.categories.includes(state.currentFilter)) {
    state.currentFilter = "Todas";
  }

  if (
    state.searchCategoryFilter !== "Todas"
    && !state.categories.includes(state.searchCategoryFilter)
  ) {
    state.searchCategoryFilter = "Todas";
  }

  renderAuthState();
  renderCategorySelect();
  renderCategoryFilters();
  renderWeekCalendar();
  renderTasks();
  initializeReminders();
  initializeWeather();
  createAutomaticSnapshot();

  if (state.session.isAuthenticated) {
    if (!navigator.onLine) renderSyncStatus("offline");
  } else {
    renderSyncStatus("local");
  }
}

let authenticatedAppInitialized = false;
let authListenerInitialized = false;
let loginAnimationTimer = 0;

function resetAuthenticatedAppRuntime() {
  authenticatedAppInitialized = false;
  window.clearTimeout(loginAnimationTimer);
  resetGreetingAnimation();
}

function scheduleLoginAnimations() {
  window.clearTimeout(loginAnimationTimer);
  loginAnimationTimer = window.setTimeout(() => {
    if (!state.session.isAuthenticated) return;
    runGreetingAnimation();
    runHeadlineAnimation();
  }, 2000);
}

async function initializeAuthenticatedApp() {
  if (!state.session.isAuthenticated) return;

  if (!authenticatedAppInitialized) {
    authenticatedAppInitialized = true;
    scheduleLoginAnimations();
  }

  await reloadDataFromActiveStorage();
  await flushPendingSync();
}

async function flushPendingSync() {
  if (!state.session.isAuthenticated || !navigator.onLine) return;

  await flushCategorySyncQueue();
  await flushTaskSyncQueue();
}

async function initializeAuthListener() {
  if (authListenerInitialized || !navigator.onLine) return;
  authListenerInitialized = true;

  await onAuthChange(async () => {
    renderAuthState();
    if (!state.session.isAuthenticated) resetAuthenticatedAppRuntime();
    await initializeAuthenticatedApp();
  });
}

async function bootstrap() {
  initializeMonitoring();
  initializeSyncStatus();
  applyStaticTranslations();
  dom.languageSelect.value = getLanguage();
  loadTheme();
  loadPreferencesControls();
  await setAuthMode("login");
  await loadAuthProviderAvailability();

  await initializeAuth();
  renderAuthState();
  await initializeAuthenticatedApp();
  await initializeAuthListener();

  window.addEventListener("online", async () => {
    updateOfflineState();
    await initializeAuthListener();
    await initializeAuth();
    renderAuthState();
    await initializeAuthenticatedApp();
    await flushPendingSync();
  });
  window.addEventListener("offline", () => {
    updateOfflineState();
    renderAuthState();
  });

  // Registro do service worker para PWA.
  // Só funciona em servidor local/HTTPS. Em file:// ele é ignorado com segurança.
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(error => {
      console.warn("Service Worker não registrado.", error);
    });
  }
}

bootstrap();
