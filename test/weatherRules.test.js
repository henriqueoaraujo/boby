import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveWeatherWarnings,
  getWeatherIcon,
  getWeatherLabel
} from "../src/js/core/weatherRules.js";

test("traduz códigos meteorológicos conhecidos", () => {
  assert.equal(getWeatherLabel(0), "Céu limpo");
  assert.equal(getWeatherLabel(95), "Trovoadas");
  assert.equal(getWeatherIcon(73), "❄");
});

test("gera avisos somente quando os limites de atenção são atingidos", () => {
  assert.deepEqual(deriveWeatherWarnings({
    weatherCode: 95,
    precipitationProbability: 80,
    windGust: 65,
    maxTemperature: 36,
    minTemperature: 12
  }), [
    "possibilidade de trovoadas",
    "alta chance de chuva",
    "rajadas de vento fortes",
    "calor intenso"
  ]);

  assert.deepEqual(deriveWeatherWarnings({
    weatherCode: 1,
    precipitationProbability: 20,
    windGust: 15,
    maxTemperature: 26,
    minTemperature: 16
  }), []);
});
