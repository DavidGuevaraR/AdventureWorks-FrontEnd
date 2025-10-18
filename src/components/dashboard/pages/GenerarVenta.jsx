// src/components/dashboard/pages/GenerarVenta.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingCart, Plus, Minus, X } from "lucide-react";

import Loader from "../../ui/Loader";
import ErrorModal from "../../ui/ErrorModal";
import SuccessModal from "../../ui/SuccessModal";

import { http } from "../../../lib/httpClient";
import { log } from "../../../lib/logger";

const ITEMS_PER_PAGE = 10;

/* ===================== ICON HELPERS ===================== */
const looksLikeImageUrl = (s = "") =>
  /^https?:\/\//i.test(s) || /\.(png|jpe?g|gif|webp|svg)$/i.test(s);

const emojiForName = (name = "") => {
  const n = name.toLowerCase();
  if (/bike|bicicleta|bici|mountain/.test(n)) return "🚴";
  if (/helmet|casco|kitty/.test(n)) return "🪖";
  if (/shoe|zapato|running|sneaker|tenis/.test(n)) return "👟";
  if (/glove|guante/.test(n)) return "🧤";
  if (/knee|rodillera|pad/.test(n)) return "🦵";
  return "📦";
};

const normalizeIcon = (p) => {
  const raw = p?.imagen || p?.emoji || p?.icon || p?.image || p?.imageUrl || "";
  if (raw) return raw;
  return emojiForName(p?.nombre || "");
};
/* ======================================================== */

/* ======= INICIALES DEL RECEPTOR / CLIENTE ======= */
const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

