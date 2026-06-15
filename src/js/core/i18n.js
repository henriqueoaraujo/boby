import { saveData, loadData } from "./storage.js";

const STORAGE_KEY = "language";
const SUPPORTED = ["pt-BR", "en", "es"];

const translations = {
  "pt-BR": {
    account: "Conta", security: "Segurança", appearance: "Aparência", preferences: "Preferências",
    suggestions: "Sugestões", logout: "Sair", photo: "Foto de perfil", choosePhoto: "Escolher uma foto",
    photoHelp: "PNG, JPG ou WebP. A imagem será ajustada automaticamente.", name: "Nome",
    birthDate: "Data de nascimento", city: "Cidade", saveAccount: "Salvar conta",
    changePassword: "Trocar senha", currentPassword: "Senha atual", newPassword: "Nova senha", confirmPassword: "Confirmar nova senha",
    updatePassword: "Alterar senha", hideCompleted: "Ocultar concluídas", confirmDelete: "Confirmar exclusão",
    carryToday: "Levar pendências para hoje", carryHelp: "Move tarefas não concluídas de dias anteriores.",
    reminders: "Lembretes", activate: "Ativar", language: "Idioma",
    languageHelp: "Altera os textos e datas do Boby.", addTaskPlaceholder: "Adicionar nova atividade...",
    normalPriority: "Prioridade normal", highPriority: "Prioridade alta", add: "Adicionar",
    repeatDays: "Repetir em vários dias", repeatShort: "Repetir", starts: "Começa em", repeatUntil: "Repetir até",
    repeatOn: "Repetir nos dias", all: "Todas", searchPlaceholder: "Buscar tarefa...",
    selectDate: "Selecionar data", today: "Hoje", day: "Dia", week: "Semana", month: "Mês",
    year: "Ano", login: "Entrar", signup: "Criar conta", email: "E-mail", password: "Senha",
    confirmYourPassword: "Confirme sua senha", securityCheck: "Verificação de segurança",
    remember: "Continuar conectado", forgot: "Esqueci minha senha", continueWith: "ou continue com",
    loginTitle: "Acesse sua agenda", signupTitle: "Crie sua conta", show: "Mostrar", hide: "Ocultar",
    waiting: "Aguarde...", noTasks: "Nenhuma atividade por aqui ainda.", high: "Alta",
    free: "Livre", task: "tarefa", tasks: "tarefas", noTime: "Sem horário",
    noTimeTasks: "Atividades sem horário", emptyDay: "Nenhuma atividade neste dia.",
    completedAt: "concluída às {value}", repeatHint: "Nenhum dia marcado repete em todos os dias do intervalo.",
    monFri: "Seg–Sex", monTue: "Seg–Ter", wedFri: "Qua–Sex", friday: "Só Sex", everyDay: "Todos",
    editTask: "Editar tarefa", title: "Título", category: "Categoria", time: "Horário",
    priority: "Prioridade", normal: "Normal", cancel: "Cancelar", saveChanges: "Salvar alterações",
    deleteTask: "Excluir tarefa?", deleteHelp: "Essa ação remove a tarefa e suas anotações.",
    delete: "Excluir", notes: "Notas da tarefa", categories: "Categorias",
    newCategory: "Nova categoria...", saved: "Tudo sincronizado", local: "Salvo neste dispositivo",
    syncing: "Sincronizando...", offline: "Offline: alterações na fila",
    syncError: "Sincronização pendente. Clique para tentar novamente",
    greeting: "Oi, {name}.", hello: "Olá, {name}.", goodMorning: "Bom dia!", goodAfternoon: "Boa tarde!",
    goodNight: "Boa noite!", weatherUnavailable: "O clima não está disponível agora.", yourCity: "sua cidade",
    now: "{value}° agora em {city}", min: "mín. {value}°", max: "máx. {value}°",
    attention: "atenção: {value}", userRequired: "Acesso necessário",
    photoReady: "Foto pronta para salvar.", saving: "Salvando...", updatingPassword: "Atualizando senha..."
    ,emailRequired: "Informe seu e-mail.", emailInvalid: "Digite um e-mail válido.",
    nameRequired: "Informe seu nome.", nameInvalid: "Digite um nome válido.",
    birthRequired: "Informe sua data de nascimento.", dateInvalid: "Digite uma data válida.",
    futureDate: "A data não pode estar no futuro.", passwordRequired: "Informe sua senha.",
    passwordLength: "Use pelo menos 8 caracteres.", passwordLetter: "Inclua pelo menos uma letra.",
    passwordNumber: "Inclua pelo menos um número.", confirmationRequired: "Confirme sua senha.",
    passwordMismatch: "As senhas não coincidem.", captchaRequired: "Resolva a verificação de segurança.",
    captchaWrong: "Resposta incorreta. Tente novamente.", authFailed: "Não foi possível concluir a autenticação. Tente novamente."
    ,nextIdeas: "Próximas ideias:", voiceCommands: "Comandos por voz",
    sharedLists: "Compartilhamento de listas", smartTags: "Etiquetas inteligentes",
    disabled: "Desativados", active: "Ativos", blocked: "Bloqueados pelo navegador", unsupported: "Não suportados",
    sendRecovery: "Enviar link de recuperação", deleteAccount: "Excluir conta",
    deleteAccountHelp: "Remove permanentemente a conta, tarefas e categorias sincronizadas.",
    typeDelete: "Digite EXCLUIR para confirmar", deleteMyAccount: "Excluir minha conta",
    dataBackups: "Dados e backups", dataBackupsHelp: "Exporte seus dados ou restaure um arquivo criado pelo Boby.",
    exportBackup: "Exportar backup", importBackup: "Importar backup", restoreLocal: "Restaurar cópia local"
  },
  en: {
    account: "Account", security: "Security", appearance: "Appearance", preferences: "Preferences",
    suggestions: "Suggestions", logout: "Sign out", photo: "Profile photo", choosePhoto: "Choose a photo",
    photoHelp: "PNG, JPG or WebP. The image will be adjusted automatically.", name: "Name",
    birthDate: "Date of birth", city: "City", saveAccount: "Save account",
    changePassword: "Change password", currentPassword: "Current password", newPassword: "New password", confirmPassword: "Confirm new password",
    updatePassword: "Update password", hideCompleted: "Hide completed", confirmDelete: "Confirm deletion",
    carryToday: "Move pending tasks to today", carryHelp: "Moves unfinished tasks from previous days.",
    reminders: "Reminders", activate: "Enable", language: "Language",
    languageHelp: "Changes Boby's text and date format.", addTaskPlaceholder: "Add a new task...",
    normalPriority: "Normal priority", highPriority: "High priority", add: "Add",
    repeatDays: "Repeat on multiple days", repeatShort: "Repeat", starts: "Starts on", repeatUntil: "Repeat until",
    repeatOn: "Repeat on", all: "All", searchPlaceholder: "Search tasks...",
    selectDate: "Select date", today: "Today", day: "Day", week: "Week", month: "Month",
    year: "Year", login: "Sign in", signup: "Create account", email: "Email", password: "Password",
    confirmYourPassword: "Confirm your password", securityCheck: "Security check",
    remember: "Stay signed in", forgot: "Forgot my password", continueWith: "or continue with",
    loginTitle: "Open your schedule", signupTitle: "Create your account", show: "Show", hide: "Hide",
    waiting: "Please wait...", noTasks: "No tasks here yet.", high: "High",
    free: "Free", task: "task", tasks: "tasks", noTime: "No time",
    noTimeTasks: "Tasks without a time", emptyDay: "No tasks on this day.",
    completedAt: "completed at {value}", repeatHint: "With no days selected, the task repeats every day.",
    monFri: "Mon–Fri", monTue: "Mon–Tue", wedFri: "Wed–Fri", friday: "Friday", everyDay: "Every day",
    editTask: "Edit task", title: "Title", category: "Category", time: "Time",
    priority: "Priority", normal: "Normal", cancel: "Cancel", saveChanges: "Save changes",
    deleteTask: "Delete task?", deleteHelp: "This removes the task and its notes.",
    delete: "Delete", notes: "Task notes", categories: "Categories",
    newCategory: "New category...", saved: "Everything synced", local: "Saved on this device",
    syncing: "Syncing...", offline: "Offline: changes queued",
    syncError: "Sync pending. Click to retry",
    greeting: "Hi, {name}.", hello: "Hello, {name}.", goodMorning: "Good morning!", goodAfternoon: "Good afternoon!",
    goodNight: "Good evening!", weatherUnavailable: "Weather is unavailable right now.", yourCity: "your city",
    now: "{value}° now in {city}", min: "low {value}°", max: "high {value}°",
    attention: "weather alert: {value}", userRequired: "Sign-in required",
    photoReady: "Photo ready to save.", saving: "Saving...", updatingPassword: "Updating password..."
    ,emailRequired: "Enter your email.", emailInvalid: "Enter a valid email.",
    nameRequired: "Enter your name.", nameInvalid: "Enter a valid name.",
    birthRequired: "Enter your date of birth.", dateInvalid: "Enter a valid date.",
    futureDate: "The date cannot be in the future.", passwordRequired: "Enter your password.",
    passwordLength: "Use at least 8 characters.", passwordLetter: "Include at least one letter.",
    passwordNumber: "Include at least one number.", confirmationRequired: "Confirm your password.",
    passwordMismatch: "The passwords do not match.", captchaRequired: "Complete the security check.",
    captchaWrong: "Incorrect answer. Try again.", authFailed: "Authentication could not be completed. Try again."
    ,nextIdeas: "Coming next:", voiceCommands: "Voice commands",
    sharedLists: "Shared lists", smartTags: "Smart tags",
    disabled: "Disabled", active: "Active", blocked: "Blocked by browser", unsupported: "Not supported",
    sendRecovery: "Send recovery link", deleteAccount: "Delete account",
    deleteAccountHelp: "Permanently removes the account, tasks and synced categories.",
    typeDelete: "Type DELETE to confirm", deleteMyAccount: "Delete my account",
    dataBackups: "Data and backups", dataBackupsHelp: "Export your data or restore a file created by Boby.",
    exportBackup: "Export backup", importBackup: "Import backup", restoreLocal: "Restore local copy"
  },
  es: {
    account: "Cuenta", security: "Seguridad", appearance: "Apariencia", preferences: "Preferencias",
    suggestions: "Sugerencias", logout: "Salir", photo: "Foto de perfil", choosePhoto: "Elegir una foto",
    photoHelp: "PNG, JPG o WebP. La imagen se ajustará automáticamente.", name: "Nombre",
    birthDate: "Fecha de nacimiento", city: "Ciudad", saveAccount: "Guardar cuenta",
    changePassword: "Cambiar contraseña", currentPassword: "Contraseña actual", newPassword: "Nueva contraseña", confirmPassword: "Confirmar contraseña",
    updatePassword: "Cambiar contraseña", hideCompleted: "Ocultar completadas", confirmDelete: "Confirmar eliminación",
    carryToday: "Mover pendientes a hoy", carryHelp: "Mueve tareas no terminadas de días anteriores.",
    reminders: "Recordatorios", activate: "Activar", language: "Idioma",
    languageHelp: "Cambia los textos y fechas de Boby.", addTaskPlaceholder: "Añadir una tarea...",
    normalPriority: "Prioridad normal", highPriority: "Prioridad alta", add: "Añadir",
    repeatDays: "Repetir en varios días", repeatShort: "Repetir", starts: "Comienza el", repeatUntil: "Repetir hasta",
    repeatOn: "Repetir los días", all: "Todas", searchPlaceholder: "Buscar tareas...",
    selectDate: "Seleccionar fecha", today: "Hoy", day: "Día", week: "Semana", month: "Mes",
    year: "Año", login: "Entrar", signup: "Crear cuenta", email: "Correo", password: "Contraseña",
    confirmYourPassword: "Confirma tu contraseña", securityCheck: "Verificación de seguridad",
    remember: "Mantener sesión iniciada", forgot: "Olvidé mi contraseña", continueWith: "o continúa con",
    loginTitle: "Abre tu agenda", signupTitle: "Crea tu cuenta", show: "Mostrar", hide: "Ocultar",
    waiting: "Espera...", noTasks: "Aún no hay tareas aquí.", high: "Alta",
    free: "Libre", task: "tarea", tasks: "tareas", noTime: "Sin hora",
    noTimeTasks: "Tareas sin hora", emptyDay: "No hay tareas este día.",
    completedAt: "completada a las {value}", repeatHint: "Sin días seleccionados, la tarea se repite todos los días.",
    monFri: "Lun–Vie", monTue: "Lun–Mar", wedFri: "Mié–Vie", friday: "Solo Vie", everyDay: "Todos",
    editTask: "Editar tarea", title: "Título", category: "Categoría", time: "Hora",
    priority: "Prioridad", normal: "Normal", cancel: "Cancelar", saveChanges: "Guardar cambios",
    deleteTask: "¿Eliminar tarea?", deleteHelp: "Esto elimina la tarea y sus notas.",
    delete: "Eliminar", notes: "Notas de la tarea", categories: "Categorías",
    newCategory: "Nueva categoría...", saved: "Todo sincronizado", local: "Guardado en este dispositivo",
    syncing: "Sincronizando...", offline: "Sin conexión: cambios en cola",
    syncError: "Sincronización pendiente. Haz clic para reintentar",
    greeting: "Hola, {name}.", hello: "Hola, {name}.", goodMorning: "¡Buenos días!", goodAfternoon: "¡Buenas tardes!",
    goodNight: "¡Buenas noches!", weatherUnavailable: "El clima no está disponible ahora.", yourCity: "tu ciudad",
    now: "{value}° ahora en {city}", min: "mín. {value}°", max: "máx. {value}°",
    attention: "alerta: {value}", userRequired: "Acceso requerido",
    photoReady: "Foto lista para guardar.", saving: "Guardando...", updatingPassword: "Actualizando contraseña..."
    ,emailRequired: "Introduce tu correo.", emailInvalid: "Introduce un correo válido.",
    nameRequired: "Introduce tu nombre.", nameInvalid: "Introduce un nombre válido.",
    birthRequired: "Introduce tu fecha de nacimiento.", dateInvalid: "Introduce una fecha válida.",
    futureDate: "La fecha no puede estar en el futuro.", passwordRequired: "Introduce tu contraseña.",
    passwordLength: "Usa al menos 8 caracteres.", passwordLetter: "Incluye al menos una letra.",
    passwordNumber: "Incluye al menos un número.", confirmationRequired: "Confirma tu contraseña.",
    passwordMismatch: "Las contraseñas no coinciden.", captchaRequired: "Completa la verificación de seguridad.",
    captchaWrong: "Respuesta incorrecta. Inténtalo de nuevo.", authFailed: "No se pudo completar la autenticación. Inténtalo de nuevo."
    ,nextIdeas: "Próximas ideas:", voiceCommands: "Comandos de voz",
    sharedLists: "Listas compartidas", smartTags: "Etiquetas inteligentes",
    disabled: "Desactivados", active: "Activos", blocked: "Bloqueados por el navegador", unsupported: "No compatibles",
    sendRecovery: "Enviar enlace de recuperación", deleteAccount: "Eliminar cuenta",
    deleteAccountHelp: "Elimina permanentemente la cuenta, las tareas y categorías sincronizadas.",
    typeDelete: "Escribe ELIMINAR para confirmar", deleteMyAccount: "Eliminar mi cuenta",
    dataBackups: "Datos y copias", dataBackupsHelp: "Exporta tus datos o restaura un archivo creado por Boby.",
    exportBackup: "Exportar copia", importBackup: "Importar copia", restoreLocal: "Restaurar copia local"
  }
};

