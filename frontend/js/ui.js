/**
 * Helpers compartidos de UI, seguridad XSS (escapeHtml), paginación, modales e iconos SVG.
 */

export const ICONS = {
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`,
  filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`,
  chevronLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
  clear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
};

export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function fmtNum(n) {
  if (n === null || n === undefined || n === "") return "—";
  const num = Number(n);
  return Number.isFinite(num) ? num.toLocaleString("es-MX") : escapeHtml(n);
}

export function fmtText(v, fallback = "—") {
  if (v === null || v === undefined || String(v).trim() === "") return fallback;
  return escapeHtml(v);
}

export function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return escapeHtml(iso);
  return d.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function debounce(fn, waitMs = 320) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), waitMs);
  };
}

export function renderLoading(texto = "Consultando MySQL...") {
  return `
    <div class="loading-panel">
      <span class="spinner" aria-hidden="true"></span>
      <span>${escapeHtml(texto)}</span>
    </div>
  `;
}

export function renderEmpty(titulo = "Sin resultados", detalle = "Ajuste los filtros e intente nuevamente.") {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(titulo)}</strong>
      <span>${escapeHtml(detalle)}</span>
    </div>
  `;
}

/**
 * Muestra un mensaje de resultado SP / validación en un contenedor inline y opcionalmente enfoca.
 */
export function showInlineAlert(container, { tipo = "ok", titulo = "", mensaje = "", focus = false }) {
  if (!container) return;
  if (!mensaje) {
    container.innerHTML = "";
    return;
  }
  const role = tipo === "error" ? "alert" : "status";
  container.innerHTML = `
    <div class="inline-alert inline-alert-${tipo}" role="${role}" tabindex="-1">
      <div class="inline-alert-body">
        ${titulo ? `<div class="inline-alert-title">${escapeHtml(titulo)}</div>` : ""}
        <div>${escapeHtml(mensaje)}</div>
      </div>
      <button type="button" class="btn-icon btn-xs" data-dismiss-alert aria-label="Ocultar aviso">
        ${ICONS.clear}
      </button>
    </div>
  `;
  const box = container.querySelector(".inline-alert");
  container.querySelector("[data-dismiss-alert]")?.addEventListener("click", () => {
    container.innerHTML = "";
  });
  if (focus && box) {
    box.focus({ preventScroll: false });
  }
}

/**
 * Renderiza barra de paginación compatible tanto con `{ total, pagina, limite }`
 * como con `{ pagina, limite, hay_mas }` (usado en vw_establecimientos_detalle).
 */
export function renderPagination(container, state, onPageChange) {
  if (!container) return;
  const page = state.pagina || 1;
  const limit = state.limite || 25;
  const count = state.count ?? 0;
  const hasTotal = typeof state.total === "number";
  const totalPages = hasTotal ? Math.max(1, Math.ceil(state.total / limit)) : null;
  const canPrev = page > 1;
  const canNext = hasTotal ? page < totalPages : Boolean(state.hay_mas);

  const resumen = hasTotal
    ? `Página <strong>${page}</strong> de <strong>${fmtNum(totalPages)}</strong> · ${fmtNum(state.total)} registro(s) en total`
    : `Página <strong>${page}</strong> · Mostrando <strong>${count}</strong> registro(s)${canNext ? " (hay más resultados)" : ""}`;

  container.innerHTML = `
    <div class="pagination-bar">
      <div>${resumen}</div>
      <div class="pagination-controls">
        <button type="button" class="btn btn-secondary btn-sm" data-page="${page - 1}" ${canPrev ? "" : "disabled"}>
          ${ICONS.chevronLeft}
          <span>Anterior</span>
        </button>
        <span class="cell-mono">Pág. ${page}</span>
        <button type="button" class="btn btn-secondary btn-sm" data-page="${page + 1}" ${canNext ? "" : "disabled"}>
          <span>Siguiente</span>
          ${ICONS.chevronRight}
        </button>
      </div>
    </div>
  `;

  container.querySelectorAll("button[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = Number(btn.dataset.page);
      if (target >= 1) onPageChange(target);
    });
  });
}

// ============================================================================
// Gestor de Modal Accesible (Escape, backdrop, focus return)
// ============================================================================
let lastFocusedElement = null;
let onCloseCallback = null;

function ensureModalWired() {
  const backdrop = document.getElementById("modal-backdrop");
  const closeBtn = document.getElementById("modal-close-btn");
  if (!backdrop || backdrop.dataset.wired) return;
  backdrop.dataset.wired = "1";

  closeBtn?.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (ev) => {
    if (ev.target === backdrop) closeModal();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !backdrop.hidden) {
      closeModal();
    }
  });
}

export function openModal({ kicker = "", title = "", bodyHtml = "", footerHtml = "", size = "", onClose = null }) {
  ensureModalWired();
  const backdrop = document.getElementById("modal-backdrop");
  const dialog = document.getElementById("modal-dialog");
  const kickerEl = document.getElementById("modal-kicker");
  const titleEl = document.getElementById("modal-title");
  const bodyEl = document.getElementById("modal-body");
  const footerEl = document.getElementById("modal-footer");

  lastFocusedElement = document.activeElement;
  onCloseCallback = onClose;

  dialog.className = "modal-dialog" + (size ? ` modal-${size}` : "");
  if (kicker) {
    kickerEl.textContent = kicker;
    kickerEl.hidden = false;
  } else {
    kickerEl.hidden = true;
  }
  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;

  if (footerHtml) {
    footerEl.innerHTML = footerHtml;
    footerEl.hidden = false;
  } else {
    footerEl.innerHTML = "";
    footerEl.hidden = true;
  }

  backdrop.hidden = false;
  document.body.style.overflow = "hidden";
  dialog.focus();

  return { bodyEl, footerEl, dialog };
}

export function closeModal() {
  const backdrop = document.getElementById("modal-backdrop");
  if (!backdrop || backdrop.hidden) return;
  backdrop.hidden = true;
  document.body.style.overflow = "";
  if (typeof onCloseCallback === "function") {
    const cb = onCloseCallback;
    onCloseCallback = null;
    cb();
  }
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}
