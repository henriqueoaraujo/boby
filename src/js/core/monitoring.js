import { state } from "./state.js";
import { getSupabaseClient } from "../repositories/supabaseClient.js";

const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 2000;
const recentErrors = new Map();

function normalizeError(error, context = {}) {
  const source = error instanceof Error ? error : new Error(String(error || "Erro desconhecido"));
  return {
    user_id: state.session.user?.id || null,
    message: source.message.slice(0, MAX_MESSAGE_LENGTH),
    stack: String(source.stack || "").slice(0, MAX_STACK_LENGTH),
    path: location.pathname.slice(0, 300),
    context,
    user_agent: navigator.userAgent.slice(0, 500)
  };
}

export async function reportError(error, context = {}) {
  const payload = normalizeError(error, context);
  const fingerprint = `${payload.message}:${payload.path}`;
  const lastReportedAt = recentErrors.get(fingerprint) || 0;
  if (Date.now() - lastReportedAt < 30000) return;
  recentErrors.set(fingerprint, Date.now());

  if (!navigator.onLine || !state.session.isAuthenticated) return;

  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await supabase.from("app_errors").insert(payload);
  } catch {
    // Monitoramento nunca deve interromper o uso do aplicativo.
  }
}

export function initializeMonitoring() {
  window.addEventListener("error", event => {
    reportError(event.error || event.message, { type: "window-error" });
  });
  window.addEventListener("unhandledrejection", event => {
    reportError(event.reason, { type: "unhandled-rejection" });
  });
}