/* =================== BUILD HELPERS (DTE) =================== */
// Random helpers
const randHex = (len) =>
  Array.from({ length: len }, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("");

const randDigits = (len) =>
  Array.from({ length: len }, () => "0123456789"[Math.floor(Math.random() * 10)]).join("");

const randAlphaNum = (len) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

// DTE-01-8B56BF7C-123456789012345
const buildNumeroControl = () => `DTE-01-${randHex(8)}-${randDigits(15)}`;

// UUID-like uppercase
const buildCodigoGeneracion = () =>
  `${randHex(8)}-${randHex(4)}-${randHex(4)}-${randHex(4)}-${randHex(12)}`;

// Sello recibido
const buildSelloRecibido = () => randAlphaNum(40);

// Firma (estilo JWT fake, suficiente para pruebas)
const base64 = (s) => {
  try {
    return btoa(unescape(encodeURIComponent(s)));
  } catch {
    return Buffer.from(s, "utf8").toString("base64");
  }
};
const buildFirma = (payloadObj) => {
  const header = base64(JSON.stringify({ alg: "RS512" }));
  const payload = base64(JSON.stringify(payloadObj));
  const signature = randAlphaNum(128);
  return `${header}.${payload}.${signature}`;
};

// Redondeo a n decimales
const round = (n, d = 2) => {
  const m = Math.pow(10, d);
  return Math.round((Number(n) || 0) * m) / m;
};

// Fecha/hora
const pad2 = (n) => String(n).padStart(2, "0");
const nowDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const nowTime = () => {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

// Número a letras (ES) – simple
function numeroALetrasES(n) {
  n = Number(n) || 0;
  const unidades = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  const especiales = [
    "diez",
    "once",
    "doce",
    "trece",
    "catorce",
    "quince",
    "dieciséis",
    "diecisiete",
    "dieciocho",
    "diecinueve",
  ];
  const decenas = [
    "",
    "diez",
    "veinte",
    "treinta",
    "cuarenta",
    "cincuenta",
    "sesenta",
    "setenta",
    "ochenta",
    "noventa",
  ];
  const centenas = [
    "",
    "cien",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
  ];

  const toWords999 = (num) => {
    let res = "";
    const c = Math.floor(num / 100);
    const d = Math.floor((num % 100) / 10);
    const u = num % 10;

    if (c) {
      if (c === 1 && (d || u)) res += "ciento";
      else res += centenas[c];
    }
    if (res) res += " ";
    if (d === 1) {
      res += especiales[u];
      return res.trim();
    }
    if (d === 2 && u > 0) {
      res += "veinti" + (u === 1 ? "ún" : unidades[u]);
      return res.trim();
    }
    if (d > 0) {
      res += decenas[d];
      if (u > 0) res += " y " + (u === 1 ? "un" : unidades[u]);
      return res.trim();
    }
    if (u > 0) res += u === 1 ? "un" : unidades[u];
    return res.trim();
  };

  const toWords = (num) => {
    if (num === 0) return "cero";
    const millones = Math.floor(num / 1000000);
    const miles = Math.floor((num % 1000000) / 1000);
    const resto = num % 1000;
    const parts = [];
    if (millones) parts.push(millones === 1 ? "un millón" : `${toWords999(millones)} millones`);
    if (miles) parts.push(miles === 1 ? "mil" : `${toWords999(miles)} mil`);
    if (resto) parts.push(toWords999(resto));
    return parts.join(" ").trim();
  };

  const entero = Math.floor(n);
  const cent = Math.round((n - entero) * 100);

  const entL = toWords(entero);
  const entMoneda = entero === 1 ? "dólar" : "dólares";
  const centL = cent === 0 ? "cero centavos" : `${toWords(cent)} ${cent === 1 ? "centavo" : "centavos"}`;

  return `${entL} ${entMoneda} con ${centL}`.toUpperCase();
}

/* ======================= MODAL RESUMEN ======================= */
const ModalResumen = ({
  open,
  onClose,
  dte,
  sending,
  onConfirm,
}) => {
  if (!open || !dte) return null;

  const items = dte.cuerpoDocumento || [];
  const resumen = dte.resumen || {};
  const receptor = dte.receptor;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b">
            <h3 className="text-xl font-bold">Resumen de la compra</h3>
            <p className="text-xs text-gray-500">Revisa los detalles antes de confirmar</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Receptor */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-600 text-white flex items-center justify-center font-semibold">
                {receptor ? getInitials(receptor?.nombre || "Cliente") : "CF"}
              </div>
              <div className="flex-1">
                <p className="font-semibold">
                  {receptor ? (receptor?.nombre || "—") : "Consumidor final"}
                </p>
                {receptor ? (
                  <>
                    <p className="text-xs text-gray-600">{receptor?.correo || "—"}</p>
                    <p className="text-xs text-gray-600">Documento: {receptor?.numDocumento || "—"}</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-600">El receptor irá como <strong>null</strong> en el DTE.</p>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3">#</th>
                    <th className="text-left py-2 px-3">Descripción</th>
                    <th className="text-center py-2 px-3">Cant.</th>
                    <th className="text-right py-2 px-3">P. Unit</th>
                    <th className="text-right py-2 px-3">Gravada</th>
                    <th className="text-right py-2 px-3">IVA</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.numItem} className="border-t">
                      <td className="py-2 px-3">{it.numItem}</td>
                      <td className="py-2 px-3">{it.descripcion}</td>
                      <td className="py-2 px-3 text-center">{it.cantidad}</td>
                      <td className="py-2 px-3 text-right">${Number(it.precioUni).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">${Number(it.ventaGravada).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">${Number(it.ivaItem).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="border rounded-xl p-4 bg-gray-50">
              <div className="flex justify-between text-sm">
                <span>Subtotal ventas</span>
                <span>${Number(resumen.subTotalVentas || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total IVA (13%)</span>
                <span>${Number(resumen.totalIva || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold mt-2">
                <span>Total a pagar</span>
                <span>${Number(resumen.totalPagar || 0).toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {resumen.totalLetras}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <div className="flex items-center gap-3">
              {sending && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="inline-block h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  Enviando a Hacienda…
                </div>
              )}
              <button
                onClick={onConfirm}
                disabled={sending}
                className="px-5 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ====================== COMPONENTE PRINCIPAL ====================== */
const GenerarVenta = () => {
  // Productos (desde API, con paginación)
  const [productos, setProductos] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // Selección de productos (carrito)
  const [productosSeleccionados, setProductosSeleccionados] = useState({});

  // Búsqueda de productos
  const [busquedaProducto, setBusquedaProducto] = useState("");

  // Receptor y “Consumidor final”
  const [busquedaReceptor, setBusquedaReceptor] = useState("");
  const [receptorSeleccionado, setReceptorSeleccionado] = useState(null);
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [mostrarModalReceptor, setMostrarModalReceptor] = useState(false);
  const [consumidorFinal, setConsumidorFinal] = useState(false);
  const receptorTimerRef = useRef(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingDte, setPendingDte] = useState(null);

  /* ===================== FETCH: PRODUCTOS ===================== */
  const fetchProductos = async (page) => {
    setLoading(true);
    try {
      const res = await http.get(`/api/products?page=${page}&limit=${ITEMS_PER_PAGE}`);
      const data = Array.isArray(res?.data) ? res.data : [];
      const withIcons = data.map((p) => ({ ...p, _icon: normalizeIcon(p) }));
      setProductos(withIcons);

      const total = typeof res?.total === "number" ? res.total : data.length;
      const limit = typeof res?.limit === "number" ? res.limit : ITEMS_PER_PAGE;
      setTotalPaginas(Math.max(1, Math.ceil(total / limit)));
      log.debug("GenerarVenta productos OK", { page: res?.page ?? page, total: res?.total, limit: res?.limit });
    } catch (err) {
      const status = err?.status || 0;
      const payload = err?.payload || null;
      let msg = "No se pudieron cargar los productos.";
      if (status >= 400 && status < 500) {
        msg = "Error al cargar productos. Verifica tu sesión/credenciales.";
        if (payload?.message) msg += `\n(${payload.message})`;
      } else if (payload?.message) {
        msg = payload.message;
      }
      setErrorMsg(msg);
      setErrorOpen(true);
      log.error("GenerarVenta productos ERROR", { status, payload });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos(paginaActual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaActual]);

  /* ================== FETCH: CLIENTES (SEARCH) ================== */
  useEffect(() => {
    if (receptorTimerRef.current) clearTimeout(receptorTimerRef.current);

    if (!busquedaReceptor.trim()) {
      setMostrarModalReceptor(false);
      setClientesEncontrados([]);
      return;
    }
    if (consumidorFinal) return;

    receptorTimerRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const q = new URLSearchParams();
        q.set("page", "1");
        q.set("limit", "1000");
        q.set("search", busquedaReceptor.trim());
        const res = await http.get(`/api/clients?${q.toString()}`);
        const data = Array.isArray(res?.data) ? res.data : [];
        setClientesEncontrados(data);
        setMostrarModalReceptor(true);
      } catch (err) {
        const status = err?.status || 0;
        const payload = err?.payload || null;
        let msg = "No se pudieron cargar los clientes.";
        if (status >= 400 && status < 500) {
          msg = "Error al cargar clientes. Verifica tu sesión/credenciales.";
          if (payload?.message) msg += `\n(${payload.message})`;
        } else if (payload?.message) {
          msg = payload.message;
        }
        setErrorMsg(msg);
        setErrorOpen(true);
        log.error("GenerarVenta clientes ERROR", { status, payload });
      } finally {
        setLoading(false);
      }
    }, 1000);

    return () => {
      if (receptorTimerRef.current) clearTimeout(receptorTimerRef.current);
    };
  }, [busquedaReceptor, consumidorFinal]);

  /* ========================= PRODUCTOS UI ========================= */
  const productosFiltrados = useMemo(() => {
    const term = busquedaProducto.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter((p) => (p?.nombre || "").toLowerCase().includes(term));
  }, [productos, busquedaProducto]);

  const incrementarCantidad = (producto) => {
    const id = producto?._id || producto?.id;
    if (!id) return;
    setProductosSeleccionados((prev) => ({
      ...prev,
      [id]: {
        id,
        nombre: producto.nombre,
        precio: Number(producto.precio) || 0,
        _icon: producto._icon,
        codigo: producto.codigo ?? null,
        cantidad: (prev[id]?.cantidad || 0) + 1,
      },
    }));
  };

  const decrementarCantidad = (productoId) => {
    setProductosSeleccionados((prev) => {
      const id = productoId;
      const nuevaCantidad = (prev[id]?.cantidad || 0) - 1;
      if (nuevaCantidad <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [id]: {
          ...prev[id],
          cantidad: nuevaCantidad,
        },
      };
    });
  };

  const eliminarProducto = (productoId) => {
    setProductosSeleccionados((prev) => {
      const { [productoId]: _, ...rest } = prev;
      return rest;
    });
  };

  const productosEnCarrito = useMemo(() => Object.values(productosSeleccionados), [productosSeleccionados]);

  /* ========================= CLIENTE UI ========================= */
  const seleccionarReceptor = (cliente) => {
    setConsumidorFinal(false);
    setReceptorSeleccionado(cliente);
    setMostrarModalReceptor(false);
    setBusquedaReceptor("");
  };
  const deseleccionarReceptor = () => setReceptorSeleccionado(null);
  const activarConsumidorFinal = () => {
    setConsumidorFinal(true);
    setReceptorSeleccionado(null);
    setMostrarModalReceptor(false);
    setBusquedaReceptor("");
  };
  const desactivarConsumidorFinal = () => setConsumidorFinal(false);

  /* =================== CONSTRUCTOR DEL JSON (DTE) =================== */
  const buildDteFromState = () => {
    const numeroControl = buildNumeroControl();
    const codigoGeneracion = buildCodigoGeneracion();
    const fecEmi = nowDate();
    const horEmi = nowTime();

    let receptor = null;
    if (!consumidorFinal) {
      const c = receptorSeleccionado || {};
      receptor = {
        tipoDocumento: c?.tipoDocumento ?? null,
        numDocumento: c?.numDocumento ?? null,
        nrc: c?.nrc ?? null,
        nombre: c?.nombre ?? null,
        codActividad: c?.codActividad ?? null,
        descActividad: c?.descActividad ?? null,
        direccion: {
          departamento: c?.departamento ?? null,
          municipio: c?.municipio ?? null,
          complemento: c?.complementario ?? null,
        },
        telefono: c?.telefono ?? null,
        correo: c?.correo ?? null,
      };
    }

    const items = productosEnCarrito.map((it, idx) => {
      const cantidad = Number(it.cantidad) || 0;
      const precioUni = Number(it.precio) || 0;
      const ventaGravada = round(precioUni * cantidad, 2);
      const ivaItem = round(ventaGravada * 0.13, 3);
      return {
        numItem: idx + 1,
        tipoItem: 1,
        numeroDocumento: null,
        cantidad,
        codigo: it.codigo ?? null,
        codTributo: null,
        uniMedida: 59,
        descripcion: it.nombre || "",
        precioUni,
        montoDescu: 0,
        ventaNoSuj: 0,
        ventaExenta: 0,
        ventaGravada,
        tributos: null,
        psv: 0,
        noGravado: 0,
        ivaItem,
      };
    });

    const totalGravada = round(items.reduce((acc, it) => acc + (it.ventaGravada || 0), 0), 2);
    const totalPagar = totalGravada;
    const totalIva = round(totalPagar * 0.13, 2);
    const totalLetras = numeroALetrasES(totalPagar);

    const firmaPayload = {
      identificacion: {
        version: 1,
        ambiente: "00",
        tipoDte: "01",
        numeroControl,
        codigoGeneracion,
        tipoModelo: 1,
        tipoOperacion: 1,
        tipoContingencia: null,
        motivoContin: null,
        fecEmi,
        horEmi,
        tipoMoneda: "USD",
      },
      emisor: {
        nit: "93915687632456",
        nrc: "3095425",
        nombre: "Adventure Works",
        codActividad: "47631 ",
        descActividad: "Venta al por menor de bicicletas, accesorios y repuestos ",
        nombreComercial: "Adventure Works S.A. Sucursal El Salvador",
        tipoEstablecimiento: "01",
        direccion: {
          departamento: "06",
          municipio: "23",
          complemento:
            "Av. La Revolucion, Local. Oficina 21 Sexto nivel, Col. San Benito Edif. Presidente Plaza",
        },
        telefono: "60643062",
        correo: "adventureworks@awnetwork.com",
        codEstableMH: null,
        codEstable: null,
        codPuntoVentaMH: null,
        codPuntoVenta: null,
      },
      receptor,
    };
    const firma = buildFirma(firmaPayload);
    const selloRecibido = buildSelloRecibido();

    const dte = {
      identificacion: {
        version: 1,
        ambiente: "00",
        tipoDte: "01",
        numeroControl,
        codigoGeneracion,
        tipoModelo: 1,
        tipoOperacion: 1,
        tipoContingencia: null,
        motivoContin: null,
        fecEmi,
        horEmi,
        tipoMoneda: "USD",
      },
      documentoRelacionado: null,
      emisor: {
        nit: "93915687632456",
        nrc: "3095425",
        nombre: "Adventure Works",
        codActividad: "47631 ",
        descActividad: "Venta al por menor de bicicletas, accesorios y repuestos ",
        nombreComercial: "Adventure Works S.A. Sucursal El Salvador",
        tipoEstablecimiento: "01",
        direccion: {
          departamento: "06",
          municipio: "23",
          complemento:
            "Av. La Revolucion, Local. Oficina 21 Sexto nivel, Col. San Benito Edif. Presidente Plaza",
        },
        telefono: "60643062",
        correo: "adventureworks@awnetwork.com",
        codEstableMH: null,
        codEstable: null,
        codPuntoVentaMH: null,
        codPuntoVenta: null,
      },
      receptor, // null si es consumidor final
      otrosDocumentos: null,
      ventaTercero: null,
      cuerpoDocumento: items,
      resumen: {
        totalNoSuj: 0,
        totalExenta: 0,
        totalGravada: totalGravada,
        subTotalVentas: totalGravada,
        descuNoSuj: 0,
        descuExenta: 0,
        descuGravada: 0,
        porcentajeDescuento: 0,
        totalDescu: 0,
        tributos: null,
        subTotal: totalGravada,
        ivaRete1: 0,
        reteRenta: 0,
        montoTotalOperacion: totalGravada,
        totalNoGravado: 0,
        totalPagar: totalPagar,
        totalLetras: totalLetras,
        totalIva: totalIva,
        saldoFavor: 0,
        condicionOperacion: 1,
        pagos: [
          {
            codigo: "01",
            montoPago: totalPagar,
            referencia: null,
            plazo: null,
            periodo: null,
          },
        ],
        numPagoElectronico: null,
      },
      extension: null, // ahora siempre null
      apendice: null,
      firma,
      codLote: null,
      selloRecibido,
    };

    return dte;
  };

  // Abre modal de confirmación con el DTE armado
  const openConfirm = () => {
    if (!consumidorFinal && !receptorSeleccionado) {
      setErrorMsg("Selecciona un receptor o usa 'Consumidor final' antes de continuar.");
      setErrorOpen(true);
      return;
    }
    if (Object.keys(productosSeleccionados).length === 0) {
      setErrorMsg("Agrega al menos un producto al carrito.");
      setErrorOpen(true);
      return;
    }
    const json = buildDteFromState();
    setPendingDte(json);
    setConfirmOpen(true);
  };

  // Envía a backend
 const sendSale = async () => {
    if (!pendingDte) return;
    setSending(true);
    try {
      const codigoGeneracion = pendingDte?.identificacion?.codigoGeneracion;
      const payload = {
        codigo_generacion: codigoGeneracion, // << snake_case, tomado del DTE
        detalle_venta: pendingDte,          // << el JSON DTE completo
      };

      log.debug("POST /api/sales →", payload);
      await http.post("/api/sales", payload);
      log.debug("POST /api/sales OK ←");

      setConfirmOpen(false);
      setSuccessMsg("Venta enviada a Hacienda correctamente.");
      setSuccessOpen(true);
      // Limpieza opcional del carrito:
      // setProductosSeleccionados({});
    } catch (err) {
      const status = err?.status || 0;
      const payload = err?.payload || null;
      let msg = "No se pudo enviar la venta a Hacienda.";
      if (status >= 400 && status < 500) {
        msg = "Error al enviar. Revisa los datos o credenciales.";
        if (payload?.message) msg += `\n(${payload.message})`;
      } else if (payload?.message) {
        msg = payload.message;
      }
      setErrorMsg(msg);
      setErrorOpen(true);
      log.error("POST /api/sales ERROR", { status, payload: err?.payload || err });
    } finally {
      setSending(false);
    }
  };

  /* ========================= RENDER ========================= */
  const cambiarPagina = (pagina) => {
    if (pagina >= 1 && pagina <= totalPaginas) setPaginaActual(pagina);
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
            <ShoppingCart className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Facturación Electrónica</h1>
            <p className="text-sm text-gray-500">Generado por: Jose Lora.</p>
          </div>
        </div>

        {/* Receptor */}
        <div className="mb-6 relative">
          <h2 className="text-lg font-semibold mb-3">Receptor</h2>

          {/* Banda superior: avatar demo + botón consumidor final */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex -space-x-2">
              <img src="https://i.pravatar.cc/40?img=1" alt="" className="w-8 h-8 rounded-full border-2 border-white" />
              <img src="https://i.pravatar.cc/40?img=2" alt="" className="w-8 h-8 rounded-full border-2 border-white" />
              <img src="https://i.pravatar.cc/40?img=3" alt="" className="w-8 h-8 rounded-full border-2 border-white" />
            </div>
            <span className="text-sm text-gray-600">O si prefieres:</span>
            {!consumidorFinal ? (
              <button onClick={activarConsumidorFinal} className="px-4 py-1 bg-black text-white text-sm rounded-md">
                Consumidor final
              </button>
            ) : (
              <button onClick={desactivarConsumidorFinal} className="px-4 py-1 bg-gray-200 text-gray-800 text-sm rounded-md">
                Quitar consumidor final
              </button>
            )}
          </div>

          {/* Card de receptor */}
          {consumidorFinal ? (
            <div className="flex items-center gap-3 mb-3 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="w-10 h-10 rounded-full bg-yellow-500 text-white flex items-center justify-center font-semibold">
                CF
              </div>
              <div className="flex-1">
                <p className="font-semibold">Consumidor final</p>
                <p className="text-xs text-gray-600">
                  Los datos del receptor irán como <strong>null</strong>.
                </p>
              </div>
              <button onClick={desactivarConsumidorFinal} className="text-red-500 hover:text-red-700" title="Quitar consumidor final">
                <X size={20} />
              </button>
            </div>
          ) : receptorSeleccionado ? (
            <div className="flex items-center gap-3 mb-3 bg-cyan-50 p-3 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-cyan-600 text-white flex items-center justify-center font-semibold">
                {getInitials(receptorSeleccionado.nombre)}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{receptorSeleccionado.nombre}</p>
                <p className="text-sm text-gray-600">{receptorSeleccionado.correo}</p>
                {receptorSeleccionado?.numDocumento && (
                  <p className="text-xs text-gray-500">Documento: {receptorSeleccionado.numDocumento}</p>
                )}
              </div>
              <button onClick={deseleccionarReceptor} className="text-red-500 hover:text-red-700" title="Quitar receptor">
                <X size={20} />
              </button>
            </div>
          ) : null}

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar cliente por nombre, correo o número de documento"
              value={busquedaReceptor}
              onChange={(e) => setBusquedaReceptor(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              disabled={consumidorFinal}
            />
          </div>

          <AnimatePresence>
            {!consumidorFinal && mostrarModalReceptor && clientesEncontrados.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-full max-w-xl"
              >
                <h3 className="font-semibold mb-3">Clientes encontrados:</h3>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {clientesEncontrados.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => seleccionarReceptor(c)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-700 font-semibold">
                        {getInitials(c.nombre)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{c.nombre}</p>
                        <p className="text-xs text-gray-600">{c.correo}</p>
                        {c?.numDocumento && <p className="text-xs text-gray-500">Documento: {c.numDocumento}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Agregar Producto */}
        <div className="mb-6">
          <div className="flex items-centered gap-3 mb-3">
            <h2 className="text-lg font-semibold">Agregar Producto</h2>
          </div>

          <div className="rounded-xl p-4 bg-gray-50">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar producto por nombre"
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2">
              {productosFiltrados.map((p) => {
                const id = p?._id || p?.id;
                const cantidad = productosSeleccionados[id]?.cantidad || 0;
                const isSelected = cantidad > 0;

                return (
                  <motion.div
                    key={id}
                    whileHover={{ scale: 1.02 }}
                    className={`bg-white rounded-lg p-4 border-2 transition-all ${
                      isSelected ? "border-cyan-400 shadow-md" : "border-gray-200"
                    }`}
                  >
                    {/* Icono / Imagen */}
                    <div className="flex items-center justify-center mb-3">
                      {looksLikeImageUrl(p._icon) ? (
                        <img
                          src={p._icon}
                          alt={p.nombre}
                          className="w-16 h-16 object-contain rounded-md"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">
                          {p._icon}
                        </div>
                      )}
                    </div>

                    <h3 className="text-sm font-medium mb-1 text-center">{p.nombre}</h3>
                    <p className="text-lg font-bold text-center mb-3">${Number(p.precio).toFixed(2)}</p>

                    {isSelected ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => decrementarCantidad(id)}
                          className="w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          title="Quitar uno"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-bold text-lg w-8 text-center">{cantidad}</span>
                        <button
                          onClick={() => incrementarCantidad(p)}
                          className="w-7 h-7 bg-cyan-500 text-white rounded-full flex items-center justify-center hover:bg-cyan-600"
                          title="Agregar uno"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => incrementarCantidad(p)}
                        className="w-full py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 transition-colors text-sm"
                      >
                        Agregar
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Paginación de productos */}
            <div className="flex justify-center items-center gap-2 mt-4">
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
                      className={`px-3 py-1 rounded ${
                        page === paginaActual ? "bg-gray-200 font-semibold" : "hover:bg-gray-100"
                      }`}
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
          </div>

          {/* Acciones principales */}
          <p className="text-sm text-gray-600 mt-3">¿Todo listo? Entonces haz clic en:</p>
          <div className="flex flex-wrap gap-3 mt-2">
            <button
              className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
              onClick={openConfirm}
              title="Mostrar resumen y enviar"
            >
              Confirmar orden
            </button>
            <button className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              o si prefieres
            </button>
            <button
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              onClick={openConfirm}
              title="Mostrar resumen y enviar"
            >
              Generar cotización
            </button>
          </div>
        </div>

        {/* Detalles de la venta y Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Detalles */}
          <div className="bg-[#f5f0e8] rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Detalles de la venta</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2">Nombre</th>
                  <th className="text-center py-2">Cantidad</th>
                  <th className="text-right py-2">Precio</th>
                  <th className="text-right py-2">Sub total</th>
                  <th className="text-right py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {productosEnCarrito.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-gray-500">
                      No hay productos seleccionados
                    </td>
                  </tr>
                ) : (
                  productosEnCarrito.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-2">{item.nombre}</td>
                      <td className="text-center">{item.cantidad}</td>
                      <td className="text-right">${Number(item.precio).toFixed(2)}</td>
                      <td className="text-right">${(item.precio * item.cantidad).toFixed(2)}</td>
                      <td className="text-right">
                        <button onClick={() => eliminarProducto(item.id)} className="text-red-500 hover:text-red-700">
                          <X size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Resumen (totales) */}
          <div className="bg-[#f5f0e8] rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Resumen</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2">Nombre</th>
                  <th className="text-center py-2">Cantidad</th>
                  <th className="text-right py-2">Precio</th>
                  <th className="text-right py-2">Sub total</th>
                  <th className="text-right py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {productosEnCarrito.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-gray-500">
                      No hay productos seleccionados
                    </td>
                  </tr>
                ) : (
                  productosEnCarrito.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-2">{item.nombre}</td>
                      <td className="text-center">{item.cantidad}</td>
                      <td className="text-right">${Number(item.precio).toFixed(2)}</td>
                      <td className="text-right font-semibold">
                        ${(item.precio * item.cantidad).toFixed(2)}
                      </td>
                      <td className="text-right">
                        <button onClick={() => eliminarProducto(item.id)} className="text-red-500 hover:text-red-700">
                          <X size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {productosEnCarrito.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-300">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>
                    $
                    {productosEnCarrito
                      .reduce((total, item) => total + item.precio * item.cantidad, 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Modal de resumen + envío */}
      <ModalResumen
        open={confirmOpen}
        onClose={() => !sending && setConfirmOpen(false)}
        dte={pendingDte}
        sending={sending}
        onConfirm={sendSale}
      />

      {/* Overlays */}
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

export default GenerarVenta;
