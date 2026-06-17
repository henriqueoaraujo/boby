import { dom } from "../core/selectors.js";

let toastTimer = 0;
let audioContext = null;

const SOUND_PATTERNS = {
  reminder: [
    { frequency: 520, duration: 0.1 },
    { frequency: 720, duration: 0.1, delay: 0.13 }
  ],
  overdue: [
    { frequency: 440, duration: 0.12 },
    { frequency: 370, duration: 0.12, delay: 0.14 },
    { frequency: 440, duration: 0.12, delay: 0.28 }
  ],
  pomodoro: [
    { frequency: 660, duration: 0.1 },
    { frequency: 880, duration: 0.1, delay: 0.13 },
    { frequency: 660, duration: 0.1, delay: 0.26 }
  ],
  "focus-pop": [
    { frequency: 620, duration: 0.08 },
    { frequency: 780, duration: 0.08, delay: 0.1 },
    { frequency: 930, duration: 0.11, delay: 0.2 }
  ],
  "soft-bell": [
    { frequency: 740, duration: 0.18 },
    { frequency: 1110, duration: 0.24, delay: 0.06, gain: 0.05 }
  ],
  "double-tap": [
    { frequency: 540, duration: 0.09 },
    { frequency: 540, duration: 0.09, delay: 0.17 }
  ],
  rise: [
    { frequency: 470, duration: 0.07 },
    { frequency: 620, duration: 0.07, delay: 0.09 },
    { frequency: 790, duration: 0.07, delay: 0.18 },
    { frequency: 990, duration: 0.12, delay: 0.27 }
  ],
  calm: [
    { frequency: 392, duration: 0.16 },
    { frequency: 523, duration: 0.18, delay: 0.18 },
    { frequency: 659, duration: 0.22, delay: 0.38 }
  ]
};

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) audioContext = new AudioContextClass();
  return audioContext;
}

export function unlockAlertSound() {
  const context = getAudioContext();
  if (!context || context.state !== "suspended") return;

  context.resume().catch(() => {});
}

export function playAlertSound(type = "reminder", volume = 0.7) {
  const context = getAudioContext();
  if (!context) return;

  const now = context.currentTime;
  const pattern = SOUND_PATTERNS[type] || SOUND_PATTERNS.reminder;
  const safeVolume = Math.min(1, Math.max(0, Number(volume)));

  pattern.forEach(note => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = now + (note.delay || 0);
    const stop = start + note.duration;
    const peak = Math.max(0.0001, Math.min(0.18, (note.gain || 0.12) * safeVolume));

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(note.frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(stop + 0.02);
  });
}

export function showPageNotice({
  title = "Boby",
  message = "",
  type = "reminder",
  actionLabel = "",
  onAction = null
} = {}) {
  if (!dom.pageNotice) return;

  window.clearTimeout(toastTimer);
  dom.pageNoticeTitle.textContent = title;
  dom.pageNoticeMessage.textContent = message;
  dom.pageNotice.dataset.type = type;

  if (actionLabel && typeof onAction === "function") {
    dom.pageNoticeAction.textContent = actionLabel;
    dom.pageNoticeAction.hidden = false;
    dom.pageNoticeAction.onclick = onAction;
  } else {
    dom.pageNoticeAction.hidden = true;
    dom.pageNoticeAction.onclick = null;
  }

  dom.pageNotice.classList.add("show");
  dom.pageNotice.setAttribute("aria-hidden", "false");

  toastTimer = window.setTimeout(closePageNotice, 6500);
}

export function closePageNotice() {
  if (!dom.pageNotice) return;

  dom.pageNotice.classList.remove("show");
  dom.pageNotice.setAttribute("aria-hidden", "true");
}

export function alertUser(options = {}) {
  playAlertSound(options.sound || options.type, options.volume ?? 0.7);
  showPageNotice(options);
}
