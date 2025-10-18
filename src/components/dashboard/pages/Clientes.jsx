// src/components/dashboard/pages/Clientes.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Edit, Trash2 } from "lucide-react";

import ModalCliente from "../modals/ModalCliente";
import Loader from "../../ui/Loader";
import ErrorModal from "../../ui/ErrorModal";
import SuccessModal from "../../ui/SuccessModal";

import { http } from "../../../lib/httpClient";
import { secureGet } from "../../../lib/secureStorage";
import { log } from "../../../lib/logger";

const ITEMS_PER_PAGE = 10;

const palette = [
  "bg-orange-400","bg-purple-400","bg-purple-500","bg-purple-600",
  "bg-gray-600","bg-pink-400","bg-blue-400","bg-green-400",
  "bg-indigo-400","bg-yellow-400","bg-red-400","bg-teal-400",
  "bg-cyan-400","bg-lime-400","bg-amber-400","bg-rose-400","bg-violet-400","bg-fuchsia-400","bg-sky-400","bg-emerald-400"
];
const pickColor = (str = "") => {
  let sum = 0;
  for (let i = 0; i < str.length; i++) sum = (sum + str.charCodeAt(i)) % palette.length;
  return palette[sum];
};
const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || "")
    .join("");

const Clientes = () => {
  const [busqueda, setBusqueda] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(""); // ← para debounce 1s

  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [clientesApi, setClientesApi] = useState([]); // página actual del backend
  const [loading, setLoading] = useState(false);

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [userRole, setUserRole] = useState(null);
  const [tokenReady, setTokenReady] = useState(false);

  // rol
  useEffect(() => {
    (async () => {
      const user = await secureGet("aw:user");
      const role = user?.role || null;
      setUserRole(role);
      setTokenReady(true);
      log.debug("Clientes: userRole =", role);
    })();
  }, []);

  // debounce 1s para buscar por nombre o numDocumento (search libre)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(busqueda.trim()), 1000);
    return () => clearTimeout(t);
  }, [busqueda]);

  // fetch
  const fetchClientes = async (page, search) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
        ...(search ? { search } : {}),
      }).toString();

      const res = await http.get(`/api/clients?${qs}`);
      const data = Array.isArray(res?.data) ? res.data : [];
      setClientesApi(data);

      const total = typeof res?.total === "number" ? res.total : data.length;
      const limit = typeof res?.limit === "number" ? res.limit : ITEMS_PER_PAGE;
      setTotalPaginas(Math.max(1, Math.ceil(total / limit)));

      log.debug("Clientes fetch OK", { page: res?.page ?? page, total: res?.total, limit: res?.limit, search });
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
      log.error("Clientes fetch ERROR", { status, payload });
    } finally {
      setLoading(false);
    }
  };

  // cargar cuando cambien page o search (debounced)
  useEffect(() => {
    if (!tokenReady) return;
    fetchClientes(paginaActual, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaActual, debouncedSearch, tokenReady]);

  // filtro y rol (en cliente, por si quieres seguir acotando)
  const clientesVisibles = useMemo(() => {
    let base = [...clientesApi];
    if (userRole !== "ADMIN") base = base.filter(c => c?.is_active === true);
    // iniciales/color para UI
    return base.map(c => ({
      ...c,
      _iniciales: initials(c?.nombre),
      _color: pickColor(c?.nombre),
    }));
  }, [clientesApi, userRole]);

  // toggle is_active (solo ADMIN)
  const handleToggleEstado = async (cliente) => {
    if (!cliente?._id) return;
    const next = !cliente.is_active;
    try {
      setLoading(true);
      await http.patch(`/api/clients/${cliente._id}`, {
        // mantenemos los campos necesarios (el backend acepta parciales)
        is_active: next,
      });
      setSuccessMsg(next ? "Cliente habilitado correctamente." : "Cliente deshabilitado correctamente.");
      setSuccessOpen(true);
      await fetchClientes(paginaActual, debouncedSearch);
    } catch (err) {
      const status = err?.status || 0;
      const payload = err?.payload || null;
      let msg = "No se pudo cambiar el estado del cliente.";
      if (status >= 400 && status < 500) {
        msg = "Error: revisa permisos/credenciales.";
        if (payload?.message) msg += `\n(${payload.message})`;
      } else if (payload?.message) {
        msg = payload.message;
      }
      setErrorMsg(msg);
      setErrorOpen(true);
      log.error("Toggle cliente ERROR", { status, payload });
    } finally {
      setLoading(false);
    }
  };

  // eliminar (solo ADMIN)
  const handleDelete = async (cliente) => {
    if (!cliente?._id) return;
    const ok = window.confirm(`¿Eliminar a "${cliente.nombre}"? Esta acción no se puede deshacer.`);
    if (!ok) return;

    try {
      setLoading(true);
      await http.delete(`/api/clients/${cliente._id}`);
      setSuccessMsg("Cliente eliminado correctamente.");
      setSuccessOpen(true);
      await fetchClientes(paginaActual, debouncedSearch);
    } catch (err) {
      const status = err?.status || 0;
      const payload = err?.payload || null;
      let msg = "No se pudo eliminar el cliente.";
      if (status >= 400 && status < 500) {
        msg = "Error al eliminar. Verifica permisos/credenciales.";
        if (payload?.message) msg += `\n(${payload.message})`;
      } else if (payload?.message) {
        msg = payload.message;
      }
      setErrorMsg(msg);
      setErrorOpen(true);
      log.error("Delete cliente ERROR", { status, payload });
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-400 rounded-full flex items-center justify-center">
              <Users className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Clientes guardados</h1>
              <p className="text-sm text-gray-500">Gestión por: Jose Lora.</p>
            </div>
          </div>

          {/* Solo ADMIN puede agregar */}
          {userRole === "ADMIN" && (
            <button
              onClick={() => {
                setClienteSeleccionado(null);
                setModalAbierto(true);
              }}
              className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2"
            >
              <Users size={18} />
              Agregar Cliente
            </button>
          )}
        </div>

        {/* Search (con debounce de 1s) */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre o número de documento"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPaginaActual(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="text-left py-3 px-4">Cliente</th>
                <th className="text-left py-3 px-4">Correo</th>
                <th className="text-left py-3 px-4">Municipio</th>
                <th className="text-left py-3 px-4">Departamento</th>
                <th className="text-left py-3 px-4">Complemento</th>
                {userRole === "ADMIN" && <th className="text-left py-3 px-4">Estado</th>}
                {userRole === "ADMIN" && <th className="text-left py-3 px-4"></th>}
              </tr>
            </thead>
            <tbody>
              {clientesVisibles.map((cliente, index) => (
                <motion.tr
                  key={cliente._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-4 px-4">
                    <input type="checkbox" className="rounded border-orange-400" />
                  </td>

                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 ${cliente._color} rounded-full flex items-center justify-center text-white font-semibold text-sm`}
                      >
                        {cliente._iniciales}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{cliente.nombre}</p>
                        {/* podrías mostrar numDocumento si quieres */}
                        {/* <p className="text-xs text-gray-500">{cliente.numDocumento}</p> */}
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4 text-sm">{cliente.correo}</td>
                  <td className="py-4 px-4 text-sm">{cliente.municipio}</td>
                  <td className="py-4 px-4 text-sm">{cliente.departamento}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">{cliente.complementario}</td>

                  {/* Solo ADMIN: toggle + acciones */}
                  {userRole === "ADMIN" && (
                    <td className="py-4 px-4">
                      <EstadoToggle activo={!!cliente.is_active} onClick={() => handleToggleEstado(cliente)} />
                    </td>
                  )}

                  {userRole === "ADMIN" && (
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <button
                          className="text-gray-400 hover:text-gray-600"
                          title="Editar"
                          onClick={() => {
                            setClienteSeleccionado(cliente);
                            setModalAbierto(true);
                          }}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          className="text-gray-400 hover:text-red-600"
                          title="Eliminar"
                          onClick={() => handleDelete(cliente)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
          <ModalCliente
            cliente={clienteSeleccionado}
            onClose={() => setModalAbierto(false)}
            onSave={async ({ mode }) => {
              setModalAbierto(false);
              await fetchClientes(paginaActual, debouncedSearch);
              // Éxito visual
              setSuccessMsg(mode === "edit" ? "Cliente editado correctamente." : "Cliente agregado correctamente.");
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

export default Clientes;
