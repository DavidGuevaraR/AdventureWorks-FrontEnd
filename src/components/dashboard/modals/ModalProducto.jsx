// src/components/dashboard/modals/ModalProducto.jsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

import Loader from "../../ui/Loader";
import ErrorModal from "../../ui/ErrorModal";

import { http } from "../../../lib/httpClient";
import { log } from "../../../lib/logger";

const ModalProducto = ({ producto, onClose, onSave }) => {
  const isEdit = !!producto?._id;

  const [formData, setFormData] = useState({
    codigo_producto: "",
    nombre: "",
    precio: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (producto) {
      setFormData({
        codigo_producto: producto.codigo_producto || "",
        nombre: producto.nombre || "",
        precio: producto.precio ?? "",
      });
    }
  }, [producto]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nombre = String(formData.nombre || "").trim();
    const codigo = String(formData.codigo_producto || "").trim();
    const precioNum = Number(formData.precio);

    if (!nombre || !codigo || Number.isNaN(precioNum)) {
      setErrorMsg("Completa todos los campos correctamente (precio numérico).");
      setErrorOpen(true);
      return;
    }

    try {
      setLoading(true);

      if (isEdit) {
        const payload = { nombre, codigo_producto: codigo, precio: precioNum };
        log.debug("PATCH producto →", { id: producto._id, payload });
        await http.patch(`/api/products/${producto._id}`, payload);
        log.debug("PATCH producto OK ←");

        // ✅ avisar al padre qué acción fue
        onSave?.({ mode: "edit" });
      } else {
        const payload = { nombre, codigo_producto: codigo, precio: precioNum, is_active: true };
        log.debug("POST producto →", payload);
        await http.post(`/api/products`, payload);
        log.debug("POST producto OK ←");

        // ✅ avisar al padre qué acción fue
        onSave?.({ mode: "create" });
      }
    } catch (err) {
      const status = err?.status || 0;
      const payload = err?.payload || null;
      let msg = isEdit ? "No se pudo actualizar el producto." : "No se pudo crear el producto.";
      if (status >= 400 && status < 500) {
        msg += " Verifica los datos o tus permisos.";
        if (payload?.message) msg += `\n(${payload.message})`;
      } else if (payload?.message) {
        msg = payload.message;
      }
      setErrorMsg(msg);
      setErrorOpen(true);
      log.error("ModalProducto ERROR", { status, payload });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{isEdit ? "Editar Producto" : "Agregar Producto"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" title="Cerrar">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Código</label>
            <input
              type="text"
              value={formData.codigo_producto}
              onChange={(e) => setFormData({ ...formData, codigo_producto: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Nombre</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Precio</label>
            <input
              type="number"
              step="0.01"
              value={formData.precio}
              onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition-colors"
            >
              {isEdit ? "Guardar cambios" : "Guardar"}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Overlays SOLO de este modal */}
      <Loader show={loading} />
      <ErrorModal
        open={errorOpen}
        onClose={() => setErrorOpen(false)}
        title={isEdit ? "No se pudo actualizar" : "No se pudo crear"}
        message={errorMsg}
      />
    </motion.div>
  );
};

export default ModalProducto;
