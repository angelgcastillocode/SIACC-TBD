/**
 * Módulo 4 — Núcleo de Establecimientos, Direcciones y Detalles de Vialidad
 * Endpoints:
 *   GET    /api/establecimientos                      (vw_establecimientos_detalle)
 *   GET    /api/establecimientos/<id>                 (establecimiento + direcciones + vialidades)
 *   POST   /api/establecimientos                      (sp_registrar_establecimiento_completo)
 *   PUT    /api/establecimientos/<id>                 (sp_actualizar_establecimiento)
 *   DELETE /api/establecimientos/<id>                 (sp_eliminar_establecimiento)
 *   POST/DELETE /api/direcciones                      (sp_agregar_direccion / sp_eliminar_direccion)
 *   POST/DELETE /api/detalles-vialidad                (sp_agregar_detalle_vialidad / sp_eliminar_detalle_vialidad)
 */
import { api, ApiClientError } from "./api.js";
import {
  ICONS,
  closeModal,
  debounce,
  escapeHtml,
  fmtNum,
  fmtText,
  openModal,
  renderEmpty,
  renderLoading,
  renderPagination,
  showInlineAlert,
} from "./ui.js";

const PERSONAL_OPCIONES = [
  "0 a 5 personas",
  "6 a 10 personas",
  "11 a 30 personas",
  "31 a 50 personas",
  "51 a 100 personas",
  "101 a 250 personas",
  "251 y más personas",
];

const TIPO_UNIECO_OPCIONES = ["Fijo", "Semifijo"];

