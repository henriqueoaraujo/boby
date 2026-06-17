/* =========================================================
   ANIMATIONS
   ========================================================= */

import { dom } from "../core/selectors.js";
import { state } from "../core/state.js";
import { getDayPeriod } from "../core/greetingRules.js";
import { getLanguage, t } from "../core/i18n.js";

function getGreetingMessage() {
  const metadata = state.session.user?.user_metadata || {};
  const fullName = metadata.full_name || metadata.name || "";
  const firstName = fullName.trim().split(/\s+/)[0] || "por aqui";
  const periodKey = {
    morning: "goodMorning",
    afternoon: "goodAfternoon",
    night: "goodNight",
    day: "hello"
  }[getDayPeriod()];

  return `${t("hello", { name: firstName })} ${t(periodKey)}`;
}

const HEADLINE_MESSAGES = {
  "pt-BR": [
    "Foco: porque o prazo não tira férias.",
    "Uma tarefa por vez. O café ajuda.",
    "Produtividade sem reunião sobre produtividade.",
    "Feito é melhor que aberto em outra aba.",
    "Hoje o plano é vencer a lista.",
    "Menos abas. Mais entregas.",
    "Bora trabalhar antes que vire urgente.",
    "Organização: o superpoder sem capa.",
    "Respira. Depois responde aquele e-mail.",
    "A lista não morde. Só aumenta.",
    "Prioridade alta, drama baixo.",
    "Começa pequeno. Termina antes do prazo.",
    "O impossível talvez só esteja sem checklist.",
    "Reunião boa termina antes do café esfriar.",
    "Se leva dois minutos, já está te encarando.",
    "Uma entrega hoje vale dois lembretes amanhã.",
    "Organize agora, agradeça depois.",
    "Foco ligado. Notificações de castigo.",
    "Planilha aberta, coragem também.",
    "O prazo está vindo. Finja naturalidade.",
    "Trabalho em equipe: alguém traz o café.",
    "Hoje tem meta com final feliz.",
    "Menos perfeição, mais versão entregue.",
    "A tarefa difícil também começa pelo título.",
    "Agenda cheia, cabeça leve.",
    "Clique em concluir. É terapêutico.",
    "Seu futuro eu pediu para adiantar isso.",
    "O segredo é parecer calmo no calendário.",
    "Sem pressa, mas com prazo.",
    "Primeiro o foco, depois o meme.",
    "A produtividade também precisa de intervalo.",
    "Tarefa concluída combina com sexta-feira.",
    "Tudo sob controle, inclusive o improviso.",
    "Comece antes da motivação chegar.",
    "Um bom plano economiza três cafés.",
    "A demanda passa. O histórico fica.",
    "Que a força do Ctrl+S esteja com você.",
    "Hoje ninguém abre uma nova aba sem motivo.",
    "O checklist acredita em você.",
    "Faça agora e surpreenda o prazo.",
    "Pequenos avanços, grandes botões de concluir.",
    "Sem reunião poderia ter sido uma reunião.",
    "Seu calendário pediu um pouco de disciplina.",
    "Trabalhe esperto. O relógio já trabalha rápido.",
    "A meta de hoje é não virar meta de amanhã.",
    "Foco é dizer não para a quinta aba.",
    "Entrega feita: desbloqueie o café premium.",
    "Toda tarefa concluída merece um mini aplauso.",
    "Organização é improviso com antecedência.",
    "Vamos transformar pendência em passado."
  ],
  en: [
    "Focus: deadlines do not take vacations.", "One task at a time. Coffee helps.",
    "Productivity without a meeting about productivity.", "Done beats open in another tab.",
    "Today's plan: beat the list.", "Fewer tabs. More results.",
    "Let's work before it becomes urgent.", "Organization: the cape-free superpower."
  ],
  es: [
    "Foco: los plazos no se van de vacaciones.", "Una tarea a la vez. El café ayuda.",
    "Productividad sin reunión sobre productividad.", "Hecho supera a abierto en otra pestaña.",
    "El plan de hoy: vencer la lista.", "Menos pestañas. Más resultados.",
    "A trabajar antes de que sea urgente.", "Organización: el superpoder sin capa."
  ]
};

const NIGHT_HEADLINE_MESSAGES = {
  "pt-BR": [
    "Tem dia que é noite.",
    "Corre que amanhã tem entrega de demanda.",
    "Trabalhando tarde para descansar preocupado amanhã.",
    "A lua saiu. A planilha também.",
    "Modo noturno: brilho baixo, prazo alto.",
    "Só mais uma tarefa, disse pela quarta vez.",
    "O café pediu adicional noturno.",
    "Boa noite para todos, menos para a pendência.",
    "Se o prazo dorme, ninguém avisou.",
    "A coruja corporativa bateu o ponto.",
    "Silêncio na casa, barulho no teclado.",
    "A demanda não dorme, mas deveria.",
    "Noite produtiva ou manhã antecipada?",
    "Última entrega antes do travesseiro.",
    "Trabalhar de noite: menos reuniões, mais bocejos.",
    "O escuro ajuda a não ver o tamanho da lista.",
    "Amanhã começa assim que este arquivo salvar.",
    "Foco noturno ativado. Pijama opcional.",
    "O prazo virou abóbora faz tempo.",
    "Conclui essa e vai negociar com o sono."
  ],
  en: [
    "Some days are nights.", "Tomorrow's deadline is already awake.",
    "Night mode: low brightness, high stakes.", "Just one more task, for the fourth time.",
    "Coffee requested overtime.", "Good night to everyone except the backlog.",
    "Quiet house, loud keyboard.", "Is this a productive night or an early morning?"
  ],
  es: [
    "Hay días que son noches.", "La entrega de mañana ya está despierta.",
    "Modo nocturno: poco brillo, mucha urgencia.", "Solo una tarea más, por cuarta vez.",
    "El café pidió horas extra.", "Buenas noches a todos menos a la lista.",
    "Casa silenciosa, teclado ruidoso.", "¿Noche productiva o mañana adelantada?"
  ]
};