const savedLanguage = typeof localStorage === "undefined"
  ? "pt-BR"
  : loadData(STORAGE_KEY, "pt-BR");
let currentLanguage = SUPPORTED.includes(savedLanguage)
  ? savedLanguage
  : "pt-BR";

export function t(key, params = {}) {
  let value = translations[currentLanguage]?.[key] || translations["pt-BR"][key] || key;
  Object.entries(params).forEach(([name, replacement]) => {
    value = value.replace(`{${name}}`, String(replacement));
  });
  return value;
}

export function getLanguage() {
  return currentLanguage;
}

export function getLocale() {
  return currentLanguage;
}

export function setLanguage(language) {
  currentLanguage = SUPPORTED.includes(language) ? language : "pt-BR";
  saveData(STORAGE_KEY, currentLanguage);
  document.documentElement.lang = currentLanguage;
  applyStaticTranslations();
  window.dispatchEvent(new CustomEvent("boby:language-change", {
    detail: { language: currentLanguage }
  }));
}

const textBindings = [
  ["#profileToggle span", "account"], ["#securityToggle span", "security"],
  ["#appearanceToggle span", "appearance"], ["#preferencesToggle span", "preferences"],
  ["#suggestionsToggle span", "suggestions"], ["#logoutButton span", "logout"],
  [".profile-photo-field > span:first-child", "photo"], [".profile-photo-button", "choosePhoto"],
  [".profile-photo-field small", "photoHelp"], ["#profileForm label:nth-of-type(2) span", "name"],
  ["#profileForm label:nth-of-type(3) span", "birthDate"], ["#profileForm label:nth-of-type(4) span", "city"],
  ["#saveProfileButton", "saveAccount"], [".profile-security > strong", "changePassword"],
  [".profile-security label:nth-of-type(1) span", "currentPassword"],
  [".profile-security label:nth-of-type(2) span", "newPassword"],
  [".profile-security label:nth-of-type(3) span", "confirmPassword"], ["#updatePasswordButton", "updatePassword"],
  ["#sendRecoveryButton", "sendRecovery"], ["#deleteAccountTitle", "deleteAccount"],
  ["#deleteAccountHelp", "deleteAccountHelp"], ["#deleteAccountPasswordLabel", "currentPassword"],
  ["#deleteAccountConfirmationLabel", "typeDelete"], ["#deleteAccountButton", "deleteMyAccount"],
  ["#dataManagementTitle", "dataBackups"], ["#dataManagementHelp", "dataBackupsHelp"],
  ["#exportDataButton", "exportBackup"], [".import-data-button", "importBackup"],
  ["#restoreSnapshotButton", "restoreLocal"],
  ["#preferencesContent .setting-row:nth-of-type(1) strong", "hideCompleted"],
  ["#preferencesContent .setting-row:nth-of-type(2) strong", "confirmDelete"],
  ["#preferencesContent .setting-row:nth-of-type(3) strong", "carryToday"],
  ["#preferencesContent .setting-row:nth-of-type(3) small", "carryHelp"],
  ["#preferencesContent .setting-row:nth-of-type(4) strong", "reminders"],
  ["#enableNotificationsButton", "activate"], [".language-setting strong", "language"],
  [".language-setting small", "languageHelp"], ["#addTaskButton", "add"],
  [".recurrence-toggle span", "repeatShort"], [".recurrence-range label:first-child span", "starts"],
  [".recurrence-range label:last-child span", "repeatUntil"], [".recurrence-options legend", "repeatOn"],
  [".recurrence-options fieldset > small", "repeatHint"],
  [".recurrence-presets button:nth-child(1)", "monFri"], [".recurrence-presets button:nth-child(2)", "monTue"],
  [".recurrence-presets button:nth-child(3)", "wedFri"], [".recurrence-presets button:nth-child(4)", "friday"],
  [".recurrence-presets button:nth-child(5)", "everyDay"],
  ["#goToTodayButton", "today"], ["#dayAgendaViewButton", "day"], ["#weekAgendaViewButton", "week"],
  ["#monthAgendaViewButton", "month"], ["#openCalendarButton span", "selectDate"],
  ["#calendarMonthViewButton", "month"], ["#calendarYearViewButton", "year"],
  ["#authLoginTab", "login"], ["#authSignupTab", "signup"],
  ["#authNameField > span", "name"], ["#authBirthDateField > span", "birthDate"],
  [".auth-field:has(#authEmailInput) > span", "email"], [".auth-field:has(#authPasswordInput) > span", "password"],
  ["#authConfirmPasswordField > span", "confirmYourPassword"], ["#authCaptchaField legend", "securityCheck"],
  ["#authRememberField span", "remember"], ["#authResetPasswordButton", "forgot"],
  [".auth-divider span", "continueWith"], [".task-edit-header strong", "editTask"],
  [".task-edit-card > label:nth-of-type(1) span", "title"],
  [".task-edit-card > label:nth-of-type(2) span", "category"],
  [".task-edit-grid label:nth-child(2) span", "time"], [".task-edit-card > label:last-of-type span", "priority"],
  ["#cancelTaskEditButton", "cancel"], [".task-edit-save", "saveChanges"],
  [".confirm-copy strong", "deleteTask"], [".confirm-copy p", "deleteHelp"],
  ["#cancelDeleteTaskButton", "cancel"], ["#confirmDeleteTaskButton", "delete"],
  ["#taskNotesTitle", "notes"], [".category-header strong", "categories"], ["#addCategoryButton", "add"]
  ,[".suggestion-card p", "nextIdeas"], [".suggestion-card span:nth-of-type(1)", "voiceCommands"],
  [".suggestion-card span:nth-of-type(2)", "sharedLists"], [".suggestion-card span:nth-of-type(3)", "smartTags"]
];

