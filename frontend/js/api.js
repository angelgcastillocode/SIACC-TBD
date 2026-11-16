/**
 * Cliente HTTP centralizado para la API SIACC.
 * - Maneja fetch(), query params, JSON y errores de red.
 * - Dispara notificaciones Toast con el `mensaje` exacto de los Stored Procedures.
 * - Actualiza la barra superior de telemetría cuando ocurre una llamada SP/escritura.
 */

const TOAST_ICONS = {
  ok: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
  info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
};

export class ApiClientError extends Error {
  constructor(mensaje, status = 0, data = null) {
    super(mensaje);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
  }
}

// ---------------------------------------------------------------------------
// Perfil / Rol activo (se envía en la cabecera X-SIACC-Role en cada petición)
// ---------------------------------------------------------------------------
export const ROLE_HEADER = "X-SIACC-Role";
const ROLE_STORAGE_KEY = "siacc.role";
const DEFAULT_ROLE = "admin";

export const ROLES = {
  consulta: {
    label: "Lector / Consulta",
    dbUser: "siacc_lector",
    dbRole: "rol_consulta",
    allowed: ["Consultas", "Vistas", "SP de lectura"],
    denied: ["Alta / edición", "Bajas", "Bitácora"],
    tone: "slate",
  },
  operador: {
    label: "Operador / Capturista",
    dbUser: "siacc_capturista",
    dbRole: "rol_operador",
    allowed: ["Consultas", "Altas", "Ediciones"],
    denied: ["Bajas", "Bitácora"],
    tone: "navy",
  },
  admin: {
    label: "Administrador",
    dbUser: "siacc_admin",
    dbRole: "rol_admin",
    allowed: ["Consultas", "Altas", "Ediciones", "Bajas", "Bitácora"],
    denied: [],
    tone: "ok",
  },
};

export function getRole() {
  let stored = null;
  try {
    stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
  } catch {
    // almacenamiento no disponible: se usa el perfil por defecto
  }
  return ROLES[stored] ? stored : DEFAULT_ROLE;
}

export function setRole(role) {
  if (!ROLES[role]) return;
  try {
    window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  } catch {
    // ignorar
  }
}

export function showToast({ tipo = "info", titulo = "SIACC", mensaje = "", duracion = 5200 }) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.setAttribute("role", tipo === "error" ? "alert" : "status");

  const iconHtml = TOAST_ICONS[tipo] || TOAST_ICONS.info;

  const body = document.createElement("div");
  body.className = "toast-body";

  const titleEl = document.createElement("div");
  titleEl.className = "toast-title";
  titleEl.textContent = titulo;

  const msgEl = document.createElement("div");
  msgEl.className = "toast-message";
  msgEl.textContent = mensaje;

  body.append(titleEl, msgEl);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn-icon btn-xs";
  closeBtn.setAttribute("aria-label", "Cerrar notificación");
  closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  const removeToast = () => {
    if (toast.parentNode) toast.remove();
  };
  closeBtn.addEventListener("click", removeToast);

  toast.insertAdjacentHTML("beforeend", iconHtml);
  toast.append(body, closeBtn);
  container.appendChild(toast);

  // Mantener máximo 4 toasts visibles
  while (container.children.length > 4) {
    container.firstElementChild.remove();
  }

  if (duracion > 0) {
    window.setTimeout(removeToast, duracion);
  }
}

function updateTelemetryBar({ ok, endpoint, mensaje, status }) {
  const bar = document.getElementById("sp-telemetry-bar");
  const badge = document.getElementById("sp-telemetry-badge");
  const epEl = document.getElementById("sp-telemetry-endpoint");
  const msgEl = document.getElementById("sp-telemetry-msg");
  if (!bar || !badge || !epEl || !msgEl) return;

  bar.hidden = false;
  badge.className = `badge ${ok ? "badge-ok" : "badge-error"}`;
  badge.textContent = ok ? `OK (${status})` : `ERROR (${status || "RED"})`;
  epEl.textContent = endpoint;
  msgEl.textContent = mensaje;
}

