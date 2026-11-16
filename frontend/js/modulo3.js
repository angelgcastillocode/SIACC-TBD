/**
 * Módulo 3 — Clasificación Económica (`actividad`)
 * Endpoints (escritura exclusiva vía Stored Procedures):
 *   GET  /api/actividades
 *   POST /api/actividades          (sp_insertar_actividad_segura)
 *   PUT  /api/actividades/<id>     (sp_actualizar_actividad)
 */
import { api, ApiClientError } from "./api.js";
import {
  ICONS,
  closeModal,
  debounce,
  escapeHtml,
  fmtNum,
  openModal,
  renderEmpty,
  renderLoading,
  renderPagination,
  showInlineAlert,
} from "./ui.js";

export async function renderModulo3(container) {
  const state = {
    page: 1,
    limit: 25,
    rows: [],
  };

  container.innerHTML = `
    <section class="kpi-grid" aria-label="Resumen de clasificación económica">
      <article class="kpi-card">
        <span class="kpi-label">Giros Registrados</span>
        <span id="m3-kpi-total" class="kpi-value">—</span>
        <span class="kpi-sub">Tabla <code class="mono">actividad</code></span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">Alta Segura</span>
        <span class="kpi-value" style="font-size: 0.98rem;">sp_insertar_actividad_segura</span>
        <span class="kpi-sub">Valida ID y descripción duplicados</span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">Edición Segura</span>
        <span class="kpi-value" style="font-size: 0.98rem;">sp_actualizar_actividad</span>
        <span class="kpi-sub">Sin DML directo desde Python</span>
      </article>
    </section>

    <section class="split-grid">
      <!-- Alta segura -->
      <article class="card">
        <div class="card-header">
          <div class="card-title-wrap">
            <h2 class="card-title">Nuevo Giro Económico <span class="badge badge-ok">SP</span></h2>
            <p class="card-subtitle">Invoca <code class="mono">CALL sp_insertar_actividad_segura(id, descripcion)</code></p>
          </div>
        </div>
        <div class="card-body">
          <form id="m3-create-form" class="form-grid-compact" novalidate>
            <div class="field">
              <label for="m3-id">Código / ID Actividad <span class="req">*</span></label>
              <input id="m3-id" class="input input-mono" type="number" min="1" placeholder="Ej. 72 (o 1 para probar duplicado)" required />
              <span class="field-hint">Entero positivo. El catálogo base abarca 1..71.</span>
            </div>
            <div class="field">
              <label for="m3-desc">Descripción de la Actividad <span class="req">*</span></label>
              <textarea id="m3-desc" class="textarea" rows="3" maxlength="150" placeholder="Ej. COMERCIO AL POR MAYOR DE INSUMOS AGROPECUARIOS" required></textarea>
              <span class="field-hint">Máximo 150 caracteres. El SP rechaza descripciones duplicadas.</span>
            </div>
            <div id="m3-create-alert"></div>
            <div class="form-actions">
              <button type="reset" class="btn btn-secondary btn-sm">Limpiar</button>
              <button id="m3-create-submit" type="submit" class="btn btn-emerald">
                ${ICONS.plus}
                <span>Insertar Actividad</span>
              </button>
            </div>
          </form>
        </div>
      </article>

      <!-- Buscador y tabla -->
      <article class="card">
        <div class="card-header">
          <div class="card-title-wrap">
            <h2 class="card-title">Catálogo de Actividades Económicas</h2>
            <p class="card-subtitle">Busque giros comerciales y edite descripciones de forma controlada.</p>
          </div>
        </div>
        <div class="card-body">
          <div class="toolbar">
            <div class="field">
              <label for="m3-q">Buscar por descripción</label>
              <input id="m3-q" class="input" type="search" placeholder="Ej. ABARROTES, FARMACÉUTICOS, MAQUINARIA..." />
            </div>
            <div class="field field-sm">
              <label for="m3-limit">Por página</label>
              <select id="m3-limit" class="select">
                <option value="15">15</option>
                <option value="25" selected>25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div class="toolbar-actions">
              <button id="m3-refresh" class="btn btn-secondary btn-sm" type="button">
                ${ICONS.refresh}
                <span>Refrescar</span>
              </button>
            </div>
          </div>
        </div>

        <div id="m3-table" class="table-responsive">${renderLoading()}</div>
        <div id="m3-pag"></div>
      </article>
    </section>
  `;

  const el = {
    kpiTotal: container.querySelector("#m3-kpi-total"),
    form: container.querySelector("#m3-create-form"),
    idInput: container.querySelector("#m3-id"),
    descInput: container.querySelector("#m3-desc"),
    createAlert: container.querySelector("#m3-create-alert"),
    createSubmit: container.querySelector("#m3-create-submit"),
    qInput: container.querySelector("#m3-q"),
    limitSelect: container.querySelector("#m3-limit"),
    refreshBtn: container.querySelector("#m3-refresh"),
    table: container.querySelector("#m3-table"),
    pag: container.querySelector("#m3-pag"),
  };

  async function loadActividades(page = 1) {
    state.page = page;
    state.limit = Number(el.limitSelect.value) || 25;
    el.table.innerHTML = renderLoading();

    try {
      const res = await api.get("/api/actividades", {
        q: el.qInput.value,
        page: state.page,
        limit: state.limit,
      });
      state.rows = res.data || [];
      if (!el.qInput.value.trim()) {
        el.kpiTotal.textContent = fmtNum(res.total);
      }

      if (!state.rows.length) {
        el.table.innerHTML = renderEmpty("Sin giros económicos encontrados");
        el.pag.innerHTML = "";
        return;
      }

      el.table.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Descripción de la Actividad</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${state.rows
              .map(
                (r) => `
              <tr>
                <td class="cell-mono">${fmtNum(r.id_actividad)}</td>
                <td>${escapeHtml(r.descripcion_actividad)}</td>
                <td class="cell-actions">
                  <button type="button" class="btn btn-secondary btn-xs" data-edit-act="${escapeHtml(r.id_actividad)}">
                    ${ICONS.edit}
                    <span>Editar</span>
                  </button>
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      `;

      el.table.querySelectorAll("[data-edit-act]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const item = state.rows.find((row) => String(row.id_actividad) === btn.dataset.editAct);
          if (item) openEditModal(item);
        });
      });

      renderPagination(
        el.pag,
        { total: res.total, pagina: res.pagina, limite: res.limite, count: state.rows.length },
        (p) => loadActividades(p)
      );
    } catch (err) {
      el.table.innerHTML = renderEmpty("Error al cargar actividades", err.mensaje);
    }
  }

  function openEditModal(item) {
    const { bodyEl, footerEl } = openModal({
      kicker: `CALL sp_actualizar_actividad(${item.id_actividad}, ...)`,
      title: `Editar Actividad #${item.id_actividad}`,
      bodyHtml: `
        <form id="m3-edit-form" class="form-grid-compact" novalidate>
          <div class="field">
            <label for="m3-edit-id">ID Actividad</label>
            <input id="m3-edit-id" class="input input-mono" type="text" value="${escapeHtml(item.id_actividad)}" disabled />
          </div>
          <div class="field">
            <label for="m3-edit-desc">Nueva Descripción <span class="req">*</span></label>
            <textarea id="m3-edit-desc" class="textarea" rows="3" maxlength="150" required>${escapeHtml(item.descripcion_actividad)}</textarea>
          </div>
          <div id="m3-edit-alert"></div>
        </form>
      `,
      footerHtml: `
        <button id="m3-edit-cancel" type="button" class="btn btn-secondary">Cancelar</button>
        <button id="m3-edit-save" type="submit" form="m3-edit-form" class="btn btn-primary">Guardar Cambios</button>
      `,
    });

    const editForm = bodyEl.querySelector("#m3-edit-form");
    const editDesc = bodyEl.querySelector("#m3-edit-desc");
    const editAlert = bodyEl.querySelector("#m3-edit-alert");
    const saveBtn = footerEl.querySelector("#m3-edit-save");
    footerEl.querySelector("#m3-edit-cancel").addEventListener("click", closeModal);

    editDesc.focus();
    editDesc.select();

    editForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      saveBtn.disabled = true;
      showInlineAlert(editAlert, { mensaje: "" });
      try {
        await api.put(
          `/api/actividades/${item.id_actividad}`,
          { descripcion_actividad: editDesc.value },
          { spLabel: "sp_actualizar_actividad" }
        );
        closeModal();
        await loadActividades(state.page);
      } catch (err) {
        showInlineAlert(editAlert, {
          tipo: "error",
          titulo: "Validación del Stored Procedure",
          mensaje: err instanceof ApiClientError ? err.mensaje : "No se pudo actualizar.",
          focus: true,
        });
        saveBtn.disabled = false;
      }
    });
  }

  el.form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    el.createSubmit.disabled = true;
    showInlineAlert(el.createAlert, { mensaje: "" });

    try {
      const res = await api.post(
        "/api/actividades",
        {
          id_actividad: el.idInput.value,
          descripcion_actividad: el.descInput.value,
        },
        { spLabel: "sp_insertar_actividad_segura" }
      );
      showInlineAlert(el.createAlert, {
        tipo: "ok",
        titulo: "Actividad registrada por MySQL",
        mensaje: res.mensaje,
      });
      el.form.reset();
      await loadActividades(1);
    } catch (err) {
      showInlineAlert(el.createAlert, {
        tipo: "error",
        titulo: "Validación del Stored Procedure",
        mensaje: err instanceof ApiClientError ? err.mensaje : "No se pudo insertar.",
        focus: true,
      });
    } finally {
      el.createSubmit.disabled = false;
    }
  });

  el.qInput.addEventListener("input", debounce(() => loadActividades(1), 300));
  el.limitSelect.addEventListener("change", () => loadActividades(1));
  el.refreshBtn.addEventListener("click", () => loadActividades(state.page));

  await loadActividades(1);
}
