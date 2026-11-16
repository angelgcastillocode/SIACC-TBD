/**
 * Auditoría en Tiempo Real — bitacora_auditoria (Triggers AFTER INSERT/UPDATE/DELETE)
 * Endpoints:
 *   GET /api/bitacora?tabla=&accion=&id_registro=&desde=&hasta=&page=&limit=
 *   GET /api/bitacora/<id_bitacora>
 */
import { api } from "./api.js";
import {
  ICONS,
  closeModal,
  debounce,
  escapeHtml,
  fmtDateTime,
  fmtNum,
  openModal,
  renderEmpty,
  renderLoading,
  renderPagination,
} from "./ui.js";

function stringifyVal(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function summarizeDiff(row) {
  const oldObj = row.datos_anteriores && typeof row.datos_anteriores === "object" ? row.datos_anteriores : null;
  const newObj = row.datos_nuevos && typeof row.datos_nuevos === "object" ? row.datos_nuevos : null;

  if (row.accion === "INSERT" && newObj) {
    return `Alta: ${escapeHtml(newObj.nom_estab || "(sin nombre)")}`;
  }
  if (row.accion === "DELETE" && oldObj) {
    return `Baja: ${escapeHtml(oldObj.nom_estab || "(sin nombre)")}`;
  }
  if (row.accion === "UPDATE" && oldObj && newObj) {
    const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
    const changed = keys.filter((k) => stringifyVal(oldObj[k]) !== stringifyVal(newObj[k]));
    if (!changed.length) return "Sin diferencias detectadas en columnas";
    return changed
      .slice(0, 3)
      .map(
        (k) =>
          `<code class="mono">${escapeHtml(k)}</code>: <span class="text-muted">${escapeHtml(stringifyVal(oldObj[k]))}</span> &rarr; <strong>${escapeHtml(stringifyVal(newObj[k]))}</strong>`
      )
      .join(" · ") + (changed.length > 3 ? ` (+${changed.length - 3} más)` : "");
  }
  return "—";
}

function badgeClassForAccion(accion) {
  if (accion === "INSERT") return "badge-insert";
  if (accion === "UPDATE") return "badge-update";
  if (accion === "DELETE") return "badge-delete";
  return "badge-slate";
}

export async function renderBitacora(container) {
  const state = {
    page: 1,
    limit: 25,
    rows: [],
    timerId: null,
  };

  container.innerHTML = `
    <section class="kpi-grid" aria-label="Resumen de auditoría">
      <article class="kpi-card">
        <span class="kpi-label">Eventos en Bitácora</span>
        <span id="bit-kpi-total" class="kpi-value">—</span>
        <span class="kpi-sub">Total con filtros activos</span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">INSERT (página)</span>
        <span id="bit-kpi-ins" class="kpi-value" style="color: var(--emerald-700);">—</span>
        <span class="kpi-sub"><code class="mono">trg_establecimiento_after_insert</code></span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">UPDATE (página)</span>
        <span id="bit-kpi-upd" class="kpi-value" style="color: var(--amber-700);">—</span>
        <span class="kpi-sub"><code class="mono">trg_establecimiento_after_update</code></span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">DELETE (página)</span>
        <span id="bit-kpi-del" class="kpi-value" style="color: var(--red-700);">—</span>
        <span class="kpi-sub"><code class="mono">trg_establecimiento_after_delete</code></span>
      </article>
    </section>

    <section class="card">
      <div class="card-header">
        <div class="card-title-wrap">
          <h2 class="card-title">
            Registro Automático de Auditoría (<code class="mono">bitacora_auditoria</code>)
            <span class="badge badge-ok">Triggers Activos</span>
          </h2>
          <p class="card-subtitle">
            Cada operación DML sobre <code class="mono">establecimiento</code> guarda instantáneas JSON <code class="mono">OLD</code> y <code class="mono">NEW</code> automáticamente en MySQL.
          </p>
        </div>
        <div class="toolbar-actions">
          <label class="switch-inline" for="bit-autorefresh">
            <input id="bit-autorefresh" type="checkbox" />
            <span>Auto-refrescar (5s)</span>
          </label>
          <button id="bit-refresh" class="btn btn-primary btn-sm" type="button">
            ${ICONS.refresh}
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      <div class="card-body">
        <form id="bit-filter-form" class="toolbar" novalidate>
          <div class="field field-sm">
            <label for="bit-tabla">Tabla</label>
            <select id="bit-tabla" class="select">
              <option value="">Todas</option>
              <option value="establecimiento">establecimiento</option>
            </select>
          </div>
          <div class="field field-sm">
            <label for="bit-accion">Acción</label>
            <select id="bit-accion" class="select">
              <option value="">Todas</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div class="field field-sm">
            <label for="bit-idreg">ID Registro</label>
            <input id="bit-idreg" class="input input-mono" type="text" placeholder="Ej. 99999101" />
          </div>
          <div class="field field-sm">
            <label for="bit-desde">Desde</label>
            <input id="bit-desde" class="input" type="date" />
          </div>
          <div class="field field-sm">
            <label for="bit-hasta">Hasta</label>
            <input id="bit-hasta" class="input" type="date" />
          </div>
          <div class="field field-sm">
            <label for="bit-limit">Por página</label>
            <select id="bit-limit" class="select">
              <option value="15">15</option>
              <option value="25" selected>25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <div class="toolbar-actions">
            <button id="bit-clear" class="btn btn-secondary btn-sm" type="button">Limpiar</button>
          </div>
        </form>
      </div>

      <div id="bit-table" class="table-responsive">${renderLoading()}</div>
      <div id="bit-pag"></div>
    </section>
  `;

  const el = {
    kpiTotal: container.querySelector("#bit-kpi-total"),
    kpiIns: container.querySelector("#bit-kpi-ins"),
    kpiUpd: container.querySelector("#bit-kpi-upd"),
    kpiDel: container.querySelector("#bit-kpi-del"),
    autoRefresh: container.querySelector("#bit-autorefresh"),
    refreshBtn: container.querySelector("#bit-refresh"),
    tabla: container.querySelector("#bit-tabla"),
    accion: container.querySelector("#bit-accion"),
    idreg: container.querySelector("#bit-idreg"),
    desde: container.querySelector("#bit-desde"),
    hasta: container.querySelector("#bit-hasta"),
    limit: container.querySelector("#bit-limit"),
    clear: container.querySelector("#bit-clear"),
    table: container.querySelector("#bit-table"),
    pag: container.querySelector("#bit-pag"),
  };

  async function loadBitacora(page = 1, { quiet = false } = {}) {
    state.page = page;
    state.limit = Number(el.limit.value) || 25;
    if (!quiet) el.table.innerHTML = renderLoading();

    try {
      const res = await api.get("/api/bitacora", {
        tabla: el.tabla.value,
        accion: el.accion.value,
        id_registro: el.idreg.value,
        desde: el.desde.value,
        hasta: el.hasta.value,
        page: state.page,
        limit: state.limit,
      });
      state.rows = res.data || [];

      el.kpiTotal.textContent = fmtNum(res.total);
      el.kpiIns.textContent = fmtNum(state.rows.filter((r) => r.accion === "INSERT").length);
      el.kpiUpd.textContent = fmtNum(state.rows.filter((r) => r.accion === "UPDATE").length);
      el.kpiDel.textContent = fmtNum(state.rows.filter((r) => r.accion === "DELETE").length);

      if (!state.rows.length) {
        el.table.innerHTML = renderEmpty(
          "Sin eventos de auditoría",
          "Realice un alta, edición o baja en el Módulo 4 para observar los triggers en vivo."
        );
        el.pag.innerHTML = "";
        return;
      }

      el.table.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th># Bitácora</th>
              <th>Acción</th>
              <th>Tabla</th>
              <th>ID Registro</th>
              <th>Resumen Visual (OLD vs NEW)</th>
              <th>Usuario BD</th>
              <th>Fecha y Hora</th>
              <th class="text-right">Inspección</th>
            </tr>
          </thead>
          <tbody>
            ${state.rows
              .map(
                (r) => `
              <tr>
                <td class="cell-mono"><strong>#${fmtNum(r.id_bitacora)}</strong></td>
                <td><span class="badge ${badgeClassForAccion(r.accion)}">${escapeHtml(r.accion)}</span></td>
                <td class="cell-mono">${escapeHtml(r.tabla_afectada)}</td>
                <td class="cell-mono"><strong>${escapeHtml(r.id_registro)}</strong></td>
                <td>${summarizeDiff(r)}</td>
                <td class="cell-mono">${escapeHtml(r.usuario_bd)}</td>
                <td class="cell-mono">${fmtDateTime(r.fecha_hora)}</td>
                <td class="cell-actions">
                  <button type="button" class="btn btn-secondary btn-xs" data-diff="${escapeHtml(r.id_bitacora)}">
                    ${ICONS.eye}
                    <span>Comparar OLD / NEW</span>
                  </button>
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      `;

      el.table.querySelectorAll("[data-diff]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const item = state.rows.find((row) => String(row.id_bitacora) === btn.dataset.diff);
          if (item) openDiffModal(item);
        });
      });

      renderPagination(
        el.pag,
        { total: res.total, pagina: res.pagina, limite: res.limite, count: state.rows.length },
        (p) => loadBitacora(p)
      );
    } catch (err) {
      el.table.innerHTML = renderEmpty("Error al consultar la bitácora", err.mensaje);
    }
  }

  function openDiffModal(row) {
    const oldObj = row.datos_anteriores && typeof row.datos_anteriores === "object" ? row.datos_anteriores : {};
    const newObj = row.datos_nuevos && typeof row.datos_nuevos === "object" ? row.datos_nuevos : {};
    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

    const rowsHtml = allKeys
      .map((key) => {
        const hasOld = Object.prototype.hasOwnProperty.call(oldObj, key);
        const hasNew = Object.prototype.hasOwnProperty.call(newObj, key);
        const oldVal = hasOld ? stringifyVal(oldObj[key]) : "— (NULL)";
        const newVal = hasNew ? stringifyVal(newObj[key]) : "— (NULL)";

        let rowClass = "";
        let estadoBadge = `<span class="badge badge-slate">Igual</span>`;

        if (row.accion === "INSERT") {
          rowClass = "diff-added";
          estadoBadge = `<span class="badge badge-insert">Insertado</span>`;
        } else if (row.accion === "DELETE") {
          rowClass = "diff-removed";
          estadoBadge = `<span class="badge badge-delete">Eliminado</span>`;
        } else if (oldVal !== newVal) {
          rowClass = "diff-changed";
          estadoBadge = `<span class="badge badge-update">Modificado</span>`;
        }

        return `
          <tr class="${rowClass}">
            <td class="cell-mono"><strong>${escapeHtml(key)}</strong></td>
            <td class="cell-mono">${escapeHtml(oldVal)}</td>
            <td class="cell-mono">${escapeHtml(newVal)}</td>
            <td>${estadoBadge}</td>
          </tr>
        `;
      })
      .join("");

    const { footerEl } = openModal({
      kicker: `bitacora_auditoria #${row.id_bitacora} · ${row.tabla_afectada}`,
      title: `Comparación OLD vs NEW (${row.accion} · ID ${row.id_registro})`,
      size: "xl",
      bodyHtml: `
        <div class="detail-kv-grid">
          <div class="detail-kv-item"><span class="detail-kv-label">Acción</span><span class="detail-kv-val"><span class="badge ${badgeClassForAccion(row.accion)}">${escapeHtml(row.accion)}</span></span></div>
          <div class="detail-kv-item"><span class="detail-kv-label">Tabla Afectada</span><span class="detail-kv-val mono">${escapeHtml(row.tabla_afectada)}</span></div>
          <div class="detail-kv-item"><span class="detail-kv-label">ID Registro</span><span class="detail-kv-val mono">${escapeHtml(row.id_registro)}</span></div>
          <div class="detail-kv-item"><span class="detail-kv-label">Usuario BD</span><span class="detail-kv-val mono">${escapeHtml(row.usuario_bd)}</span></div>
          <div class="detail-kv-item"><span class="detail-kv-label">Fecha y Hora</span><span class="detail-kv-val mono">${fmtDateTime(row.fecha_hora)}</span></div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Comparación Campo por Campo</h3>
          </div>
          <div class="table-responsive">
            <table class="data-table diff-table">
              <thead>
                <tr>
                  <th>Columna</th>
                  <th>datos_anteriores (OLD)</th>
                  <th>datos_nuevos (NEW)</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>

        <div class="diff-raw-grid">
          <div>
            <div class="field-hint" style="margin-bottom:4px; font-weight:600;">JSON datos_anteriores (OLD)</div>
            <pre class="json-pre">${escapeHtml(JSON.stringify(row.datos_anteriores, null, 2))}</pre>
          </div>
          <div>
            <div class="field-hint" style="margin-bottom:4px; font-weight:600;">JSON datos_nuevos (NEW)</div>
            <pre class="json-pre">${escapeHtml(JSON.stringify(row.datos_nuevos, null, 2))}</pre>
          </div>
        </div>
      `,
      footerHtml: `<button id="diff-close" type="button" class="btn btn-secondary">Cerrar</button>`,
    });

    footerEl.querySelector("#diff-close").addEventListener("click", closeModal);
  }

  // Filtros y auto-refresco
  [el.tabla, el.accion, el.desde, el.hasta, el.limit].forEach((ctrl) =>
    ctrl.addEventListener("change", () => loadBitacora(1))
  );
  el.idreg.addEventListener("input", debounce(() => loadBitacora(1), 300));
  el.refreshBtn.addEventListener("click", () => loadBitacora(state.page));

  el.clear.addEventListener("click", () => {
    el.tabla.value = "";
    el.accion.value = "";
    el.idreg.value = "";
    el.desde.value = "";
    el.hasta.value = "";
    loadBitacora(1);
  });

  el.autoRefresh.addEventListener("change", () => {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
    if (el.autoRefresh.checked) {
      state.timerId = window.setInterval(() => loadBitacora(state.page, { quiet: true }), 5000);
    }
  });

  await loadBitacora(1);

  // Hook de limpieza al salir de la vista
  return () => {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  };
}
