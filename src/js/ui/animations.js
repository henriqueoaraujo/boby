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
    "Foco: porque o prazo não tira férias.", "Uma tarefa por vez. O café ajuda.",
    "Produtividade sem reunião sobre produtividade.", "Feito é melhor que aberto em outra aba.",
    "Hoje o plano é vencer a lista.", "Menos abas. Mais entregas.",
    "Bora trabalhar antes que vire urgente.", "Organização: o superpoder sem capa."
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

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function typeText(element, text, speed = 10) {
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
let latestWeather = null;

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
  latestWeather = event.detail;
});

export async function runGreetingAnimation() {
  if (greetingAnimationStarted) return;
  greetingAnimationStarted = true;

  await typeText(dom.greeting, getGreetingMessage());
  await wait(1100);
  await eraseText(dom.greeting);
  await wait(180);
  await typeText(dom.greeting, getWeatherMessage());
  await wait(5000);

  dom.assistantLine.classList.add("done");
  dom.assistantLine.closest(".hero-card")?.classList.add("greeting-finished");
  await wait(500);
  dom.assistantLine.hidden = true;
}

export async function runHeadlineAnimation() {
  if (headlineAnimationStarted) return;
  headlineAnimationStarted = true;

  let index = 1;
  await wait(60000);

  while (true) {
    await eraseText(dom.headlineText);
    await wait(350);
    const messages = HEADLINE_MESSAGES[getLanguage()] || HEADLINE_MESSAGES["pt-BR"];
    await typeText(dom.headlineText, messages[index % messages.length]);
    await wait(60000);
    index++;
  }
}

window.addEventListener("boby:language-change", () => {
  const messages = HEADLINE_MESSAGES[getLanguage()] || HEADLINE_MESSAGES["pt-BR"];
  dom.headlineText.textContent = messages[0];
});
