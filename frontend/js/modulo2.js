/**
 * Módulo 2 — Infraestructura Urbana
 * Endpoints (respaldados por sp_gestionar_vialidad_asentamiento):
 *   GET  /api/infraestructura/vialidades
 *   POST /api/infraestructura/vialidades
 *   GET  /api/infraestructura/asentamientos
 *   POST /api/infraestructura/asentamientos
 */
import { api, ApiClientError } from "./api.js";
import {
  ICONS,
  debounce,
  escapeHtml,
  fmtDateTime,
  fmtNum,
  fmtText,
  renderEmpty,
  renderLoading,
  renderPagination,
  showInlineAlert,
} from "./ui.js";

export async function renderModulo2(container) {
  const state = {
    asentPage: 1,
    asentLimit: 25,
    entidades: [],
  };

  container.innerHTML = `
    <section class="kpi-grid" aria-label="Resumen de infraestructura urbana">
      <article class="kpi-card">
        <span class="kpi-label">Tipos de Vialidad</span>
        <span id="m2-kpi-via" class="kpi-value">—</span>
        <span class="kpi-sub">Catálogo <code class="mono">tipo_de_vialidad</code></span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">Asentamientos (filtro)</span>
        <span id="m2-kpi-asent" class="kpi-value">—</span>
        <span class="kpi-sub">Tabla <code class="mono">asentamiento</code></span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">Procedimiento Almacenado</span>
        <span class="kpi-value" style="font-size: 0.98rem;">sp_gestionar_vialidad_asentamiento</span>
        <span class="kpi-sub">Operaciones ALTA / CONSULTAR</span>
      </article>
    </section>

    <div class="tabs-bar" role="tablist" aria-label="Catálogos de infraestructura urbana">
      <button class="tab-btn active" type="button" role="tab" aria-selected="true" data-m2-tab="vialidades">
        1. Tipos de Vialidad
      </button>
      <button class="tab-btn" type="button" role="tab" aria-selected="false" data-m2-tab="asentamientos">
        2. Asentamientos y Códigos Postales
      </button>
    </div>

    <!-- PANEL 1: VIALIDADES -->
    <section id="m2-panel-vialidades" class="m2-tab-panel split-grid">
      <article class="card">
        <div class="card-header">
          <div class="card-title-wrap">
            <h2 class="card-title">Alta de Tipo de Vialidad <span class="badge badge-ok">SP</span></h2>
            <p class="card-subtitle">Ejecuta <code class="mono">ALTA_VIALIDAD</code> con validación de ID único.</p>
          </div>
        </div>
        <div class="card-body">
          <form id="m2-via-form" class="form-grid-compact" novalidate>
            <div class="field">
              <label for="m2-via-id">ID Tipo de Vialidad <span class="req">*</span></label>
              <input id="m2-via-id" class="input input-mono" type="number" min="1" placeholder="Ej. 25 (o 1 para probar duplicado)" required />
              <span class="field-hint">Llave primaria manual. Ingrese un ID nuevo o uno existente para verificar rechazo del SP.</span>
            </div>
            <div class="field">
              <label for="m2-via-desc">Descripción de Vialidad <span class="req">*</span></label>
              <input id="m2-via-desc" class="input" type="text" maxlength="100" placeholder="Ej. PARQUE INDUSTRIAL, BOULEVARD..." required />
            </div>
            <div id="m2-via-alert"></div>
            <div class="form-actions">
              <button type="reset" class="btn btn-secondary btn-sm">Limpiar</button>
              <button id="m2-via-submit" type="submit" class="btn btn-emerald">
                ${ICONS.plus}
                <span>Registrar Vialidad</span>
              </button>
            </div>
          </form>
        </div>
      </article>

      <article class="card">
        <div class="card-header">
          <div class="card-title-wrap">
            <h2 class="card-title">Catálogo <code class="mono">tipo_de_vialidad</code></h2>
            <p class="card-subtitle">Consulta vía <code class="mono">CONSULTAR_VIALIDADES</code></p>
          </div>
          <div class="toolbar-actions">
            <input id="m2-via-q" class="input" type="search" style="width: 230px;" placeholder="Filtrar vialidades..." aria-label="Filtrar tipos de vialidad" />
          </div>
        </div>
        <div id="m2-via-table" class="table-responsive">${renderLoading()}</div>
      </article>
    </section>

    <!-- PANEL 2: ASENTAMIENTOS -->
    <section id="m2-panel-asentamientos" class="m2-tab-panel split-grid" hidden>
      <article class="card">
        <div class="card-header">
          <div class="card-title-wrap">
            <h2 class="card-title">Alta de Asentamiento <span class="badge badge-ok">SP</span></h2>
            <p class="card-subtitle">Ejecuta <code class="mono">ALTA_ASENTAMIENTO</code> validando FK a <code class="mono">entidad</code>.</p>
          </div>
        </div>
        <div class="card-body">
          <form id="m2-asent-form" class="form-grid-compact" novalidate>
            <div class="field">
              <label for="m2-asent-id">ID Asentamiento <span class="req">*</span></label>
              <input id="m2-asent-id" class="input input-mono" type="number" min="1" placeholder="Ej. 900001 (o 1 para probar duplicado)" required />
            </div>
            <div class="field">
              <label for="m2-asent-nombre">Nombre del Asentamiento <span class="req">*</span></label>
              <input id="m2-asent-nombre" class="input" type="text" maxlength="150" placeholder="Ej. RESIDENCIAL LAS ÁNIMAS" required />
            </div>
            <div class="field">
              <label for="m2-asent-cp">Código Postal</label>
              <input id="m2-asent-cp" class="input input-mono" type="text" maxlength="10" placeholder="Ej. 91190" />
            </div>
            <div class="field">
              <label for="m2-asent-ent">Entidad Federativa <span class="req">*</span></label>
              <select id="m2-asent-ent" class="select" required>
                <option value="">Cargando entidades...</option>
              </select>
            </div>
            <div id="m2-asent-alert"></div>
            <div class="form-actions">
              <button type="reset" class="btn btn-secondary btn-sm">Limpiar</button>
              <button id="m2-asent-submit" type="submit" class="btn btn-emerald">
                ${ICONS.plus}
                <span>Registrar Asentamiento</span>
              </button>
            </div>
          </form>
        </div>
      </article>

      <article class="card">
        <div class="card-header">
          <div class="card-title-wrap">
            <h2 class="card-title">Catálogo <code class="mono">asentamiento</code></h2>
            <p class="card-subtitle">Consulta paginada vía <code class="mono">CONSULTAR_ASENTAMIENTOS</code></p>
          </div>
        </div>
        <div class="card-body">
          <div class="toolbar">
            <div class="field">
              <label for="m2-asent-filter-ent">Filtrar por Entidad</label>
              <select id="m2-asent-filter-ent" class="select">
                <option value="">Todas las entidades</option>
              </select>
            </div>
            <div class="field">
              <label for="m2-asent-q">Buscar asentamiento</label>
              <input id="m2-asent-q" class="input" type="search" placeholder="Ej. CENTRO, ANIMAS, REFORMA..." />
            </div>
            <div class="field field-sm">
              <label for="m2-asent-limit">Por página</label>
              <select id="m2-asent-limit" class="select">
                <option value="15">15</option>
                <option value="25" selected>25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>
        <div id="m2-asent-table" class="table-responsive">${renderLoading()}</div>
        <div id="m2-asent-pag"></div>
      </article>
    </section>
  `;

  const el = {
    kpiVia: container.querySelector("#m2-kpi-via"),
    kpiAsent: container.querySelector("#m2-kpi-asent"),
    viaForm: container.querySelector("#m2-via-form"),
    viaId: container.querySelector("#m2-via-id"),
    viaDesc: container.querySelector("#m2-via-desc"),
    viaAlert: container.querySelector("#m2-via-alert"),
    viaSubmit: container.querySelector("#m2-via-submit"),
    viaQ: container.querySelector("#m2-via-q"),
    viaTable: container.querySelector("#m2-via-table"),

    asentForm: container.querySelector("#m2-asent-form"),
    asentId: container.querySelector("#m2-asent-id"),
    asentNombre: container.querySelector("#m2-asent-nombre"),
    asentCp: container.querySelector("#m2-asent-cp"),
    asentEnt: container.querySelector("#m2-asent-ent"),
    asentAlert: container.querySelector("#m2-asent-alert"),
    asentSubmit: container.querySelector("#m2-asent-submit"),
    asentFilterEnt: container.querySelector("#m2-asent-filter-ent"),
    asentQ: container.querySelector("#m2-asent-q"),
    asentLimit: container.querySelector("#m2-asent-limit"),
    asentTable: container.querySelector("#m2-asent-table"),
    asentPag: container.querySelector("#m2-asent-pag"),
  };

  let asentamientosLoaded = false;

  function switchTab(tabName) {
    container.querySelectorAll("[data-m2-tab]").forEach((btn) => {
      const active = btn.dataset.m2Tab === tabName;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    container.querySelectorAll(".m2-tab-panel").forEach((panel) => {
      panel.hidden = panel.id !== `m2-panel-${tabName}`;
    });
    if (tabName === "asentamientos" && !asentamientosLoaded) {
      asentamientosLoaded = true;
      loadAsentamientos(1);
    }
  }

  container.querySelectorAll("[data-m2-tab]").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.m2Tab));
  });

  async function loadEntidades() {
    const res = await api.get("/api/geografia/entidades");
    state.entidades = res.data || [];
    const options = state.entidades
      .map((e) => `<option value="${escapeHtml(e.Clave_Entidad)}">${escapeHtml(e.Clave_Entidad)} · ${escapeHtml(e.Nombre_Entidad)}</option>`)
      .join("");
    el.asentEnt.innerHTML = `<option value="">Seleccione una entidad...</option>${options}`;
    el.asentFilterEnt.innerHTML = `<option value="">Todas las entidades</option>${options}`;
    // Preseleccionar Veracruz (30) en filtro para consulta ágil inicial
    if (state.entidades.some((e) => Number(e.Clave_Entidad) === 30)) {
      el.asentFilterEnt.value = "30";
      el.asentEnt.value = "30";
    }
  }

  async function loadVialidades() {
    el.viaTable.innerHTML = renderLoading();
    try {
      const res = await api.get("/api/infraestructura/vialidades", { q: el.viaQ.value });
      const rows = res.data || [];
      if (!el.viaQ.value.trim()) {
        el.kpiVia.textContent = fmtNum(rows.length);
      }
      if (!rows.length) {
        el.viaTable.innerHTML = renderEmpty("Sin tipos de vialidad coincidentes");
        return;
      }
      el.viaTable.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>ID Vialidad</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `
              <tr>
                <td class="cell-mono">${fmtNum(r.id_tipo_vialidad)}</td>
                <td><strong>${escapeHtml(r.descripcion_vialidad)}</strong></td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      `;
    } catch (err) {
      el.viaTable.innerHTML = renderEmpty("Error al consultar vialidades", err.mensaje);
    }
  }

  async function loadAsentamientos(page = 1) {
    state.asentPage = page;
    state.asentLimit = Number(el.asentLimit.value) || 25;
    el.asentTable.innerHTML = renderLoading("Consultando asentamientos...");
    try {
      const res = await api.get("/api/infraestructura/asentamientos", {
        entidad: el.asentFilterEnt.value,
        q: el.asentQ.value,
        page: state.asentPage,
        limit: state.asentLimit,
      });
      const rows = res.data || [];
      el.kpiAsent.textContent = fmtNum(res.total ?? rows.length);

      if (!rows.length) {
        el.asentTable.innerHTML = renderEmpty("Sin asentamientos encontrados");
        el.asentPag.innerHTML = "";
        return;
      }

      el.asentTable.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre del Asentamiento</th>
              <th>Código Postal</th>
              <th>Entidad</th>
              <th>Fecha Registro</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `
              <tr>
                <td class="cell-mono">${fmtNum(r.id_asentamiento)}</td>
                <td><strong>${escapeHtml(r.nombre_asentamiento)}</strong></td>
                <td class="cell-mono">${fmtText(r.codigo_postal)}</td>
                <td><span class="badge badge-slate">${fmtNum(r.Clave_Entidad)}</span> ${escapeHtml(r.Nombre_Entidad)}</td>
                <td class="cell-mono">${fmtDateTime(r.fecha_registro)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      `;

      renderPagination(
        el.asentPag,
        { total: res.total, pagina: res.pagina, limite: res.limite, count: rows.length },
        (p) => loadAsentamientos(p)
      );
    } catch (err) {
      el.asentTable.innerHTML = renderEmpty("Error al consultar asentamientos", err.mensaje);
    }
  }

  // Submit ALTA_VIALIDAD
  el.viaForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    el.viaSubmit.disabled = true;
    showInlineAlert(el.viaAlert, { mensaje: "" });

    try {
      const res = await api.post(
        "/api/infraestructura/vialidades",
        {
          id_tipo_vialidad: el.viaId.value,
          descripcion_vialidad: el.viaDesc.value,
        },
        { spLabel: "sp_gestionar_vialidad_asentamiento (ALTA_VIALIDAD)" }
      );
      showInlineAlert(el.viaAlert, {
        tipo: "ok",
        titulo: "Registro confirmado por MySQL",
        mensaje: res.mensaje,
      });
      el.viaForm.reset();
      await loadVialidades();
    } catch (err) {
      showInlineAlert(el.viaAlert, {
        tipo: "error",
        titulo: "Validación del Stored Procedure",
        mensaje: err instanceof ApiClientError ? err.mensaje : "No se pudo registrar.",
        focus: true,
      });
    } finally {
      el.viaSubmit.disabled = false;
    }
  });

  // Submit ALTA_ASENTAMIENTO
  el.asentForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    el.asentSubmit.disabled = true;
    showInlineAlert(el.asentAlert, { mensaje: "" });

    try {
      const res = await api.post(
        "/api/infraestructura/asentamientos",
        {
          id_asentamiento: el.asentId.value,
          nombre_asentamiento: el.asentNombre.value,
          codigo_postal: el.asentCp.value || null,
          clave_entidad: el.asentEnt.value,
        },
        { spLabel: "sp_gestionar_vialidad_asentamiento (ALTA_ASENTAMIENTO)" }
      );
      showInlineAlert(el.asentAlert, {
        tipo: "ok",
        titulo: "Registro confirmado por MySQL",
        mensaje: res.mensaje,
      });
      const entSelected = el.asentEnt.value;
      el.asentForm.reset();
      el.asentEnt.value = entSelected;
      if (entSelected) el.asentFilterEnt.value = entSelected;
      await loadAsentamientos(1);
    } catch (err) {
      showInlineAlert(el.asentAlert, {
        tipo: "error",
        titulo: "Validación del Stored Procedure",
        mensaje: err instanceof ApiClientError ? err.mensaje : "No se pudo registrar.",
        focus: true,
      });
    } finally {
      el.asentSubmit.disabled = false;
    }
  });

  el.viaQ.addEventListener("input", debounce(() => loadVialidades(), 280));
  el.asentFilterEnt.addEventListener("change", () => loadAsentamientos(1));
  el.asentLimit.addEventListener("change", () => loadAsentamientos(1));
  el.asentQ.addEventListener("input", debounce(() => loadAsentamientos(1), 320));

  await Promise.allSettled([loadEntidades(), loadVialidades()]);
  // Cargar conteo inicial de asentamientos en segundo plano sin bloquear vialidades
  api.get("/api/infraestructura/asentamientos", { entidad: el.asentFilterEnt.value, page: 1, limit: 1 })
    .then((r) => { el.kpiAsent.textContent = fmtNum(r.total); })
    .catch(() => {});
}
