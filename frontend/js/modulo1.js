/**
 * Módulo 1 — Geografía y Territorialidad
 * Endpoints:
 *   GET /api/geografia/entidades
 *   GET /api/geografia/municipios
 *   GET /api/geografia/localidades
 *   GET /api/geografia/territorio/rango  (sp_consultar_territorio_rango / BETWEEN)
 */
import { api, ApiClientError } from "./api.js";
import {
  ICONS,
  debounce,
  escapeHtml,
  fmtNum,
  renderEmpty,
  renderLoading,
  renderPagination,
  showInlineAlert,
} from "./ui.js";

export async function renderModulo1(container) {
  const state = {
    entidades: [],
    activeTab: "entidades", // 'entidades' | 'municipios' | 'localidades'
    munPage: 1,
    munLimit: 25,
    locPage: 1,
    locLimit: 25,
    totals: { entidades: 0, municipios: null, localidades: null, rango: null },
  };

  container.innerHTML = `
    <section class="kpi-grid" aria-label="Resumen territorial">
      <article class="kpi-card">
        <span class="kpi-label">Entidades Federativas</span>
        <span id="m1-kpi-ent" class="kpi-value">—</span>
        <span class="kpi-sub">Catálogo oficial <code class="mono">entidad</code></span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">Municipios (filtro)</span>
        <span id="m1-kpi-mun" class="kpi-value">—</span>
        <span class="kpi-sub">Tabla <code class="mono">municipio</code></span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">Localidades (filtro)</span>
        <span id="m1-kpi-loc" class="kpi-value">—</span>
        <span class="kpi-sub">Tabla <code class="mono">localidad</code></span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">Último rango BETWEEN</span>
        <span id="m1-kpi-rango" class="kpi-value">—</span>
        <span class="kpi-sub"><code class="mono">sp_consultar_territorio_rango</code></span>
      </article>
    </section>

    <!-- Panel principal de consulta por rangos (BETWEEN) -->
    <section class="card">
      <div class="card-header">
        <div class="card-title-wrap">
          <h2 class="card-title">
            Consulta Territorial por Rangos (<code class="mono">BETWEEN</code>)
            <span class="badge badge-navy">SP Lectura</span>
          </h2>
          <p class="card-subtitle">
            Ejecuta <code class="mono">CALL sp_consultar_territorio_rango(p_clave_entidad, p_cve_mun_inicio, p_cve_mun_fin)</code>.
            Si el rango se ingresa invertido, el procedimiento lo normaliza automáticamente.
          </p>
        </div>
      </div>

      <div class="card-body">
        <form id="m1-rango-form" class="toolbar" novalidate>
          <div class="field">
            <label for="m1-rango-entidad">Entidad Federativa (opcional)</label>
            <select id="m1-rango-entidad" class="select">
              <option value="">Todas las entidades</option>
            </select>
          </div>
          <div class="field field-sm">
            <label for="m1-rango-inicio">Clave Mun. Inicio <span class="req">*</span></label>
            <input id="m1-rango-inicio" class="input input-mono" type="number" min="0" value="1" required />
          </div>
          <div class="field field-sm">
            <label for="m1-rango-fin">Clave Mun. Fin <span class="req">*</span></label>
            <input id="m1-rango-fin" class="input input-mono" type="number" min="0" value="15" required />
          </div>
          <div class="toolbar-actions">
            <button id="m1-rango-submit" class="btn btn-primary" type="submit">
              ${ICONS.filter}
              <span>Consultar Rango</span>
            </button>
          </div>
        </form>

        <div id="m1-rango-alert" style="margin-top: 12px;"></div>
      </div>

      <div id="m1-rango-results" class="table-responsive"></div>
    </section>

    <!-- Explorador de catálogos territoriales -->
    <section class="card">
      <div class="card-header">
        <div class="card-title-wrap">
          <h2 class="card-title">Explorador de Catálogos Geográficos</h2>
          <p class="card-subtitle">Consulta directa sobre <code class="mono">entidad</code>, <code class="mono">municipio</code> y <code class="mono">localidad</code></p>
        </div>
        <div class="tabs-bar" role="tablist" aria-label="Catálogos geográficos">
          <button class="tab-btn active" type="button" role="tab" aria-selected="true" data-m1-tab="entidades">Entidades</button>
          <button class="tab-btn" type="button" role="tab" aria-selected="false" data-m1-tab="municipios">Municipios</button>
          <button class="tab-btn" type="button" role="tab" aria-selected="false" data-m1-tab="localidades">Localidades</button>
        </div>
      </div>

      <!-- TAB ENTIDADES -->
      <div id="m1-panel-entidades" class="m1-tab-panel">
        <div class="card-body">
          <div class="toolbar">
            <div class="field">
              <label for="m1-ent-q">Buscar entidad por nombre</label>
              <input id="m1-ent-q" class="input" type="search" placeholder="Ej. VERACRUZ, JALISCO, PUEBLA..." />
            </div>
            <div class="toolbar-actions">
              <button id="m1-ent-clear" class="btn btn-secondary btn-sm" type="button">Limpiar</button>
            </div>
          </div>
        </div>
        <div id="m1-ent-table" class="table-responsive">${renderLoading()}</div>
      </div>

      <!-- TAB MUNICIPIOS -->
      <div id="m1-panel-municipios" class="m1-tab-panel" hidden>
        <div class="card-body">
          <div class="toolbar">
            <div class="field">
              <label for="m1-mun-ent">Filtrar por Entidad</label>
              <select id="m1-mun-ent" class="select">
                <option value="">Todas las entidades</option>
              </select>
            </div>
            <div class="field">
              <label for="m1-mun-q">Buscar municipio</label>
              <input id="m1-mun-q" class="input" type="search" placeholder="Ej. Xalapa, Boca del Río..." />
            </div>
            <div class="field field-sm">
              <label for="m1-mun-limit">Por página</label>
              <select id="m1-mun-limit" class="select">
                <option value="15">15</option>
                <option value="25" selected>25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>
        <div id="m1-mun-table" class="table-responsive"></div>
        <div id="m1-mun-pag"></div>
      </div>

      <!-- TAB LOCALIDADES -->
      <div id="m1-panel-localidades" class="m1-tab-panel" hidden>
        <div class="card-body">
          <div class="toolbar">
            <div class="field field-sm">
              <label for="m1-loc-mun">Clave Municipio</label>
              <input id="m1-loc-mun" class="input input-mono" type="number" min="1" placeholder="Ej. 1, 87..." />
            </div>
            <div class="field">
              <label for="m1-loc-q">Buscar localidad por nombre</label>
              <input id="m1-loc-q" class="input" type="search" placeholder="Ej. Centro, Las Trancas..." />
            </div>
            <div class="field field-sm">
              <label for="m1-loc-limit">Por página</label>
              <select id="m1-loc-limit" class="select">
                <option value="15">15</option>
                <option value="25" selected>25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div class="toolbar-actions">
              <button id="m1-loc-btn" class="btn btn-secondary" type="button">${ICONS.search}<span>Buscar</span></button>
            </div>
          </div>
          <p class="field-hint" style="margin: 8px 0 0;">
            Nota de esquema: <code class="mono">localidad</code> se relaciona por <code class="mono">Clave_Municipio</code> (sin clave de entidad en la tabla oficial).
          </p>
        </div>
        <div id="m1-loc-table" class="table-responsive"></div>
        <div id="m1-loc-pag"></div>
      </div>
    </section>
  `;

  // Referencias DOM
  const el = {
    kpiEnt: container.querySelector("#m1-kpi-ent"),
    kpiMun: container.querySelector("#m1-kpi-mun"),
    kpiLoc: container.querySelector("#m1-kpi-loc"),
    kpiRango: container.querySelector("#m1-kpi-rango"),
    rangoForm: container.querySelector("#m1-rango-form"),
    rangoEntidad: container.querySelector("#m1-rango-entidad"),
    rangoInicio: container.querySelector("#m1-rango-inicio"),
    rangoFin: container.querySelector("#m1-rango-fin"),
    rangoAlert: container.querySelector("#m1-rango-alert"),
    rangoResults: container.querySelector("#m1-rango-results"),
    rangoSubmit: container.querySelector("#m1-rango-submit"),
    entQ: container.querySelector("#m1-ent-q"),
    entClear: container.querySelector("#m1-ent-clear"),
    entTable: container.querySelector("#m1-ent-table"),
    munEnt: container.querySelector("#m1-mun-ent"),
    munQ: container.querySelector("#m1-mun-q"),
    munLimit: container.querySelector("#m1-mun-limit"),
    munTable: container.querySelector("#m1-mun-table"),
    munPag: container.querySelector("#m1-mun-pag"),
    locMun: container.querySelector("#m1-loc-mun"),
    locQ: container.querySelector("#m1-loc-q"),
    locLimit: container.querySelector("#m1-loc-limit"),
    locBtn: container.querySelector("#m1-loc-btn"),
    locTable: container.querySelector("#m1-loc-table"),
    locPag: container.querySelector("#m1-loc-pag"),
  };

  function switchTab(tabName) {
    state.activeTab = tabName;
    container.querySelectorAll("[data-m1-tab]").forEach((btn) => {
      const isActive = btn.dataset.m1Tab === tabName;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    container.querySelectorAll(".m1-tab-panel").forEach((panel) => {
      panel.hidden = panel.id !== `m1-panel-${tabName}`;
    });
    if (tabName === "municipios" && state.totals.municipios === null) loadMunicipios(1);
    if (tabName === "localidades" && state.totals.localidades === null) loadLocalidades(1);
  }

  container.querySelectorAll("[data-m1-tab]").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.m1Tab));
  });

  // 1) Consulta BETWEEN vía sp_consultar_territorio_rango
  async function runRango(notify = false) {
    el.rangoSubmit.disabled = true;
    el.rangoResults.innerHTML = renderLoading("Ejecutando sp_consultar_territorio_rango...");
    showInlineAlert(el.rangoAlert, { mensaje: "" });

    try {
      const res = await api.get(
        "/api/geografia/territorio/rango",
        {
          entidad: el.rangoEntidad.value,
          mun_inicio: el.rangoInicio.value,
          mun_fin: el.rangoFin.value,
        },
        { notifyOnSuccess: notify, spLabel: "sp_consultar_territorio_rango" }
      );
      const rows = res.data || [];
      el.kpiRango.textContent = fmtNum(rows.length);
      showInlineAlert(el.rangoAlert, {
        tipo: "ok",
        titulo: "sp_consultar_territorio_rango",
        mensaje: res.mensaje,
      });

      if (!rows.length) {
        el.rangoResults.innerHTML = renderEmpty("Sin municipios en ese rango", "Pruebe otro rango de claves municipales.");
        return;
      }

      el.rangoResults.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Clave Entidad</th>
              <th>Entidad Federativa</th>
              <th>Clave Municipio</th>
              <th>Municipio</th>
              <th class="text-right">Total Localidades</th>
              <th class="text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `
              <tr>
                <td class="cell-mono">${fmtNum(r.Clave_Entidad)}</td>
                <td>${escapeHtml(r.Nombre_Entidad)}</td>
                <td class="cell-mono">${fmtNum(r.Clave_Municipio)}</td>
                <td><strong>${escapeHtml(r.Nombre_Municipio)}</strong></td>
                <td class="cell-mono text-right">${fmtNum(r.total_localidades)}</td>
                <td class="cell-actions">
                  <button
                    type="button"
                    class="btn btn-secondary btn-xs"
                    data-ver-loc="${escapeHtml(r.Clave_Municipio)}"
                  >Ver localidades</button>
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      `;

      el.rangoResults.querySelectorAll("[data-ver-loc]").forEach((btn) => {
        btn.addEventListener("click", () => {
          el.locMun.value = btn.dataset.verLoc;
          switchTab("localidades");
          loadLocalidades(1);
        });
      });
    } catch (err) {
      el.rangoResults.innerHTML = "";
      showInlineAlert(el.rangoAlert, {
        tipo: "error",
        titulo: "Validación de rango",
        mensaje: err instanceof ApiClientError ? err.mensaje : "No se pudo ejecutar la consulta.",
        focus: true,
      });
    } finally {
      el.rangoSubmit.disabled = false;
    }
  }

  el.rangoForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    runRango(true);
  });

  // 2) Entidades
  async function loadEntidades() {
    el.entTable.innerHTML = renderLoading();
    try {
      const res = await api.get("/api/geografia/entidades", { q: el.entQ.value });
      const rows = res.data || [];
      if (!el.entQ.value.trim()) {
        state.entidades = rows;
        el.kpiEnt.textContent = fmtNum(rows.length);
        const optionsHtml = rows
          .map((e) => `<option value="${escapeHtml(e.Clave_Entidad)}">${escapeHtml(e.Clave_Entidad)} · ${escapeHtml(e.Nombre_Entidad)}</option>`)
          .join("");
        el.rangoEntidad.innerHTML = `<option value="">Todas las entidades</option>${optionsHtml}`;
        el.munEnt.innerHTML = `<option value="">Todas las entidades</option>${optionsHtml}`;
        // Preseleccionar Veracruz (30) si existe para una demo inicial rápida en BETWEEN
        if (rows.some((r) => Number(r.Clave_Entidad) === 30) && !el.rangoEntidad.dataset.init) {
          el.rangoEntidad.value = "30";
          el.rangoEntidad.dataset.init = "1";
        }
      }

      if (!rows.length) {
        el.entTable.innerHTML = renderEmpty("Sin entidades coincidentes");
        return;
      }

      el.entTable.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Clave Entidad</th>
              <th>Nombre de la Entidad</th>
              <th class="text-right">Explorar</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `
              <tr>
                <td class="cell-mono">${fmtNum(r.Clave_Entidad)}</td>
                <td><strong>${escapeHtml(r.Nombre_Entidad)}</strong></td>
                <td class="cell-actions">
                  <button type="button" class="btn btn-secondary btn-xs" data-ent-mun="${escapeHtml(r.Clave_Entidad)}">
                    Municipios
                  </button>
                  <button type="button" class="btn btn-secondary btn-xs" data-ent-rango="${escapeHtml(r.Clave_Entidad)}">
                    Usar en BETWEEN
                  </button>
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      `;

      el.entTable.querySelectorAll("[data-ent-mun]").forEach((btn) => {
        btn.addEventListener("click", () => {
          el.munEnt.value = btn.dataset.entMun;
          switchTab("municipios");
          loadMunicipios(1);
        });
      });

      el.entTable.querySelectorAll("[data-ent-rango]").forEach((btn) => {
        btn.addEventListener("click", () => {
          el.rangoEntidad.value = btn.dataset.entRango;
          runRango(true);
          el.rangoForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      });
    } catch (err) {
      el.entTable.innerHTML = renderEmpty("Error al cargar entidades", err.mensaje);
    }
  }

  // 3) Municipios
  async function loadMunicipios(page = 1) {
    state.munPage = page;
    state.munLimit = Number(el.munLimit.value) || 25;
    el.munTable.innerHTML = renderLoading();
    try {
      const res = await api.get("/api/geografia/municipios", {
        entidad: el.munEnt.value,
        q: el.munQ.value,
        page: state.munPage,
        limit: state.munLimit,
      });
      const rows = res.data || [];
      state.totals.municipios = res.total ?? rows.length;
      el.kpiMun.textContent = fmtNum(state.totals.municipios);

      if (!rows.length) {
        el.munTable.innerHTML = renderEmpty("Sin municipios para este filtro");
        el.munPag.innerHTML = "";
        return;
      }

      el.munTable.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Clave Ent.</th>
              <th>Entidad</th>
              <th>Clave Mun.</th>
              <th>Nombre del Municipio</th>
              <th class="text-right">Localidades</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `
              <tr>
                <td class="cell-mono">${fmtNum(r.Clave_Entidad)}</td>
                <td>${escapeHtml(r.Nombre_Entidad)}</td>
                <td class="cell-mono">${fmtNum(r.Clave_Municipio)}</td>
                <td><strong>${escapeHtml(r.Nombre_Municipio)}</strong></td>
                <td class="cell-actions">
                  <button type="button" class="btn btn-secondary btn-xs" data-mun-loc="${escapeHtml(r.Clave_Municipio)}">
                    Ver localidades
                  </button>
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      `;

      el.munTable.querySelectorAll("[data-mun-loc]").forEach((btn) => {
        btn.addEventListener("click", () => {
          el.locMun.value = btn.dataset.munLoc;
          switchTab("localidades");
          loadLocalidades(1);
        });
      });

      renderPagination(
        el.munPag,
        { total: res.total, pagina: res.pagina, limite: res.limite, count: rows.length },
        (p) => loadMunicipios(p)
      );
    } catch (err) {
      el.munTable.innerHTML = renderEmpty("Error al cargar municipios", err.mensaje);
    }
  }

  // 4) Localidades
  async function loadLocalidades(page = 1) {
    state.locPage = page;
    state.locLimit = Number(el.locLimit.value) || 25;
    el.locTable.innerHTML = renderLoading();
    try {
      const res = await api.get("/api/geografia/localidades", {
        municipio: el.locMun.value,
        q: el.locQ.value,
        page: state.locPage,
        limit: state.locLimit,
      });
      const rows = res.data || [];
      state.totals.localidades = res.total ?? rows.length;
      el.kpiLoc.textContent = fmtNum(state.totals.localidades);

      if (!rows.length) {
        el.locTable.innerHTML = renderEmpty("Sin localidades encontradas");
        el.locPag.innerHTML = "";
        return;
      }

      el.locTable.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Clave Municipio</th>
              <th>Clave Localidad</th>
              <th>Nombre de la Localidad</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `
              <tr>
                <td class="cell-mono">${fmtNum(r.Clave_Municipio)}</td>
                <td class="cell-mono">${fmtNum(r.Clave_Localidad)}</td>
                <td><strong>${escapeHtml(r.Nombre_Localidad)}</strong></td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      `;
      renderPagination(
        el.locPag,
        { total: res.total, pagina: res.pagina, limite: res.limite, count: rows.length },
        (p) => loadLocalidades(p)
      );
    } catch (err) {
      el.locTable.innerHTML = renderEmpty("Error al cargar localidades", err.mensaje);
    }
  }

  // Listeners de búsqueda con debounce
  el.entQ.addEventListener("input", debounce(() => loadEntidades(), 280));
  el.entClear.addEventListener("click", () => {
    el.entQ.value = "";
    loadEntidades();
  });

  el.munEnt.addEventListener("change", () => loadMunicipios(1));
  el.munLimit.addEventListener("change", () => loadMunicipios(1));
  el.munQ.addEventListener("input", debounce(() => loadMunicipios(1), 320));

  el.locBtn.addEventListener("click", () => loadLocalidades(1));
  el.locLimit.addEventListener("change", () => loadLocalidades(1));
  el.locQ.addEventListener("input", debounce(() => loadLocalidades(1), 320));
  el.locMun.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      loadLocalidades(1);
    }
  });

  // Carga inicial paralela de entidades, conteos rápidos y rango BETWEEN inicial
  await loadEntidades();
  await Promise.allSettled([
    runRango(false),
    api.get("/api/geografia/municipios", { page: 1, limit: 1 }).then((r) => {
      el.kpiMun.textContent = fmtNum(r.total);
    }),
    api.get("/api/geografia/localidades", { page: 1, limit: 1 }).then((r) => {
      el.kpiLoc.textContent = fmtNum(r.total);
    }),
  ]);
}