export async function renderModulo4(container, { onNavigate } = {}) {
  const catalogs = {
    entidades: [],
    actividades: [],
    vialidades: [],
  };

  const state = {
    page: 1,
    limit: 25,
    rows: [],
    hayMas: false,
  };

  container.innerHTML = `
    <section class="card">
      <div class="card-header">
        <div class="card-title-wrap">
          <h2 class="card-title">
            Directorio Comercial (<code class="mono">vw_establecimientos_detalle</code>)
            <span class="badge badge-navy">CRUD vía SP</span>
          </h2>
          <p class="card-subtitle">
            Consulte establecimientos con paginación fluida y ejecute altas, ediciones y bajas transaccionales auditadas por triggers.
          </p>
        </div>
        <div class="toolbar-actions">
          <button id="m4-new-btn" class="btn btn-emerald" type="button">
            ${ICONS.plus}
            <span>Registrar Establecimiento</span>
          </button>
        </div>
      </div>

      <div class="card-body">
        <form id="m4-filter-form" class="toolbar" novalidate>
          <div class="field">
            <label for="m4-q">Buscar (nombre, razón social, CLEE)</label>
            <input id="m4-q" class="input" type="search" placeholder="Ej. ABARROTES, DISTRIBUIDORA, CLEE..." />
          </div>
          <div class="field">
            <label for="m4-f-ent">Entidad</label>
            <select id="m4-f-ent" class="select">
              <option value="">Todas las entidades</option>
            </select>
          </div>
          <div class="field">
            <label for="m4-f-mun">Municipio</label>
            <select id="m4-f-mun" class="select" disabled>
              <option value="">Seleccione una entidad primero</option>
            </select>
          </div>
          <div class="field">
            <label for="m4-f-act">Actividad Económica</label>
            <select id="m4-f-act" class="select">
              <option value="">Todas las actividades</option>
            </select>
          </div>
          <div class="field field-sm">
            <label for="m4-limit">Por página</label>
            <select id="m4-limit" class="select">
              <option value="15">15</option>
              <option value="25" selected>25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <div class="toolbar-actions">
            <button id="m4-clear-btn" class="btn btn-secondary btn-sm" type="button">Limpiar</button>
            <button class="btn btn-primary btn-sm" type="submit">${ICONS.search}<span>Filtrar</span></button>
          </div>
        </form>

        <div id="m4-recent-banner" style="margin-top: 12px;"></div>
      </div>

      <div id="m4-table" class="table-responsive">${renderLoading()}</div>
      <div id="m4-pag"></div>
    </section>
  `;

  const el = {
    newBtn: container.querySelector("#m4-new-btn"),
    filterForm: container.querySelector("#m4-filter-form"),
    qInput: container.querySelector("#m4-q"),
    fEnt: container.querySelector("#m4-f-ent"),
    fMun: container.querySelector("#m4-f-mun"),
    fAct: container.querySelector("#m4-f-act"),
    limitSel: container.querySelector("#m4-limit"),
    clearBtn: container.querySelector("#m4-clear-btn"),
    recentBanner: container.querySelector("#m4-recent-banner"),
    table: container.querySelector("#m4-table"),
    pag: container.querySelector("#m4-pag"),
  };

  async function loadCatalogs() {
    const [entRes, actRes, viaRes] = await Promise.all([
      api.get("/api/geografia/entidades"),
      api.get("/api/actividades", { page: 1, limit: 500 }),
      api.get("/api/infraestructura/vialidades"),
    ]);
    catalogs.entidades = entRes.data || [];
    catalogs.actividades = actRes.data || [];
    catalogs.vialidades = viaRes.data || [];

    el.fEnt.innerHTML =
      `<option value="">Todas las entidades</option>` +
      catalogs.entidades
        .map((e) => `<option value="${escapeHtml(e.Clave_Entidad)}">${escapeHtml(e.Clave_Entidad)} · ${escapeHtml(e.Nombre_Entidad)}</option>`)
        .join("");

    el.fAct.innerHTML =
      `<option value="">Todas las actividades</option>` +
      catalogs.actividades
        .map((a) => `<option value="${escapeHtml(a.id_actividad)}">${escapeHtml(a.id_actividad)} · ${escapeHtml(a.descripcion_actividad)}</option>`)
        .join("");
  }

  async function populateMunicipiosSelect(selectEl, claveEntidad, selectedMun = "") {
    if (!claveEntidad) {
      selectEl.innerHTML = `<option value="">Seleccione una entidad primero</option>`;
      selectEl.disabled = true;
      return;
    }
    selectEl.disabled = true;
    selectEl.innerHTML = `<option value="">Cargando municipios...</option>`;
    try {
      const res = await api.get("/api/geografia/municipios", { entidad: claveEntidad, page: 1, limit: 500 });
      const list = res.data || [];
      selectEl.innerHTML =
        `<option value="">${list.length ? "Seleccione municipio..." : "Sin municipios"}</option>` +
        list
          .map((m) => `<option value="${escapeHtml(m.Clave_Municipio)}">${escapeHtml(m.Clave_Municipio)} · ${escapeHtml(m.Nombre_Municipio)}</option>`)
          .join("");
      selectEl.disabled = false;
      if (selectedMun !== "" && selectedMun !== null && selectedMun !== undefined) {
        selectEl.value = String(selectedMun);
      }
    } catch {
      selectEl.innerHTML = `<option value="">Error al cargar municipios</option>`;
    }
  }

  async function populateLocalidadesSelect(selectEl, claveMunicipio, selectedLoc = "") {
    if (!claveMunicipio) {
      selectEl.innerHTML = `<option value="">— Sin especificar (opcional) —</option>`;
      selectEl.disabled = true;
      return;
    }
    selectEl.disabled = true;
    selectEl.innerHTML = `<option value="">Cargando localidades...</option>`;
    try {
      const res = await api.get("/api/geografia/localidades", { municipio: claveMunicipio, page: 1, limit: 500 });
      const list = res.data || [];
      selectEl.innerHTML =
        `<option value="">— Sin especificar (opcional) —</option>` +
        list
          .map((l) => `<option value="${escapeHtml(l.Clave_Localidad)}">${escapeHtml(l.Clave_Localidad)} · ${escapeHtml(l.Nombre_Localidad)}</option>`)
          .join("");
      selectEl.disabled = false;
      if (selectedLoc !== "" && selectedLoc !== null && selectedLoc !== undefined) {
        selectEl.value = String(selectedLoc);
      }
    } catch {
      selectEl.innerHTML = `<option value="">— Sin especificar —</option>`;
      selectEl.disabled = false;
    }
  }

  async function loadEstablecimientos(page = 1) {
    state.page = page;
    state.limit = Number(el.limitSel.value) || 25;
    el.table.innerHTML = renderLoading("Consultando vw_establecimientos_detalle...");

    try {
      const res = await api.get("/api/establecimientos", {
        q: el.qInput.value,
        entidad: el.fEnt.value,
        municipio: el.fMun.value,
        actividad: el.fAct.value,
        page: state.page,
        limit: state.limit,
      });
      state.rows = res.data || [];
      state.hayMas = Boolean(res.hay_mas);

      if (!state.rows.length) {
        el.table.innerHTML = renderEmpty("Sin establecimientos coincidentes", "Pruebe otros criterios o limpie los filtros.");
        el.pag.innerHTML = "";
        return;
      }

      el.table.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>ID Estab.</th>
              <th>Nombre Comercial</th>
              <th>Actividad Económica</th>
              <th>Ubicación (Entidad / Municipio)</th>
              <th>Asentamiento / CP</th>
              <th>Personal</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${state.rows
              .map(
                (r) => `
              <tr>
                <td class="cell-mono">
                  <strong>${fmtNum(r.id_establecimiento)}</strong>
                  <div class="field-hint mono">Dir #${fmtNum(r.id_direccion)}</div>
                </td>
                <td>
                  <div class="cell-truncate" title="${escapeHtml(r.nom_estab)}"><strong>${escapeHtml(r.nom_estab)}</strong></div>
                  <div class="cell-truncate field-hint" title="${escapeHtml(r.raz_social || "")}">
                    ${r.raz_social ? escapeHtml(r.raz_social) : `<span class="mono">${fmtText(r.clee, "Sin CLEE")}</span>`}
                  </div>
                </td>
                <td>
                  <div class="cell-truncate" title="${escapeHtml(r.descripcion_actividad || "")}">
                    <span class="badge badge-slate">${fmtText(r.id_actividad ?? r.codigo_act)}</span>
                    ${fmtText(r.descripcion_actividad, "No catalogada")}
                  </div>
                </td>
                <td>
                  <div>${escapeHtml(r.Nombre_Municipio)}</div>
                  <div class="field-hint">${escapeHtml(r.Nombre_Entidad)}</div>
                </td>
                <td>
                  <div class="cell-truncate" title="${escapeHtml(r.nombre_asentamiento || "")}">
                    ${fmtText(r.nombre_asentamiento)}
                  </div>
                  <div class="field-hint mono">CP ${fmtText(r.cod_postal)} · Ext ${fmtText(r.numero_ext)}</div>
                </td>
                <td><span class="badge badge-navy">${fmtText(r.per_ocu)}</span></td>
                <td class="cell-actions">
                  <button type="button" class="btn btn-secondary btn-xs" data-view="${escapeHtml(r.id_establecimiento)}" title="Ver ficha completa y vialidades">
                    ${ICONS.eye}
                    <span>Ficha</span>
                  </button>
                  <button type="button" class="btn btn-secondary btn-xs" data-edit="${escapeHtml(r.id_establecimiento)}" title="Editar establecimiento">
                    ${ICONS.edit}
                    <span>Editar</span>
                  </button>
                  <button type="button" class="btn btn-outline-danger btn-xs" data-del="${escapeHtml(r.id_establecimiento)}" title="Eliminar establecimiento">
                    ${ICONS.trash}
                    <span>Baja</span>
                  </button>
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      `;

      el.table.querySelectorAll("[data-view]").forEach((b) =>
        b.addEventListener("click", () => openDetailModal(Number(b.dataset.view)))
      );
      el.table.querySelectorAll("[data-edit]").forEach((b) =>
        b.addEventListener("click", () => openEditModal(Number(b.dataset.edit)))
      );
      el.table.querySelectorAll("[data-del]").forEach((b) =>
        b.addEventListener("click", () => openDeleteModal(Number(b.dataset.del)))
      );

      renderPagination(
        el.pag,
        { pagina: res.pagina, limite: res.limite, hay_mas: res.hay_mas, count: state.rows.length },
        (p) => loadEstablecimientos(p)
      );
    } catch (err) {
      el.table.innerHTML = renderEmpty("Error al consultar establecimientos", err.mensaje);
    }
  }

  function buildEntidadOptions(selected = "") {
    return (
      `<option value="">Seleccione entidad...</option>` +
      catalogs.entidades
        .map(
          (e) =>
            `<option value="${escapeHtml(e.Clave_Entidad)}" ${String(e.Clave_Entidad) === String(selected) ? "selected" : ""}>${escapeHtml(e.Clave_Entidad)} · ${escapeHtml(e.Nombre_Entidad)}</option>`
        )
        .join("")
    );
  }

  function buildActividadOptions(selected = "") {
    return (
      `<option value="">Seleccione actividad...</option>` +
      catalogs.actividades
        .map(
          (a) =>
            `<option value="${escapeHtml(a.id_actividad)}" ${String(a.id_actividad) === String(selected) ? "selected" : ""}>${escapeHtml(a.id_actividad)} · ${escapeHtml(a.descripcion_actividad)}</option>`
        )
        .join("")
    );
  }

  // ==========================================================================
  // MODAL DE ALTA COMPLETA (sp_registrar_establecimiento_completo)
  // ==========================================================================
  function openCreateModal() {
    const viaOpts =
      `<option value="">Seleccione tipo de vialidad...</option>` +
      catalogs.vialidades
        .map((v) => `<option value="${escapeHtml(v.id_tipo_vialidad)}">${escapeHtml(v.id_tipo_vialidad)} · ${escapeHtml(v.descripcion_vialidad)}</option>`)
        .join("");

    const perOcuOpts =
      `<option value="">— Seleccione —</option>` +
      PERSONAL_OPCIONES.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");

    const tipoOpts =
      `<option value="">— Seleccione —</option>` +
      TIPO_UNIECO_OPCIONES.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");

    const { bodyEl, footerEl } = openModal({
      kicker: "CALL sp_registrar_establecimiento_completo(...)",
      title: "Registrar Establecimiento, Dirección y Vialidad",
      size: "xl",
      bodyHtml: `
        <form id="m4-create-form" class="form-grid" novalidate>
          <div class="form-section-title field-span-full">1. Datos del Establecimiento</div>

          <div class="field">
            <label for="c-id-est">ID Establecimiento <span class="req">*</span></label>
            <input id="c-id-est" class="input input-mono" type="number" min="1" placeholder="Ej. 9900001" required />
          </div>
          <div class="field">
            <label for="c-id-dir">ID Dirección (opcional)</label>
            <input id="c-id-dir" class="input input-mono" type="number" min="1" placeholder="Por defecto igual al ID Estab." />
          </div>
          <div class="field">
            <label for="c-clee">CLEE</label>
            <input id="c-clee" class="input input-mono" type="text" maxlength="50" placeholder="Ej. 3008743111000001" />
          </div>

          <div class="field field-span-2">
            <label for="c-nom">Nombre del Establecimiento <span class="req">*</span></label>
            <input id="c-nom" class="input" type="text" placeholder="Ej. DISTRIBUIDORA COMERCIAL DEL GOLFO" required />
          </div>
          <div class="field">
            <label for="c-raz">Razón Social</label>
            <input id="c-raz" class="input" type="text" placeholder="Ej. COMERCIAL DEL GOLFO SA DE CV" />
          </div>

          <div class="field field-span-2">
            <label for="c-act">Actividad Económica <span class="req">*</span></label>
            <select id="c-act" class="select" required>${buildActividadOptions()}</select>
          </div>
          <div class="field">
            <label for="c-per">Personal Ocupado</label>
            <select id="c-per" class="select">${perOcuOpts}</select>
          </div>

          <div class="field">
            <label for="c-tipo-uni">Tipo Unidad Económica</label>
            <select id="c-tipo-uni" class="select">${tipoOpts}</select>
          </div>
          <div class="field">
            <label for="c-tel">Teléfono</label>
            <input id="c-tel" class="input input-mono" type="text" maxlength="50" placeholder="Ej. 2288123456" />
          </div>
          <div class="field">
            <label for="c-email">Correo Electrónico</label>
            <input id="c-email" class="input" type="email" maxlength="100" placeholder="contacto@empresa.mx" />
          </div>
          <div class="field">
            <label for="c-www">Sitio Web</label>
            <input id="c-www" class="input" type="text" maxlength="100" placeholder="www.empresa.mx" />
          </div>
          <div class="field">
            <label for="c-fecha">Fecha de Alta (YYYY-MM)</label>
            <input id="c-fecha" class="input input-mono" type="text" maxlength="50" value="2026-11" />
          </div>

          <div class="form-section-title field-span-full">2. Ubicación Geográfica y Dirección</div>

          <div class="field">
            <label for="c-ent">Entidad Federativa <span class="req">*</span></label>
            <select id="c-ent" class="select" required>${buildEntidadOptions("30")}</select>
          </div>
          <div class="field">
            <label for="c-mun">Municipio (filtrado por entidad) <span class="req">*</span></label>
            <select id="c-mun" class="select" required disabled>
              <option value="">Cargando municipios...</option>
            </select>
          </div>
          <div class="field">
            <label for="c-loc">Localidad (opcional)</label>
            <select id="c-loc" class="select" disabled>
              <option value="">Seleccione un municipio...</option>
            </select>
          </div>

          <div class="field field-span-2">
            <label for="c-asent-q">Asentamiento (FK obligatoria · filtrado por entidad) <span class="req">*</span></label>
            <div class="asentamiento-picker">
              <div class="input-group">
                <input id="c-asent-q" class="input" type="search" placeholder="Filtrar asentamientos de esta entidad por nombre..." aria-label="Filtrar asentamientos de la entidad" />
                <button id="c-asent-buscar" type="button" class="btn btn-secondary btn-sm">Buscar</button>
              </div>
              <select id="c-asent" class="select" required>
                <option value="">Cargando asentamientos...</option>
              </select>
            </div>
            <span class="field-hint">Muestra hasta 100 coincidencias por consulta para mantener fluidez.</span>
          </div>

          <div class="field">
            <label for="c-num-ext">Número Exterior</label>
            <input id="c-num-ext" class="input input-mono" type="text" maxlength="50" placeholder="Ej. 142-A" />
          </div>
          <div class="field">
            <label for="c-cp">Código Postal</label>
            <input id="c-cp" class="input input-mono" type="text" maxlength="10" placeholder="Ej. 91000" />
          </div>
          <div class="field">
            <label for="c-lat">Latitud</label>
            <input id="c-lat" class="input input-mono" type="text" maxlength="50" placeholder="Ej. 19.5438" />
          </div>
          <div class="field">
            <label for="c-lon">Longitud</label>
            <input id="c-lon" class="input input-mono" type="text" maxlength="50" placeholder="Ej. -96.9102" />
          </div>

          <div class="form-section-title field-span-full">3. Vialidad Principal (<code class="mono">detalle_vialidad</code>)</div>

          <div class="field">
            <label for="c-tipo-via">Tipo de Vialidad <span class="req">*</span></label>
            <select id="c-tipo-via" class="select" required>${viaOpts}</select>
          </div>
          <div class="field field-span-2">
            <label for="c-nom-via">Nombre de la Vialidad</label>
            <input id="c-nom-via" class="input" type="text" placeholder="Ej. AV. LÁZARO CÁRDENAS" />
            <span class="field-hint">Si se especifica, se inserta automáticamente en <code class="mono">detalle_vialidad</code>.</span>
          </div>

          <div id="m4-create-alert" class="field-span-full"></div>
        </form>
      `,
      footerHtml: `
        <button id="c-cancel" type="button" class="btn btn-secondary">Cancelar</button>
        <button id="c-submit" type="submit" form="m4-create-form" class="btn btn-emerald">
          ${ICONS.plus}
          <span>Registrar en MySQL</span>
        </button>
      `,
    });

    const form = bodyEl.querySelector("#m4-create-form");
    const entSel = bodyEl.querySelector("#c-ent");
    const munSel = bodyEl.querySelector("#c-mun");
    const locSel = bodyEl.querySelector("#c-loc");
    const asentQ = bodyEl.querySelector("#c-asent-q");
    const asentBuscar = bodyEl.querySelector("#c-asent-buscar");
    const asentSel = bodyEl.querySelector("#c-asent");
    const cpInput = bodyEl.querySelector("#c-cp");
    const alertBox = bodyEl.querySelector("#m4-create-alert");
    const submitBtn = footerEl.querySelector("#c-submit");

    footerEl.querySelector("#c-cancel").addEventListener("click", closeModal);

    let asentamientosCache = [];

    async function loadAsentamientosForEntity() {
      const ent = entSel.value;
      if (!ent) {
        asentSel.innerHTML = `<option value="">Seleccione una entidad primero</option>`;
        asentSel.disabled = true;
        return;
      }
      asentSel.disabled = true;
      asentSel.innerHTML = `<option value="">Cargando asentamientos...</option>`;
      try {
        const res = await api.get("/api/infraestructura/asentamientos", {
          entidad: ent,
          q: asentQ.value,
          page: 1,
          limit: 100,
        });
        asentamientosCache = res.data || [];
        asentSel.innerHTML =
          `<option value="">${asentamientosCache.length ? `Seleccione asentamiento (${fmtNum(res.total)} disp.)...` : "Sin asentamientos coincidentes"}</option>` +
          asentamientosCache
            .map(
              (a) =>
                `<option value="${escapeHtml(a.id_asentamiento)}">${escapeHtml(a.id_asentamiento)} · ${escapeHtml(a.nombre_asentamiento)}${a.codigo_postal ? ` (CP ${escapeHtml(a.codigo_postal)})` : ""}</option>`
            )
            .join("");
        asentSel.disabled = false;
      } catch {
        asentSel.innerHTML = `<option value="">Error al cargar asentamientos</option>`;
      }
    }

    async function onEntidadChange() {
      const ent = entSel.value;
      await Promise.all([
        populateMunicipiosSelect(munSel, ent),
        populateLocalidadesSelect(locSel, ""),
        loadAsentamientosForEntity(),
      ]);
    }

    entSel.addEventListener("change", onEntidadChange);
    munSel.addEventListener("change", () => populateLocalidadesSelect(locSel, munSel.value));
    asentBuscar.addEventListener("click", loadAsentamientosForEntity);
    asentQ.addEventListener("input", debounce(loadAsentamientosForEntity, 320));

    // Autocompletar CP al elegir asentamiento si el campo CP está vacío
    asentSel.addEventListener("change", () => {
      const chosen = asentamientosCache.find((a) => String(a.id_asentamiento) === asentSel.value);
      if (chosen?.codigo_postal && !cpInput.value.trim()) {
        cpInput.value = chosen.codigo_postal;
      }
    });

    // Inicializar Veracruz (30) por defecto si está seleccionado
    if (entSel.value) {
      onEntidadChange();
    }

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      submitBtn.disabled = true;
      showInlineAlert(alertBox, { mensaje: "" });

      const payload = {
        id_establecimiento: bodyEl.querySelector("#c-id-est").value,
        id_direccion: bodyEl.querySelector("#c-id-dir").value || null,
        clee: bodyEl.querySelector("#c-clee").value || null,
        nom_estab: bodyEl.querySelector("#c-nom").value,
        raz_social: bodyEl.querySelector("#c-raz").value || null,
        id_actividad: bodyEl.querySelector("#c-act").value,
        per_ocu: bodyEl.querySelector("#c-per").value || null,
        tipoUniEco: bodyEl.querySelector("#c-tipo-uni").value || null,
        telefono: bodyEl.querySelector("#c-tel").value || null,
        correoelec: bodyEl.querySelector("#c-email").value || null,
        www: bodyEl.querySelector("#c-www").value || null,
        fecha_alta: bodyEl.querySelector("#c-fecha").value || null,
        cve_ent: entSel.value,
        cve_mun: munSel.value,
        cve_loc: locSel.value || null,
        id_asentamiento: asentSel.value,
        numero_ext: bodyEl.querySelector("#c-num-ext").value || null,
        cod_postal: cpInput.value || null,
        latitud: bodyEl.querySelector("#c-lat").value || null,
        longitud: bodyEl.querySelector("#c-lon").value || null,
        id_tipo_vialidad: bodyEl.querySelector("#c-tipo-via").value,
        nombre_vialidad: bodyEl.querySelector("#c-nom-via").value || null,
      };

      try {
        const res = await api.post("/api/establecimientos", payload, {
          spLabel: "sp_registrar_establecimiento_completo",
        });
        const createdId = Number(payload.id_establecimiento);
        closeModal();
        showCreatedBanner(createdId, payload.nom_estab, res.mensaje);
        await loadEstablecimientos(1);
      } catch (err) {
        showInlineAlert(alertBox, {
          tipo: "error",
          titulo: "Error devuelto por sp_registrar_establecimiento_completo",
          mensaje: err instanceof ApiClientError ? err.mensaje : "No se pudo registrar el establecimiento.",
          focus: true,
        });
        submitBtn.disabled = false;
      }
    });
  }

  function showCreatedBanner(idEst, nombre, spMsg) {
    el.recentBanner.innerHTML = `
      <div class="inline-alert inline-alert-ok" role="status">
        <div class="inline-alert-body">
          <div class="inline-alert-title">${escapeHtml(spMsg)}</div>
          <div>
            Registro <code class="mono">#${escapeHtml(idEst)}</code> (${escapeHtml(nombre)}) guardado en MySQL y auditado por <code class="mono">trg_establecimiento_after_insert</code>.
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
            <button type="button" class="btn btn-secondary btn-xs" id="m4-banner-ver">Ver Ficha #${escapeHtml(idEst)}</button>
            <button type="button" class="btn btn-secondary btn-xs" id="m4-banner-filtrar">Filtrar por nombre</button>
            ${typeof onNavigate === "function" ? `<button type="button" class="btn btn-emerald btn-xs" id="m4-banner-bitacora">Ver en Bitácora</button>` : ""}
          </div>
        </div>
        <button type="button" class="btn-icon btn-xs" id="m4-banner-close" aria-label="Ocultar aviso">${ICONS.clear}</button>
      </div>
    `;
    el.recentBanner.querySelector("#m4-banner-close")?.addEventListener("click", () => {
      el.recentBanner.innerHTML = "";
    });
    el.recentBanner.querySelector("#m4-banner-ver")?.addEventListener("click", () => openDetailModal(idEst));
    el.recentBanner.querySelector("#m4-banner-filtrar")?.addEventListener("click", () => {
      el.qInput.value = nombre.trim();
      loadEstablecimientos(1);
    });
    el.recentBanner.querySelector("#m4-banner-bitacora")?.addEventListener("click", () => onNavigate("bitacora"));
  }

  // ==========================================================================
  // MODAL DE EDICIÓN (sp_actualizar_establecimiento)
  // ==========================================================================
  async function openEditModal(idEstablecimiento) {
    const { bodyEl, footerEl } = openModal({
      kicker: `CALL sp_actualizar_establecimiento(${idEstablecimiento}, ...)`,
      title: `Editar Establecimiento #${idEstablecimiento}`,
      size: "lg",
      bodyHtml: renderLoading("Cargando ficha actual desde vw_establecimientos_detalle..."),
    });

    try {
      const detail = await api.get(`/api/establecimientos/${idEstablecimiento}`);
      const est = detail.data.establecimiento;

      const perOcuOpts =
        `<option value="">— Sin cambios —</option>` +
        PERSONAL_OPCIONES.map(
          (o) => `<option value="${escapeHtml(o)}" ${est.per_ocu === o ? "selected" : ""}>${escapeHtml(o)}</option>`
        ).join("");

      bodyEl.innerHTML = `
        <form id="m4-edit-form" class="form-grid" novalidate>
          <div class="field field-span-2">
            <label for="e-nom">Nombre del Establecimiento <span class="req">*</span></label>
            <input id="e-nom" class="input" type="text" value="${escapeHtml(est.nom_estab || "")}" required />
          </div>
          <div class="field">
            <label for="e-raz">Razón Social</label>
            <input id="e-raz" class="input" type="text" value="${escapeHtml(est.raz_social || "")}" />
          </div>

          <div class="field field-span-2">
            <label for="e-act">Actividad Económica</label>
            <select id="e-act" class="select">${buildActividadOptions(est.id_actividad)}</select>
          </div>
          <div class="field">
            <label for="e-per">Personal Ocupado</label>
            <select id="e-per" class="select">${perOcuOpts}</select>
          </div>

          <div class="field">
            <label for="e-tel">Teléfono</label>
            <input id="e-tel" class="input input-mono" type="text" maxlength="50" value="${escapeHtml(est.telefono || "")}" />
          </div>
          <div class="field">
            <label for="e-email">Correo Electrónico</label>
            <input id="e-email" class="input" type="email" maxlength="100" value="${escapeHtml(est.correoelec || "")}" />
          </div>
          <div class="field">
            <label for="e-www">Sitio Web</label>
            <input id="e-www" class="input" type="text" maxlength="100" value="${escapeHtml(est.www || "")}" />
          </div>

          <div class="form-section-title field-span-full">Dirección Asociada</div>

          <div class="field">
            <label for="e-num-ext">Número Exterior</label>
            <input id="e-num-ext" class="input input-mono" type="text" maxlength="50" value="${escapeHtml(est.numero_ext || "")}" />
          </div>
          <div class="field">
            <label for="e-cp">Código Postal</label>
            <input id="e-cp" class="input input-mono" type="text" maxlength="10" value="${escapeHtml(est.cod_postal || "")}" />
          </div>
          <div class="field">
            <label for="e-ent">Entidad Federativa</label>
            <select id="e-ent" class="select">${buildEntidadOptions(est.Clave_Entidad)}</select>
          </div>
          <div class="field">
            <label for="e-mun">Municipio (filtrado por entidad)</label>
            <select id="e-mun" class="select"></select>
          </div>

          <div id="m4-edit-alert" class="field-span-full"></div>
        </form>
      `;

      footerEl.innerHTML = `
        <button id="e-cancel" type="button" class="btn btn-secondary">Cancelar</button>
        <button id="e-save" type="submit" form="m4-edit-form" class="btn btn-primary">Guardar Cambios</button>
      `;
      footerEl.hidden = false;

      const editForm = bodyEl.querySelector("#m4-edit-form");
      const entSel = bodyEl.querySelector("#e-ent");
      const munSel = bodyEl.querySelector("#e-mun");
      const alertBox = bodyEl.querySelector("#m4-edit-alert");
      const saveBtn = footerEl.querySelector("#e-save");

      footerEl.querySelector("#e-cancel").addEventListener("click", closeModal);

      await populateMunicipiosSelect(munSel, est.Clave_Entidad, est.Clave_Municipio);
      entSel.addEventListener("change", () => populateMunicipiosSelect(munSel, entSel.value));

      editForm.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        saveBtn.disabled = true;
        showInlineAlert(alertBox, { mensaje: "" });

        const payload = {
          nom_estab: bodyEl.querySelector("#e-nom").value || null,
          raz_social: bodyEl.querySelector("#e-raz").value || null,
          id_actividad: bodyEl.querySelector("#e-act").value || null,
          per_ocu: bodyEl.querySelector("#e-per").value || null,
          telefono: bodyEl.querySelector("#e-tel").value || null,
          correoelec: bodyEl.querySelector("#e-email").value || null,
          www: bodyEl.querySelector("#e-www").value || null,
          numero_ext: bodyEl.querySelector("#e-num-ext").value || null,
          cod_postal: bodyEl.querySelector("#e-cp").value || null,
          cve_ent: entSel.value || null,
          cve_mun: munSel.value || null,
        };

        try {
          await api.put(`/api/establecimientos/${idEstablecimiento}`, payload, {
            spLabel: "sp_actualizar_establecimiento",
          });
          closeModal();
          await loadEstablecimientos(state.page);
        } catch (err) {
          showInlineAlert(alertBox, {
            tipo: "error",
            titulo: "Error devuelto por sp_actualizar_establecimiento",
            mensaje: err instanceof ApiClientError ? err.mensaje : "No se pudo actualizar.",
            focus: true,
          });
          saveBtn.disabled = false;
        }
      });
    } catch (err) {
      bodyEl.innerHTML = "";
      showInlineAlert(bodyEl, {
        tipo: "error",
        titulo: "No se pudo cargar el establecimiento",
        mensaje: err instanceof ApiClientError ? err.mensaje : "Error inesperado.",
      });
    }
  }

  // ==========================================================================
  // MODAL DE BAJA CONTROLADA (sp_eliminar_establecimiento)
  // ==========================================================================
  function openDeleteModal(idEstablecimiento) {
    const row = state.rows.find((r) => Number(r.id_establecimiento) === idEstablecimiento);
    const { bodyEl, footerEl } = openModal({
      kicker: `CALL sp_eliminar_establecimiento(${idEstablecimiento})`,
      title: `Confirmar Baja de Establecimiento #${idEstablecimiento}`,
      bodyHtml: `
        <div class="inline-alert inline-alert-error">
          <div class="inline-alert-body">
            <div class="inline-alert-title">Acción transaccional irreversible</div>
            <div>
              Esta operación eliminará el establecimiento <strong>${escapeHtml(row?.nom_estab || `#${idEstablecimiento}`)}</strong>,
              sus direcciones y sus detalles de vialidad asociados. El trigger
              <code class="mono">trg_establecimiento_after_delete</code> registrará la instantánea <code class="mono">OLD</code> en <code class="mono">bitacora_auditoria</code>.
            </div>
          </div>
        </div>
        <div id="m4-del-alert"></div>
      `,
      footerHtml: `
        <button id="d-cancel" type="button" class="btn btn-secondary">Cancelar</button>
        <button id="d-confirm" type="button" class="btn btn-danger">
          ${ICONS.trash}
          <span>Confirmar Eliminación</span>
        </button>
      `,
    });

    const delAlert = bodyEl.querySelector("#m4-del-alert");
    const confirmBtn = footerEl.querySelector("#d-confirm");
    footerEl.querySelector("#d-cancel").addEventListener("click", closeModal);

    confirmBtn.addEventListener("click", async () => {
      confirmBtn.disabled = true;
      try {
        await api.delete(`/api/establecimientos/${idEstablecimiento}`, {
          spLabel: "sp_eliminar_establecimiento",
        });
        closeModal();
        await loadEstablecimientos(state.page);
      } catch (err) {
        showInlineAlert(delAlert, {
          tipo: "error",
          titulo: "Error devuelto por sp_eliminar_establecimiento",
          mensaje: err instanceof ApiClientError ? err.mensaje : "No se pudo eliminar.",
          focus: true,
        });
        confirmBtn.disabled = false;
      }
    });
  }

  // ==========================================================================
  // MODAL DE FICHA DETALLADA + GESTIÓN DE DIRECCIONES Y DETALLE_VIALIDAD
  // ==========================================================================
  async function openDetailModal(idEstablecimiento) {
    const { bodyEl, footerEl } = openModal({
      kicker: `vw_establecimientos_detalle · detalle_vialidad`,
      title: `Ficha del Establecimiento #${idEstablecimiento}`,
      size: "xl",
      bodyHtml: renderLoading("Cargando ficha completa, direcciones y vialidades..."),
      footerHtml: `<button id="det-close" type="button" class="btn btn-secondary">Cerrar</button>`,
    });
    footerEl.querySelector("#det-close").addEventListener("click", closeModal);

    async function refreshDetail() {
      try {
        const res = await api.get(`/api/establecimientos/${idEstablecimiento}`);
        const { establecimiento: e, direcciones, vialidades } = res.data;

        const dirOpts = direcciones
          .map((d) => `<option value="${escapeHtml(d.id_direccion)}">Dir #${escapeHtml(d.id_direccion)} (${fmtText(d.Nombre_Municipio)})</option>`)
          .join("");
        const tipoViaOpts = catalogs.vialidades
          .map((v) => `<option value="${escapeHtml(v.id_tipo_vialidad)}">${escapeHtml(v.descripcion_vialidad)}</option>`)
          .join("");

        bodyEl.innerHTML = `
          <div class="detail-kv-grid">
            <div class="detail-kv-item"><span class="detail-kv-label">Nombre Comercial</span><span class="detail-kv-val"><strong>${fmtText(e.nom_estab)}</strong></span></div>
            <div class="detail-kv-item"><span class="detail-kv-label">Razón Social</span><span class="detail-kv-val">${fmtText(e.raz_social)}</span></div>
            <div class="detail-kv-item"><span class="detail-kv-label">CLEE</span><span class="detail-kv-val mono">${fmtText(e.clee)}</span></div>
            <div class="detail-kv-item"><span class="detail-kv-label">Actividad</span><span class="detail-kv-val">${fmtText(e.descripcion_actividad)}</span></div>
            <div class="detail-kv-item"><span class="detail-kv-label">Personal Ocupado</span><span class="detail-kv-val">${fmtText(e.per_ocu)}</span></div>
            <div class="detail-kv-item"><span class="detail-kv-label">Tipo Unidad</span><span class="detail-kv-val">${fmtText(e.tipoUniEco)}</span></div>
            <div class="detail-kv-item"><span class="detail-kv-label">Teléfono</span><span class="detail-kv-val mono">${fmtText(e.telefono)}</span></div>
            <div class="detail-kv-item"><span class="detail-kv-label">Correo</span><span class="detail-kv-val">${fmtText(e.correoelec)}</span></div>
            <div class="detail-kv-item"><span class="detail-kv-label">Sitio Web</span><span class="detail-kv-val">${fmtText(e.www)}</span></div>
            <div class="detail-kv-item"><span class="detail-kv-label">Fecha Alta</span><span class="detail-kv-val mono">${fmtText(e.fecha_alta)}</span></div>
          </div>

          <!-- Direcciones asociadas -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Direcciones Asociadas (${direcciones.length})</h3>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ID Dir.</th>
                    <th>Entidad / Municipio</th>
                    <th>Asentamiento</th>
                    <th>Núm. Ext / CP</th>
                    <th>Coordenadas</th>
                    <th class="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  ${direcciones
                    .map(
                      (d) => `
                    <tr>
                      <td class="cell-mono">${fmtNum(d.id_direccion)}</td>
                      <td>${escapeHtml(d.Nombre_Municipio)}, ${escapeHtml(d.Nombre_Entidad)}</td>
                      <td>${fmtText(d.nombre_asentamiento)}</td>
                      <td class="cell-mono">Ext ${fmtText(d.numero_ext)} · CP ${fmtText(d.cod_postal)}</td>
                      <td class="cell-mono">${fmtText(d.latitud)}, ${fmtText(d.longitud)}</td>
                      <td class="cell-actions">
                        <button type="button" class="btn btn-outline-danger btn-xs" data-del-dir="${escapeHtml(d.id_direccion)}">
                          Eliminar
                        </button>
                      </td>
                    </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Detalles de vialidad -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Vialidades Registradas en <code class="mono">detalle_vialidad</code> (${vialidades.length})</h3>
            </div>
            <div class="card-body">
              <form id="det-add-via-form" class="toolbar" novalidate>
                <div class="field field-sm">
                  <label for="dv-dir">Dirección</label>
                  <select id="dv-dir" class="select">${dirOpts}</select>
                </div>
                <div class="field field-sm">
                  <label for="dv-tipo">Tipo Vialidad</label>
                  <select id="dv-tipo" class="select">${tipoViaOpts}</select>
                </div>
                <div class="field">
                  <label for="dv-nombre">Nombre de Vialidad (máx. 4 por dirección)</label>
                  <input id="dv-nombre" class="input" type="text" placeholder="Ej. ENTRE CALLE XALAPA Y AV. AMÉRICAS" required />
                </div>
                <div class="toolbar-actions">
                  <button type="submit" class="btn btn-emerald btn-sm">${ICONS.plus}<span>Agregar Vialidad</span></button>
                </div>
              </form>
              <div id="dv-alert" style="margin-top:8px;"></div>
            </div>
            <div class="table-responsive">
              ${
                vialidades.length
                  ? `
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>ID Detalle</th>
                      <th>ID Dirección</th>
                      <th>Tipo</th>
                      <th>Nombre de Vialidad</th>
                      <th class="text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${vialidades
                      .map(
                        (v) => `
                      <tr>
                        <td class="cell-mono">${fmtNum(v.id_detalle)}</td>
                        <td class="cell-mono">${fmtNum(v.id_direccion)}</td>
                        <td><span class="badge badge-slate">${fmtText(v.tipo_vialidad)}</span></td>
                        <td>${escapeHtml(v.nombre_vialidad)}</td>
                        <td class="cell-actions">
                          <button type="button" class="btn btn-outline-danger btn-xs" data-del-dv="${escapeHtml(v.id_detalle)}">Eliminar</button>
                        </td>
                      </tr>`
                      )
                      .join("")}
                  </tbody>
                </table>`
                  : renderEmpty("Sin vialidades registradas para este establecimiento")
              }
            </div>
          </div>
        `;

        const dvForm = bodyEl.querySelector("#det-add-via-form");
        const dvAlert = bodyEl.querySelector("#dv-alert");

        dvForm.addEventListener("submit", async (ev) => {
          ev.preventDefault();
          showInlineAlert(dvAlert, { mensaje: "" });
          try {
            await api.post(
              "/api/detalles-vialidad",
              {
                id_direccion: bodyEl.querySelector("#dv-dir").value,
                id_tipo_vialidad: bodyEl.querySelector("#dv-tipo").value,
                nombre_vialidad: bodyEl.querySelector("#dv-nombre").value,
              },
              { spLabel: "sp_agregar_detalle_vialidad" }
            );
            await refreshDetail();
          } catch (err) {
            showInlineAlert(dvAlert, {
              tipo: "error",
              titulo: "Validación sp_agregar_detalle_vialidad",
              mensaje: err instanceof ApiClientError ? err.mensaje : "No se pudo agregar.",
              focus: true,
            });
          }
        });

        bodyEl.querySelectorAll("[data-del-dv]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            try {
              await api.delete(`/api/detalles-vialidad/${btn.dataset.delDv}`, {
                spLabel: "sp_eliminar_detalle_vialidad",
              });
              await refreshDetail();
            } catch (err) {
              showInlineAlert(dvAlert, {
                tipo: "error",
                mensaje: err instanceof ApiClientError ? err.mensaje : "Error al eliminar vialidad.",
              });
            }
          });
        });

        bodyEl.querySelectorAll("[data-del-dir]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            if (direcciones.length <= 1) {
              showInlineAlert(dvAlert, {
                tipo: "error",
                titulo: "Aviso de integridad",
                mensaje: "Para eliminar la única dirección del establecimiento, utilice 'Baja' del establecimiento completo.",
              });
              return;
            }
            try {
              await api.delete(`/api/direcciones/${btn.dataset.delDir}`, {
                spLabel: "sp_eliminar_direccion",
              });
              await refreshDetail();
              await loadEstablecimientos(state.page);
            } catch (err) {
              showInlineAlert(dvAlert, {
                tipo: "error",
                mensaje: err instanceof ApiClientError ? err.mensaje : "Error al eliminar dirección.",
              });
            }
          });
        });
      } catch (err) {
        bodyEl.innerHTML = "";
        showInlineAlert(bodyEl, {
          tipo: "error",
          titulo: "Error al cargar la ficha",
          mensaje: err instanceof ApiClientError ? err.mensaje : "No se pudo consultar.",
        });
      }
    }

    await refreshDetail();
  }

  // Eventos barra de filtros principal
  el.fEnt.addEventListener("change", async () => {
    await populateMunicipiosSelect(el.fMun, el.fEnt.value);
    loadEstablecimientos(1);
  });
  el.fMun.addEventListener("change", () => loadEstablecimientos(1));
  el.fAct.addEventListener("change", () => loadEstablecimientos(1));
  el.limitSel.addEventListener("change", () => loadEstablecimientos(1));
  el.qInput.addEventListener("input", debounce(() => loadEstablecimientos(1), 360));
  el.filterForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    loadEstablecimientos(1);
  });
  el.clearBtn.addEventListener("click", async () => {
    el.qInput.value = "";
    el.fEnt.value = "";
    el.fAct.value = "";
    await populateMunicipiosSelect(el.fMun, "");
    loadEstablecimientos(1);
  });

  el.newBtn.addEventListener("click", openCreateModal);

  await loadCatalogs();
  await loadEstablecimientos(1);
}
