// src/components/dashboard/pages/Productos.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingCart, Edit } from "lucide-react";

import ModalProducto from "../modals/ModalProducto";
import Loader from "../../ui/Loader";
import ErrorModal from "../../ui/ErrorModal";
import SuccessModal from "../../ui/SuccessModal";

import { http } from "../../../lib/httpClient";
import { secureGet } from "../../../lib/secureStorage";
import { log } from "../../../lib/logger";

const ITEMS_PER_PAGE = 10;

const Productos = () => {
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [productosApi, setProductosApi] = useState([]);
  const [loading, setLoading] = useState(false);

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [userRole, setUserRole] = useState(null);
  const [tokenReady, setTokenReady] = useState(false);

  // Cargar rol
  useEffect(() => {
    (async () => {
      const user = await secureGet("aw:user");
      const role = user?.role || null;
      setUserRole(role);
      setTokenReady(true);
      log.debug("Productos: userRole =", role);
    })();
  }, []);

  // Fetch con paginado
  const fetchProductos = async (page) => {
    setLoading(true);
    try {
      const res = await http.get(`/api/products?page=${page}&limit=${ITEMS_PER_PAGE}`);
      const data = Array.isArray(res?.data) ? res.data : [];
      setProductosApi(data);

      const total = typeof res?.total === "number" ? res.total : data.length;
      const limit = typeof res?.limit === "number" ? res.limit : ITEMS_PER_PAGE;
      setTotalPaginas(Math.max(1, Math.ceil(total / limit)));

      log.debug("Productos fetch OK", { page: res?.page ?? page, total: res?.total, limit: res?.limit });
    } catch (err) {
      const status = err?.status || 0;
      const payload = err?.payload || null;
      let msg = "Ha ocurrido un error. Inténtalo de nuevo.";
      if (status >= 400 && status < 500) {
        msg = "Error al cargar productos. Verifica tu sesión/credenciales.";
        if (payload?.message) msg += `\n(${payload.message})`;
      } else if (payload?.message) {
        msg = payload.message;
      }
      setErrorMsg(msg);
      setErrorOpen(true);
      log.error("Productos fetch ERROR", { status, payload });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tokenReady) return;
    fetchProductos(paginaActual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaActual, tokenReady]);

  // Filtro cliente + rol
  const productosVisibles = useMemo(() => {
    let base = [...productosApi];
    if (userRole !== "ADMIN") base = base.filter((p) => p?.is_active === true);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      base = base.filter((p) => (p?.nombre || "").toLowerCase().includes(q));
    }
    return base;
  }, [productosApi, userRole, busqueda]);

  // Toggle estado (ADMIN)
  const handleToggleEstado = async (producto) => {
    if (!producto?._id) return;
    const next = !producto.is_active;

    try {
      setLoading(true);
      await http.patch(`/api/products/${producto._id}`, { is_active: next });

      // Opcional: podrías también mostrar éxito aquí si quieres.
      await fetchProductos(paginaActual);
    } catch (err) {
      const status = err?.status || 0;
      const payload = err?.payload || null;
      let msg = "No se pudo actualizar el estado del producto.";
      if (status >= 400 && status < 500) {
        msg = "Error: no se pudo cambiar el estado. Verifica permisos/credenciales.";
        if (payload?.message) msg += `\n(${payload.message})`;
      } else if (payload?.message) {
        msg = payload.message;
      }
      setErrorMsg(msg);
      setErrorOpen(true);
      log.error("Toggle estado ERROR", { status, payload });
    } finally {
      setLoading(false);
    }
  };

  const cambiarPagina = (pagina) => {
    if (pagina >= 1 && pagina <= totalPaginas) setPaginaActual(pagina);
  };

  const EstadoToggle = ({ activo, onClick }) => (
    <button
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        activo ? "bg-green-500" : "bg-red-500"
      }`}
      title={activo ? "Deshabilitar" : "Habilitar"}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
          activo ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );

  return (
    <div className="max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-lg p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-400 rounded-full flex items-center justify-center">
              <ShoppingCart className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Productos en venta</h1>
              <p className="text-sm text-gray-500">Gestión por: Jose Lora.</p>
            </div>
          </div>

          {userRole === "ADMIN" && (
            <button
              onClick={() => {
                setProductoSeleccionado(null);
                setModalAbierto(true);
              }}
              className="px-4 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2"
            >
              <span>👑</span>
              Agregar producto
            </button>
          )}
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar producto por nombre"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="text-left py-3 px-4">Código</th>
                <th className="text-left py-3 px-4">Nombre</th>
                <th className="text-left py-3 px-4">Precio</th>
                {userRole === "ADMIN" && <th className="text-left py-3 px-4">Estado</th>}
                {userRole === "ADMIN" && <th className="text-left py-3 px-4"></th>}
              </tr>
            </thead>
            <tbody>
              {productosVisibles.map((producto, index) => (
                <motion.tr
                  key={producto._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-4 px-4">
                    <input type="checkbox" className="rounded border-orange-400" />
                  </td>
                  <td className="py-4 px-4 text-sm">{producto.codigo_producto}</td>
                  <td className="py-4 px-4 text-sm font-medium">{producto.nombre}</td>
                  <td className="py-4 px-4 text-sm font-semibold">
                    ${Number(producto.precio).toFixed(2)}
                  </td>

                  {userRole === "ADMIN" && (
                    <td className="py-4 px-4">
                      <EstadoToggle
                        activo={!!producto.is_active}
                        onClick={() => handleToggleEstado(producto)}
                      />
                    </td>
                  )}

                  {userRole === "ADMIN" && (
                    <td className="py-4 px-4">
                      <button
                        className="text-gray-400 hover:text-gray-600"
                        title="Editar"
                        onClick={() => {
                          setProductoSeleccionado(producto);
                          setModalAbierto(true);
                        }}
                      >
                        <Edit size={18} />
                      </button>
                    </td>
                  )}
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

          {[...Array(totalPaginas)].map((_, index) => {
            const pagina = index + 1;
            if (pagina === 1 || pagina === totalPaginas || (pagina >= paginaActual - 1 && pagina <= paginaActual + 1)) {
              return (
                <button
                  key={pagina}
                  onClick={() => cambiarPagina(pagina)}
                  className={`px-3 py-1 rounded ${
                    pagina === paginaActual ? "bg-gray-200 font-semibold" : "hover:bg-gray-100"
                  }`}
                >
                  {String(pagina).padStart(2, "0")}
                </button>
              );
            } else if (pagina === paginaActual - 2 || pagina === paginaActual + 2) {
              return <span key={pagina}>...</span>;
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

      {/* Modal Crear/Editar */}
      <AnimatePresence>
        {modalAbierto && (
          <ModalProducto
            producto={productoSeleccionado}
            onClose={() => setModalAbierto(false)}
            onSave={async ({ mode }) => {
              setModalAbierto(false);
              await fetchProductos(paginaActual);
              // ✅ Success en el padre indicando acción
              setSuccessMsg(
                mode === "edit" ? "Producto editado correctamente." : "Producto agregado correctamente."
              );
              setSuccessOpen(true);
            }}
          />
        )}
      </AnimatePresence>

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
        autoCloseMs={1200}
      />
    </div>
  );
};

export default Productos;