export function buildQuery(params = {}) {
  const sp = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null) continue;
    const str = String(val).trim();
    if (str === "") continue;
    sp.set(key, str);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Ejecuta una petición contra la API Flask (`/api/...`).
 * @param {string} path - Ruta relativa (ej. "/api/actividades").
 * @param {object} [options]
 * @param {string} [options.method="GET"]
 * @param {object} [options.params] - Query params.
 * @param {object} [options.body] - Cuerpo JSON para POST/PUT.
 * @param {boolean} [options.notifyOnSuccess] - Fuerza toast en GET (por defecto true en mutaciones).
 * @param {boolean} [options.silentError=false] - Si true, no lanza toast automático en error.
 * @param {string} [options.spLabel] - Nombre legible del SP/operación para telemetría.
 */
export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    params = null,
    body = undefined,
    notifyOnSuccess,
    silentError = false,
    spLabel = "",
  } = options;

  const upperMethod = method.toUpperCase();
  const isMutation = upperMethod !== "GET" && upperMethod !== "HEAD";
  const shouldNotifySuccess = notifyOnSuccess ?? isMutation;
  const url = `${path}${params ? buildQuery(params) : ""}`;
  const label = spLabel || `${upperMethod} ${path}`;

  const fetchOpts = {
    method: upperMethod,
    headers: { Accept: "application/json", [ROLE_HEADER]: getRole() },
  };
  if (body !== undefined) {
    fetchOpts.headers["Content-Type"] = "application/json";
    fetchOpts.body = JSON.stringify(body);
  }

  let response;
  let payload = null;

  try {
    response = await fetch(url, fetchOpts);
  } catch (networkErr) {
    const msg = `Error de red al conectar con el servidor SIACC (${networkErr.message || "sin respuesta"}).`;
    if (!silentError) {
      showToast({ tipo: "error", titulo: "Error de conexión", mensaje: msg, duracion: 7000 });
    }
    if (isMutation || shouldNotifySuccess) {
      updateTelemetryBar({ ok: false, endpoint: label, mensaje: msg, status: 0 });
    }
    throw new ApiClientError(msg, 0, null);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!payload || typeof payload !== "object") {
    const fallback = `Respuesta inesperada del servidor (HTTP ${response.status}).`;
    if (!silentError) {
      showToast({ tipo: "error", titulo: `HTTP ${response.status}`, mensaje: fallback });
    }
    throw new ApiClientError(fallback, response.status, null);
  }

  if (!response.ok || payload.ok === false) {
    const errMsg = payload.mensaje || `Operación rechazada (HTTP ${response.status}).`;
    if (!silentError) {
      const denied = response.status === 403;
      showToast({
        tipo: "error",
        titulo: denied
          ? `Acceso denegado (MySQL) · rol ${getRole()} · HTTP 403`
          : `${spLabel || "Respuesta MySQL / API"} · HTTP ${response.status}`,
        mensaje: errMsg,
        duracion: 8000,
      });
    }
    if (isMutation || spLabel) {
      updateTelemetryBar({ ok: false, endpoint: label, mensaje: errMsg, status: response.status });
    }
    throw new ApiClientError(errMsg, response.status, payload.data ?? null);
  }

  if (shouldNotifySuccess) {
    const okMsg = payload.mensaje || "Operación ejecutada correctamente.";
    showToast({
      tipo: "ok",
      titulo: `${spLabel || "Stored Procedure"} · HTTP ${response.status}`,
      mensaje: okMsg,
    });
    updateTelemetryBar({ ok: true, endpoint: label, mensaje: okMsg, status: response.status });
  }

  return payload;
}

export const api = {
  get: (path, params, opts = {}) => apiRequest(path, { ...opts, method: "GET", params }),
  post: (path, body, opts = {}) => apiRequest(path, { ...opts, method: "POST", body }),
  put: (path, body, opts = {}) => apiRequest(path, { ...opts, method: "PUT", body }),
  delete: (path, opts = {}) => apiRequest(path, { ...opts, method: "DELETE" }),
};
