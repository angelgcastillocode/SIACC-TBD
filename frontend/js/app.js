/**
 * Orquestador SPA principal de SIACC.
 * - Enruta entre Módulo 1, Módulo 2, Módulo 3, Módulo 4 y Bitácora de Auditoría.
 * - Supervisa `/api/health` en tiempo real en la barra superior.
 * - Gestiona el sidebar responsivo en móvil/tablet.
 */
import { ROLES, api, getRole, setRole } from "./api.js";
import { renderBitacora } from "./bitacora.js";
import { renderModulo1 } from "./modulo1.js";
import { renderModulo2 } from "./modulo2.js";
import { renderModulo3 } from "./modulo3.js";
import { renderModulo4 } from "./modulo4.js";
import { renderLoading } from "./ui.js";

const ROUTES = {
  modulo1: {
    kicker: "Módulo 1 · Geografía",
    title: "Geografía y Territorialidad",
    render: renderModulo1,
  },
  modulo2: {
    kicker: "Módulo 2 · Infraestructura",
    title: "Infraestructura Urbana",
    render: renderModulo2,
  },
  modulo3: {
    kicker: "Módulo 3 · Clasificación",
    title: "Clasificación Económica",
    render: renderModulo3,
  },
  modulo4: {
    kicker: "Módulo 4 · Núcleo DENUE",
    title: "Establecimientos, Direcciones y Vialidades",
    render: renderModulo4,
  },
  bitacora: {
    kicker: "Auditoría · Triggers MySQL",
    title: "Bitácora de Auditoría en Tiempo Real",
    render: renderBitacora,
  },
};

let activeRoute = null;
let currentCleanup = null;

function toggleMobileSidebar(open) {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const openBtn = document.getElementById("sidebar-open-btn");
  if (!sidebar || !overlay) return;

  sidebar.classList.toggle("is-open", open);
  overlay.hidden = !open;
  openBtn?.setAttribute("aria-expanded", open ? "true" : "false");
}

/** Pinta el perfil activo: selector, chips de permisos y usuario MySQL real (vía /api/whoami). */
async function renderRoleIndicator() {
  const role = getRole();
  const meta = ROLES[role];
  const select = document.getElementById("role-select");
  const dbUser = document.getElementById("role-db-user");
  const perms = document.getElementById("role-perms");
  if (select && select.value !== role) select.value = role;
  if (dbUser) {
    dbUser.textContent = meta.dbUser;
    dbUser.title = `Rol MySQL: ${meta.dbRole}`;
  }
  if (perms) {
    perms.innerHTML =
      meta.allowed.map((p) => `<span class="perm-chip perm-yes">${p}</span>`).join("") +
      meta.denied.map((p) => `<span class="perm-chip perm-no" title="Denegado por MySQL">${p}</span>`).join("");
  }
  // Confirmación contra el motor: usuario autenticado realmente en MySQL
  try {
    const res = await api.get("/api/whoami", null, { silentError: true });
    if (dbUser && res.data?.usuario_mysql && getRole() === role) {
      dbUser.textContent = res.data.usuario_mysql;
      dbUser.title = `Rol MySQL activo: ${res.data.roles_activos || meta.dbRole}`;
    }
  } catch {
    // el health pill ya informa de problemas de conexión
  }
}

async function onRoleChange(role) {
  setRole(role);
  await renderRoleIndicator();
  checkHealth();
  // Recarga la vista actual para que se apliquen de inmediato los privilegios del nuevo perfil
  navigate(activeRoute || "modulo1", { updateHash: false });
}

async function checkHealth() {
  const pill = document.getElementById("health-pill");
  const text = document.getElementById("health-text");
  if (!pill || !text) return;

  pill.className = "health-pill health-checking";
  text.textContent = "Verificando BD...";

  try {
    const res = await api.get("/api/health", null, { silentError: true });
    if (res.ok && res.data?.db) {
      pill.className = "health-pill health-ok";
      text.textContent = "API + MySQL Conectados";
    } else {
      pill.className = "health-pill health-error";
      text.textContent = "BD sin respuesta";
    }
  } catch {
    pill.className = "health-pill health-error";
    text.textContent = "API Desconectada";
  }
}

async function navigate(routeName, { updateHash = true } = {}) {
  const key = ROUTES[routeName] ? routeName : "modulo1";
  const route = ROUTES[key];
  activeRoute = key;

  if (updateHash && window.location.hash !== `#${key}`) {
    window.history.replaceState(null, "", `#${key}`);
  }

  // Actualizar sidebar activo
  document.querySelectorAll(".nav-item[data-route]").forEach((btn) => {
    const isCurrent = btn.dataset.route === key;
    btn.classList.toggle("active", isCurrent);
    if (isCurrent) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });

  // Actualizar cabecera
  document.getElementById("view-kicker").textContent = route.kicker;
  document.getElementById("view-title").textContent = route.title;
  toggleMobileSidebar(false);

  // Limpiar intervalos o recursos del módulo anterior
  if (typeof currentCleanup === "function") {
    try {
      currentCleanup();
    } catch {
      // ignorar
    }
    currentCleanup = null;
  }

  const main = document.getElementById("main-content");
  main.innerHTML = renderLoading(`Cargando ${route.title}...`);

  try {
    const cleanup = await route.render(main, {
      onNavigate: (target) => navigate(target),
    });
    if (typeof cleanup === "function") {
      currentCleanup = cleanup;
    }
  } catch (err) {
    main.innerHTML = `
      <div class="inline-alert inline-alert-error" role="alert">
        <div class="inline-alert-body">
          <div class="inline-alert-title">No se pudo renderizar el módulo</div>
          <div>${err?.message || "Error inesperado al cargar la vista."}</div>
        </div>
      </div>
    `;
  }
}

function init() {
  // Navegación del sidebar
  document.querySelectorAll(".nav-item[data-route]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.route));
  });

  // Acceso rápido a bitácora desde la topbar
  document.getElementById("quick-bitacora-btn")?.addEventListener("click", () => navigate("bitacora"));

  // Sidebar móvil
  document.getElementById("sidebar-open-btn")?.addEventListener("click", () => toggleMobileSidebar(true));
  document.getElementById("sidebar-close-btn")?.addEventListener("click", () => toggleMobileSidebar(false));
  document.getElementById("sidebar-overlay")?.addEventListener("click", () => toggleMobileSidebar(false));

  // Telemetría SP dismiss
  document.getElementById("sp-telemetry-close")?.addEventListener("click", () => {
    const bar = document.getElementById("sp-telemetry-bar");
    if (bar) bar.hidden = true;
  });

  // Selector de perfil / rol activo
  document.getElementById("role-select")?.addEventListener("change", (ev) => onRoleChange(ev.target.value));
  renderRoleIndicator();

  // Health check inicial + refresco manual + monitoreo periódico
  document.getElementById("health-refresh-btn")?.addEventListener("click", checkHealth);
  checkHealth();
  window.setInterval(checkHealth, 30000);

  // Deep linking vía hash (#modulo1, #modulo2, #modulo3, #modulo4, #bitacora)
  window.addEventListener("hashchange", () => {
    const next = window.location.hash.replace(/^#/, "");
    if (ROUTES[next] && next !== activeRoute) {
      navigate(next, { updateHash: false });
    }
  });

  const initialRoute = window.location.hash.replace(/^#/, "");
  navigate(ROUTES[initialRoute] ? initialRoute : "modulo1", { updateHash: true });
}

document.addEventListener("DOMContentLoaded", init);