export function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage;
  textBindings.forEach(([selector, key]) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = t(key);
  });

  const placeholders = [
    ["#taskInput", "addTaskPlaceholder"], ["#searchInput", "searchPlaceholder"],
    ["#newCategoryInput", "newCategory"]
  ];
  placeholders.forEach(([selector, key]) => {
    const element = document.querySelector(selector);
    if (element) element.placeholder = t(key);
  });

  const priority = document.querySelector("#priorityInput");
  if (priority) {
    priority.options[0].textContent = t("normalPriority");
    priority.options[1].textContent = t("highPriority");
  }
  const editPriority = document.querySelector("#editTaskPriority");
  if (editPriority) {
    editPriority.options[0].textContent = t("normal");
    editPriority.options[1].textContent = t("high");
  }

  const weekdayDates = [
    new Date(2026, 5, 15), new Date(2026, 5, 16), new Date(2026, 5, 17),
    new Date(2026, 5, 18), new Date(2026, 5, 19), new Date(2026, 5, 20),
    new Date(2026, 5, 21)
  ];
  document.querySelectorAll(".home-month-weekdays span").forEach((element, index) => {
    element.textContent = new Intl.DateTimeFormat(currentLanguage, { weekday: "short" })
      .format(weekdayDates[index])
      .replace(".", "");
  });
  const sundayFirstDates = [weekdayDates[6], ...weekdayDates.slice(0, 6)];
  document.querySelectorAll("#calendarWeekdays span").forEach((element, index) => {
    element.textContent = new Intl.DateTimeFormat(currentLanguage, { weekday: "short" })
      .format(sundayFirstDates[index])
      .replace(".", "");
  });
}
