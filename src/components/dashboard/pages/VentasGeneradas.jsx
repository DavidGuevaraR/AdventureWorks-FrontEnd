// src/components/dashboard/pages/VentasGeneradas.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, Ban, Calendar } from "lucide-react";

import Loader from "../../ui/Loader";
import ErrorModal from "../../ui/ErrorModal";
import SuccessModal from "../../ui/SuccessModal";
import ModalAnularDte from "../modals/ModalAnularDte";

import { http } from "../../../lib/httpClient";
import { secureGet } from "../../../lib/secureStorage";
import { log } from "../../../lib/logger";

// CAT-002 (sombreados)
export const DTE_OPTIONS = [
  { code: "01", label: "Factura" },
  { code: "03", label: "Comprobante de crédito fiscal" },
  { code: "04", label: "Nota de remisión" },
  { code: "05", label: "Nota de crédito" },
  { code: "06", label: "Nota de débito" },
];

const ITEMS_PER_PAGE = 10;

const estadoBadge = (status) => {
  switch ((status || "").toUpperCase()) {
    case "GENERATED":
    case "ACTIVO":
    case "ACTIVE":
      return "bg-green-100 text-green-700";
    case "SENT":
    case "ENVIADO":
      return "bg-blue-100 text-blue-700";
    case "CANCELED":
    case "ANULADO":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const codeToLabel = (code) =>
  DTE_OPTIONS.find((o) => o.code === code)?.label || code || "—";

// Helpers de formato
const fmtMoney = (n) =>
  typeof n === "number" ? `$${n.toFixed(2)}` : `$${Number(n || 0).toFixed(2)}`;

const safe = (v, fallback = "—") =>
  v === null || v === undefined || v === "" ? fallback : v;

const VentasGeneradas = () => {
  // filtros
  const [fCodigo, setFCodigo] = useState("");
  const [fTipoDte, setFTipoDte] = useState("");

  // datos y paginación
  const [ventas, setVentas] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // ui state
  const [loading, setLoading] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // rol y control de fetch
  const [userRole, setUserRole] = useState(null);
  const debounceRef = useRef(null);

  // anulación
  const [modalAnularOpen, setModalAnularOpen] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  // === cargar rol desde storage ===
  useEffect(() => {
    (async () => {
      try {
        const user = await secureGet("aw:user");
        const role = user?.role || null;
        setUserRole(role);
        log.debug("VentasGeneradas: userRole =", role);
      } catch (e) {
        log.warn("VentasGeneradas: no se pudo leer rol", e);
      }
    })();
  }, []);

  // === fetch ventas (paginado server) ===
  const fetchVentas = async (page = 1, { codigo = fCodigo, tipo = fTipoDte } = {}) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("limit", String(ITEMS_PER_PAGE));
      if (codigo?.trim()) qs.set("codigo_generacion", codigo.trim());
      if (tipo) qs.set("tipoDte", tipo);

      const url = `/api/sales?${qs.toString()}`;
      log.debug("GET", url);
      const res = await http.get(url);
      const data = Array.isArray(res?.data) ? res.data : [];
      setVentas(data);

      const total = typeof res?.total === "number" ? res.total : data.length;
      const limit = typeof res?.limit === "number" ? res.limit : ITEMS_PER_PAGE;
      setTotalPaginas(Math.max(1, Math.ceil(total / limit)));
    } catch (err) {
      const status = err?.status || 0;
      const payload = err?.payload || null;
      let msg = "No se pudieron cargar las ventas.";
      if (status >= 400 && status < 500) {
        msg = "Error al cargar ventas. Verifica filtros o credenciales.";
        if (payload?.message) msg += `\n(${payload.message})`;
      } else if (payload?.message) {
        msg = payload.message;
      }
      setErrorMsg(msg);
      setErrorOpen(true);
      log.error("Ventas fetch ERROR", { status, payload: payload || err });
    } finally {
      setLoading(false);
    }
  };

  // === carga inicial / cambio de página ===
  useEffect(() => {
    fetchVentas(paginaActual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaActual]);

  // === filtros con debounce (1s) ===
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPaginaActual(1);
      fetchVentas(1, { codigo: fCodigo, tipo: fTipoDte });
    }, 1000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fCodigo, fTipoDte]);

  const cambiarPagina = (pagina) => {
    if (pagina >= 1 && pagina <= totalPaginas) setPaginaActual(pagina);
  };

  // Filas para la tabla (pero mantenemos el objeto original para PDF)
  const rows = useMemo(() => {
    return ventas.map((v) => {
      const iden = v?.detalle_venta?.identificacion || {};
      return {
        _id: v?._id,
        _raw: v, // ← guardamos la venta completa para PDF
        codigo_generacion: v?.codigo_generacion || "—",
        tipoDte: iden?.tipoDte || "",
        fecha: iden?.fecEmi || "",
        status: v?.status || "",
      };
    });
  }, [ventas]);

  // ====== FRONTEND PDF: abrir nueva pestaña con HTML y print() ======
  const handleVerPdf = (ventaRaw) => {
    try {
      const dte = ventaRaw?.detalle_venta;
      if (!dte) {
        setErrorMsg("La venta no contiene detalle_venta para generar el PDF.");
        setErrorOpen(true);
        return;
      }

      const id = dte?.identificacion || {};
      const em = dte?.emisor || {};
      const rc = dte?.receptor || null;
      const rs = dte?.resumen || {};
      const items = Array.isArray(dte?.cuerpoDocumento) ? dte.cuerpoDocumento : [];

      const tipoDteLabel = codeToLabel(id?.tipoDte);

      // CSS + HTML: plantilla imprimible
      const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>DTE ${safe(ventaRaw?.codigo_generacion)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"; margin: 24px; color: #111827; }
    .card { max-width: 820px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
    h1 { font-size: 20px; margin: 0 0 2px; }
    h2 { font-size: 16px; margin: 20px 0 8px; }
    .muted { color: #6b7280; }
    .row { display: flex; gap: 16px; }
    .col { flex: 1; }
    .kv { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; padding: 3px 0; }
    .kv .k { color: #6b7280; }
    .line { height: 1px; background: #e5e7eb; margin: 12px 0; }

    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead th { text-align: left; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding: 8px 6px; }
    tbody td { border-bottom: 1px solid #f3f4f6; padding: 8px 6px; vertical-align: top; }

    .right { text-align: right; }
    .totals { margin-top: 8px; }
    .totals .kv { font-size: 14px; }
    .totals .strong .v { font-weight: 700; }

    .footer { margin-top: 16px; font-size: 11px; color: #6b7280; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #eef2ff; color: #4338ca; }
    .header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom: 10px; }
    .title { display:flex; align-items:center; gap:10px; }
    .logo { width: 36px; height: 36px; border-radius: 9999px; display:flex; align-items:center; justify-content:center; background:#06b6d4; color:white; font-weight:700; }
    @media print {
      .no-print { display: none; }
      body { margin: 0; }
      .card { border: none; }
    }
    .actions { display:flex; justify-content:flex-end; margin: 14px auto 0; max-width: 820px; gap: 8px; }
    .btn { padding: 8px 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: white; cursor: pointer; }
    .btn.primary { background: #111827; color: white; border-color: #111827; }
  </style>
</head>
<body>
  <div class="actions no-print">
    <button class="btn" onclick="window.close()">Cerrar</button>
    <button class="btn primary" onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>

  <div class="card">
    <div class="header">
      <div class="title">
        <div class="logo">AW</div>
        <div>
          <h1>Comprobante electrónico</h1>
          <div class="muted">${safe(tipoDteLabel)} · ${safe(id?.tipoMoneda, "USD")}</div>
        </div>
      </div>
      <div>
        <span class="badge">${safe(ventaRaw?.status || "GENERATED")}</span>
      </div>
    </div>

    <div class="row">
      <div class="col">
        <div class="kv"><span class="k">Código generación</span><span class="v">${safe(id?.codigoGeneracion)}</span></div>
        <div class="kv"><span class="k">Número control</span><span class="v">${safe(id?.numeroControl)}</span></div>
      </div>
      <div class="col">
        <div class="kv"><span class="k">DTE</span><span class="v">${safe(ventaRaw?.codigo_generacion)}</span></div>
        <div class="kv"><span class="k">Emisión</span><span class="v">${safe(id?.fecEmi)} ${safe(id?.horEmi, "")}</span></div>

      </div>
    </div>

    <div class="line"></div>

    <h2>Emisor</h2>
    <div class="row">
      <div class="col">
        <div class="kv"><span class="k">Nombre</span><span class="v">${safe(em?.nombre)}</span></div>
        <div class="kv"><span class="k">Comercial</span><span class="v">${safe(em?.nombreComercial)}</span></div>
        <div class="kv"><span class="k">Giro</span><span class="v">${safe(em?.descActividad)}</span></div>
        <div class="kv"><span class="k">Actividad</span><span class="v">${safe(em?.codActividad)}</span></div>
      </div>
      <div class="col">
        <div class="kv"><span class="k">NIT</span><span class="v">${safe(em?.nit)}</span></div>
        <div class="kv"><span class="k">NRC</span><span class="v">${safe(em?.nrc)}</span></div>
        <div class="kv"><span class="k">Teléfono</span><span class="v">${safe(em?.telefono)}</span></div>
        <div class="kv"><span class="k">Correo</span><span class="v">${safe(em?.correo)}</span></div>
      </div>
    </div>
    <div class="kv"><span class="k">Dirección</span><span class="v">${safe(em?.direccion?.complemento)}</span></div>

    <div class="line"></div>

    <h2>Receptor</h2>
    ${
      rc
        ? `
      <div class="row">
        <div class="col">
          <div class="kv"><span class="k">Nombre</span><span class="v">${safe(rc?.nombre)}</span></div>
          <div class="kv"><span class="k">Documento</span><span class="v">(${safe(rc?.tipoDocumento)}) ${safe(rc?.numDocumento)}</span></div>
          <div class="kv"><span class="k">Actividad</span><span class="v">${safe(rc?.codActividad)}</span></div>
        </div>
        <div class="col">
          <div class="kv"><span class="k">Correo</span><span class="v">${safe(rc?.correo)}</span></div>
          <div class="kv"><span class="k">Teléfono</span><span class="v">${safe(rc?.telefono)}</span></div>
          <div class="kv"><span class="k">Dirección</span><span class="v">${safe(rc?.direccion?.complemento)}</span></div>
        </div>
      </div>
    `
        : `<div class="muted">Consumidor final (receptor = null)</div>`
    }

    <div class="line"></div>

    <h2>Detalle</h2>
    <table>
      <thead>
        <tr>
          <th style="width:48px;">#</th>
          <th>Descripción</th>
          <th class="right" style="width:70px;">Cant.</th>
          <th class="right" style="width:90px;">P. Unit</th>
          <th class="right" style="width:100px;">Gravada</th>
          <th class="right" style="width:80px;">IVA</th>
        </tr>
      </thead>
      <tbody>
        ${
          items.length
            ? items
                .map((it) => {
                  const num = safe(it?.numItem, "");
                  const desc = safe(it?.descripcion, "");
                  const cant = Number(it?.cantidad || 0);
                  const pu = Number(it?.precioUni || 0);
                  const grav = Number(it?.ventaGravada || 0);
                  const iva = Number(it?.ivaItem || 0);
                  return `<tr>
                    <td>${num}</td>
                    <td>${desc}</td>
                    <td class="right">${cant}</td>
                    <td class="right">${fmtMoney(pu)}</td>
                    <td class="right">${fmtMoney(grav)}</td>
                    <td class="right">${fmtMoney(iva)}</td>
                  </tr>`;
                })
                .join("")
            : `<tr><td colspan="6" class="muted">Sin ítems</td></tr>`
        }
      </tbody>
    </table>

    <div class="totals">
      <div class="kv"><span class="k">Subtotal ventas</span><span class="v">${fmtMoney(rs?.subTotalVentas || 0)}</span></div>
      <div class="kv"><span class="k">IVA (13%)</span><span class="v">${fmtMoney(rs?.totalIva || 0)}</span></div>
      <div class="kv strong"><span class="k">Total a pagar</span><span class="v">${fmtMoney(rs?.totalPagar || 0)}</span></div>
      <div style="margin-top:6px;" class="muted">Son: ${safe(rs?.totalLetras, "")}</div>
    </div>

    <div class="line"></div>

    <div class="footer">
      <div>Sello recibido: ${safe(dte?.selloRecibido)}</div>
    </div>
  </div>

  <script>
    // Opcional: auto-imprimir al abrir
    // setTimeout(() => window.print(), 400);
  </script>
</body>
</html>
      `;

      const w = window.open("", "_blank");
      if (!w) {
        setErrorMsg("Bloqueador de ventanas emergentes: permite popups para ver el PDF.");
        setErrorOpen(true);
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
    } catch (e) {
      setErrorMsg(e?.message || "No se pudo generar el PDF.");
      setErrorOpen(true);
    }
  };

  return (
    <div className="max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-lg p-8"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-cyan-400 rounded-full flex items-center justify-center">
            <FileText className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ventas Generadas</h1>
            <p className="text-sm text-gray-500">Gestión por: Jose Lora.</p>
          </div>
        </div>

        {/* Filtros (aplican solos en 1s) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Código de generación */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por código de generación"
              value={fCodigo}
              onChange={(e) => setFCodigo(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Tipo DTE (select) */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de DTE</label>
            <select
              value={fTipoDte}
              onChange={(e) => setFTipoDte(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">Todos</option>
              {DTE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Los filtros se aplican automáticamente en 1s</p>
          </div>

          {/* espacio para crecer */}
          <div className="hidden md:block" />
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4">Código de generación</th>
                <th className="text-left py-3 px-4">Tipo de documento</th>
                <th className="text-left py-3 px-4">Estado</th>
                <th className="text-left py-3 px-4">Fecha de emisión</th>
                <th className="text-left py-3 px-4">PDF</th>
                <th className="text-left py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((venta, index) => (
                <motion.tr
                  key={venta._id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-4 px-4 text-sm font-mono">{venta.codigo_generacion}</td>
                  <td className="py-4 px-4 text-sm">{codeToLabel(venta.tipoDte)}</td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${estadoBadge(venta.status)}`}>
                      {venta.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm">
                    <div className="inline-flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      {venta.fecha || "—"}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium"
                      onClick={() => handleVerPdf(venta._raw)}
                      title="Ver / Guardar PDF"
                    >
                      <span className="text-lg">📄</span>
                      Ver PDF
                    </button>
                  </td>
                  <td className="py-4 px-4">
                    {/* Mostrar anular solo a ADMIN */}
                    {userRole === "ADMIN" && (
                      <button
                        className="text-gray-400 hover:text-red-600"
                        title="Anular DTE"
                        onClick={() => {
                          setVentaSeleccionada(venta._raw);
                          setModalAnularOpen(true);
                        }}
                      >
                        <Ban size={18} />
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => cambiarPagina(paginaActual - 1)}
            disabled={paginaActual === 1}
            className="px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>

          {[...Array(totalPaginas)].map((_, i) => {
            const page = i + 1;
            if (page === 1 || page === totalPaginas || (page >= paginaActual - 1 && page <= paginaActual + 1)) {
              return (
                <button
                  key={page}
                  onClick={() => cambiarPagina(page)}
                  className={`px-3 py-1 rounded ${page === paginaActual ? "bg-gray-200 font-semibold" : "hover:bg-gray-100"}`}
                >
                  {String(page).padStart(2, "0")}
                </button>
              );
            } else if (page === paginaActual - 2 || page === paginaActual + 2) {
              return <span key={page}>...</span>;
            }
            return null;
          })}

          <button
            onClick={() => cambiarPagina(paginaActual + 1)}
            disabled={paginaActual === totalPaginas}
            className="px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      </motion.div>

      {/* Modales globales */}
      <AnimatePresence>
        {modalAnularOpen && ventaSeleccionada && (
          <ModalAnularDte
            venta={ventaSeleccionada}
            onClose={() => setModalAnularOpen(false)}
            onSuccess={async () => {
              setModalAnularOpen(false);
              setSuccessMsg("DTE anulado correctamente.");
              setSuccessOpen(true);
              await fetchVentas(paginaActual);
            }}
            onError={(msg) => {
              setErrorMsg(msg || "No se pudo anular el DTE.");
              setErrorOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      <Loader show={loading} />
      <ErrorModal
        open={errorOpen}
        onClose={() => setErrorOpen(false)}
        title="No se pudo completar la operación"
        message={errorMsg}
      />
      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Operación exitosa"
        message={successMsg}
        autoCloseMs={1400}
      />
    </div>
  );
};

export default VentasGeneradas;
