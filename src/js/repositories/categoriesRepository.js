/* =========================================================
   CATEGORIES REPOSITORY
   ---------------------------------------------------------
   Estratégia híbrida:
   - Sem login: localStorage.
   - Com login: Supabase + cópia local.
   ========================================================= */

import { getScopedDataKey, loadData, saveData } from "../core/storage.js";
import {
  announceQueueStatus,
  announceSyncStatus,
  enqueueSyncOperation,
  readSyncQueue,
  removeSyncOperation
} from "../core/syncQueue.js";
import { DEFAULT_CATEGORIES, normalizeCategories, state } from "../core/state.js";
import { getSupabaseClient } from "./supabaseClient.js";

function getCategoriesStorageKey(userId = state.session.user?.id) {
  const scope = userId ? `user:${userId}` : "local";
  return getScopedDataKey(scope, "categories");
}

export function persistLocalCategories() {
  saveData(getCategoriesStorageKey(), state.categories);
}

function mapSupabaseCategory(row) {
  return row.name;
}

function getSyncErrorMessage(error) {
  if (error?.code === "PGRST205" || error?.message?.includes("schema cache")) {
    return "A tabela categories não existe no Supabase. Execute supabase/schema.sql.";
  }
  if (error?.code === "42501") {
    return "As políticas de acesso da tabela categories precisam ser atualizadas.";
  }
  return error?.message || "Não foi possível sincronizar as categorias.";
}

export async function loadCategories() {
  if (!state.session.isAuthenticated) {
    state.categories = normalizeCategories(
      loadData(
        getCategoriesStorageKey(null),
        loadData("categories", [...DEFAULT_CATEGORIES])
      )
    );
    state.draftCategories = [...state.categories];
    return state.categories;
  }

  const supabase = await getSupabaseClient();

  if (!supabase) {
    state.categories = normalizeCategories(
      loadData(
        getCategoriesStorageKey(),
        [...DEFAULT_CATEGORIES]
      )
    );
    state.draftCategories = [...state.categories];
    return state.categories;
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", state.session.user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Erro ao carregar categorias do Supabase.", error);
    announceSyncStatus(
      "error",
      readSyncQueue(state.session.user.id).length,
      getSyncErrorMessage(error)
    );
    state.categories = normalizeCategories(
      loadData(
        getCategoriesStorageKey(),
        [...DEFAULT_CATEGORIES]
      )
    );
    state.draftCategories = [...state.categories];
    return state.categories;
  }

  const remoteCategories = data.map(mapSupabaseCategory);

  if (!remoteCategories.length) {
    state.categories = [...DEFAULT_CATEGORIES];
    state.draftCategories = [...state.categories];
    await persistCategories();
    return state.categories;
  }

  state.categories = remoteCategories;
  state.draftCategories = [...state.categories];
  persistLocalCategories();

  return state.categories;
}

export async function persistCategories() {
  persistLocalCategories();

  if (!state.session.isAuthenticated) return;

  const supabase = await getSupabaseClient();

  if (!supabase) return;

  if (!navigator.onLine) {
    enqueueSyncOperation(state.session.user.id, {
      resource: "categories",
      action: "replace",
      payload: [...state.categories]
    });
    return;
  }

  announceSyncStatus("syncing");

  const rows = state.categories.map((name, index) => ({
    user_id: state.session.user.id,
    name,
    position: index
  }));

  const { data: savedRows, error: loadError } = await supabase
    .from("categories")
    .select("id,name")
    .eq("user_id", state.session.user.id);

  if (loadError) {
    console.warn("Erro ao verificar categorias do Supabase.", loadError);
    enqueueSyncOperation(state.session.user.id, {
      resource: "categories",
      action: "replace",
      payload: [...state.categories]
    });
    announceSyncStatus("error", readSyncQueue(state.session.user.id).length, getSyncErrorMessage(loadError));
    return;
  }

  const activeNames = new Set(state.categories);
  const obsoleteIds = savedRows
    .filter(row => !activeNames.has(row.name))
    .map(row => row.id);

  if (obsoleteIds.length) {
    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .in("id", obsoleteIds)
      .eq("user_id", state.session.user.id);

    if (deleteError) {
      console.warn("Erro ao excluir categorias antigas do Supabase.", deleteError);
      enqueueSyncOperation(state.session.user.id, {
        resource: "categories",
        action: "replace",
        payload: [...state.categories]
      });
      announceSyncStatus("error", readSyncQueue(state.session.user.id).length, getSyncErrorMessage(deleteError));
      return;
    }
  }

  const { error } = await supabase
    .from("categories")
    .upsert(rows, { onConflict: "user_id,name" });

  if (error) {
    console.warn("Erro ao sincronizar categorias no Supabase.", error);
    enqueueSyncOperation(state.session.user.id, {
      resource: "categories",
      action: "replace",
      payload: [...state.categories]
    });
    announceSyncStatus("error", readSyncQueue(state.session.user.id).length, getSyncErrorMessage(error));
    return;
  }

  const pending = removeSyncOperation(state.session.user.id, item => {
    return item.resource === "categories";
  });
  announceQueueStatus(state.session.user.id);
}

export async function flushCategorySyncQueue() {
  const userId = state.session.user?.id;
  if (!userId || !navigator.onLine) return;

  const pending = readSyncQueue(userId).find(item => item.resource === "categories");
  if (!pending) return;

  state.categories = [...pending.payload];
  state.draftCategories = [...state.categories];
  await persistCategories();
  announceQueueStatus(userId);
}