function isNightWorkTime(date = new Date()) {
  const hour = date.getHours();
  return hour >= 18 || hour < 6;
}

function getHeadlineMessages() {
  const language = getLanguage();
  const collection = isNightWorkTime() ? NIGHT_HEADLINE_MESSAGES : HEADLINE_MESSAGES;
  return collection[language] || collection["pt-BR"];
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function typeText(element, text, speed = 12) {
  element.textContent = "";
  for (const letter of text) {
    element.textContent += letter;
    const punctuationPause = [".", ",", ":"].includes(letter) ? 35 : 0;
    await wait(speed + Math.random() * 8 + punctuationPause);
  }
}

async function eraseText(element) {
  while (element.textContent.length > 0) {
    element.textContent = element.textContent.slice(0, -1);
    await wait(7 + Math.random() * 7);
  }
}

let greetingAnimationStarted = false;
let headlineAnimationStarted = false;
let greetingAnimationRunId = 0;
let latestWeather = null;
let weatherDataReady = false;
let weatherDataResolver = null;

function getWeatherMessage() {
  if (!latestWeather) return t("weatherUnavailable");

  const city = latestWeather.city || state.session.user?.user_metadata?.city || t("yourCity");
  const parts = [];
  if (Number.isFinite(Number(latestWeather.temperature))) {
    parts.push(t("now", { value: Math.round(latestWeather.temperature), city }));
  }
  if (Number.isFinite(Number(latestWeather.minTemperature))) {
    parts.push(t("min", { value: Math.round(latestWeather.minTemperature) }));
  }
  if (Number.isFinite(Number(latestWeather.maxTemperature))) {
    parts.push(t("max", { value: Math.round(latestWeather.maxTemperature) }));
  }
  if (latestWeather.warnings?.length) {
    parts.push(t("attention", { value: latestWeather.warnings.join(", ") }));
  }
  return parts.join(" · ") || t("weatherUnavailable");
}

window.addEventListener("boby:weather-update", event => {
  latestWeather = event.detail || null;
  weatherDataReady = true;
  weatherDataResolver?.();
  weatherDataResolver = null;
});

function waitForWeatherData() {
  if (weatherDataReady) return Promise.resolve();
  return new Promise(resolve => {
    weatherDataResolver = resolve;
  });
}

export async function runGreetingAnimation() {
  if (greetingAnimationStarted) return;
  greetingAnimationStarted = true;
  const runId = ++greetingAnimationRunId;

  await typeText(dom.greeting, getGreetingMessage());
  await waitForWeatherData();
  if (runId !== greetingAnimationRunId) return;
  await wait(1100);
  if (runId !== greetingAnimationRunId) return;
  await eraseText(dom.greeting);
  await wait(180);
  if (runId !== greetingAnimationRunId) return;
  await typeText(dom.greeting, getWeatherMessage());
  await wait(5000);
  if (runId !== greetingAnimationRunId) return;
  await eraseText(dom.greeting);
  if (runId !== greetingAnimationRunId) return;

  dom.assistantLine.classList.add("done");
  dom.assistantLine.closest(".hero-card")?.classList.add("greeting-finished");
  await wait(500);
  dom.assistantLine.hidden = true;
}

export function resetGreetingAnimation() {
  greetingAnimationStarted = false;
  greetingAnimationRunId++;
  latestWeather = null;
  weatherDataReady = false;
  weatherDataResolver?.();
  weatherDataResolver = null;
  dom.greeting.textContent = "";
  dom.assistantLine.hidden = false;
  dom.assistantLine.classList.remove("done");
  dom.assistantLine.closest(".hero-card")?.classList.remove("greeting-finished");
}

export async function runHeadlineAnimation() {
  if (headlineAnimationStarted) return;
  headlineAnimationStarted = true;

  dom.headlineText.textContent = getHeadlineMessages()[0];
  let index = 1;
  await wait(60000);

  while (true) {
    await eraseText(dom.headlineText);
    await wait(350);
    const messages = getHeadlineMessages();
    await typeText(dom.headlineText, messages[index % messages.length]);
    await wait(60000);
    index++;
  }
}

window.addEventListener("boby:language-change", () => {
  const messages = getHeadlineMessages();
  dom.headlineText.textContent = messages[0];
});
