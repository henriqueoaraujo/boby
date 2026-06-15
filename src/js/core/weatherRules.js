const WEATHER_LABELS = {
  0: "Céu limpo",
  1: "Predominantemente limpo",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina com geada",
  51: "Garoa leve",
  53: "Garoa",
  55: "Garoa intensa",
  61: "Chuva leve",
  63: "Chuva",
  65: "Chuva forte",
  71: "Neve leve",
  73: "Neve",
  75: "Neve forte",
  80: "Pancadas leves",
  81: "Pancadas de chuva",
  82: "Pancadas fortes",
  95: "Trovoadas",
  96: "Trovoadas com granizo",
  99: "Trovoadas fortes com granizo"
};

export function getWeatherLabel(code) {
  return WEATHER_LABELS[Number(code)] || "Condição variável";
}

export function getWeatherIcon(code) {
  const value = Number(code);
  if (value === 0) return "☀";
  if (value <= 3) return "◒";
  if (value === 45 || value === 48) return "≋";
  if (value >= 95) return "ϟ";
  if (value >= 71 && value <= 77) return "❄";
  if (value >= 51 && value <= 82) return "☂";
  return "○";
}

export function deriveWeatherWarnings({
  weatherCode,
  precipitationProbability,
  windGust,
  maxTemperature,
  minTemperature
}) {
  const warnings = [];

  if (Number(weatherCode) >= 95) warnings.push("possibilidade de trovoadas");
  if (Number(precipitationProbability) >= 70) warnings.push("alta chance de chuva");
  if (Number(windGust) >= 60) warnings.push("rajadas de vento fortes");
  if (Number(maxTemperature) >= 35) warnings.push("calor intenso");
  if (Number(minTemperature) <= 5) warnings.push("frio intenso");

  return warnings;
}
