// src/components/dashboard/modals/ModalCliente.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

import Loader from "../../ui/Loader";
import ErrorModal from "../../ui/ErrorModal";

import { http } from "../../../lib/httpClient";
import { log } from "../../../lib/logger";

// Departamentos (primera imagen)
const DEPARTAMENTOS = [
  "San Salvador",
  "Cuscatlán",
  "La Paz",
  "Cabañas",
  "San Vicente",
  "Usulután",
  "San Miguel",
  "Morazán",
  "La Unión",
];

// Municipios por departamento (CAT-013)
const MUNICIPIOS_BY_DEPTO = {
  "San Salvador": [
    "SAN SALVADOR NORTE",
    "SAN SALVADOR OESTE",
    "SAN SALVADOR ESTE",
    "SAN SALVADOR CENTRO",
    "SAN SALVADOR SUR",
  ],
  Cuscatlán: ["CUSCATLAN NORTE", "CUSCATLAN SUR"],
  "La Paz": ["LA PAZ OESTE", "LA PAZ CENTRO", "LA PAZ ESTE"],
  Cabañas: ["CABAÑAS OESTE", "CABAÑAS ESTE"],
  "San Vicente": ["SAN VICENTE NORTE", "SAN VICENTE SUR"],
  Usulután: ["USULUTAN NORTE", "USULUTAN ESTE", "USULUTAN OESTE"],
  "San Miguel": ["SAN MIGUEL NORTE", "SAN MIGUEL CENTRO", "SAN MIGUEL OESTE"],
  Morazán: ["MORAZAN NORTE", "MORAZAN SUR"],
  "La Unión": ["LA UNION NORTE", "LA UNION SUR"],
};

// Opcional: catálogo corto de tipos de documento (puedes editarlo libremente)
// Mostramos una lista, pero dejamos el input como texto libre para flexibilidad.
const TIPOS_DOC_SUGERIDOS = [
  { code: "36", label: "NIT (36)" },
  { code: "13", label: "DUI (13)" },
  { code: "03", label: "Pasaporte (03)" },
];

const ModalCliente = ({ cliente, onClose, onSave }) => {
  const isEdit = !!cliente?._id;

  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    departamento: "",
    municipio: "",
    complementario: "",
    tipoDocumento: "",     // nuevo (opcional)
    numDocumento: "",      // nuevo (opcional)
    nrc: "",               // nuevo (opcional)
    codActividad: "",      // nuevo (opcional)
    descActividad: "",     // nuevo (opcional)
  });

  const [loading, setLoading] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Opciones de municipios dependientes del departamento
  const municipiosOpciones = useMemo(() => {
    const d = formData.departamento;
    const list = d ? MUNICIPIOS_BY_DEPTO[d] || [] : [];
    // Edge case al editar: si el municipio actual no está listado, lo agregamos para no perderlo.
    if (formData.municipio && list.length && !list.includes(formData.municipio)) {
      return [formData.municipio, ...list];
    }
    return list;
  }, [formData.departamento, formData.municipio]);

  // Cargar datos al editar
  useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre || "",
        correo: cliente.correo || "",
        departamento: cliente.departamento || "",
        municipio: cliente.municipio || "",
        complementario: cliente.complementario || "",
        tipoDocumento: cliente.tipoDocumento || "",
        numDocumento: cliente.numDocumento || "",
        nrc: cliente.nrc || "",
        codActividad: cliente.codActividad || "",
        descActividad: cliente.descActividad || "",
      });
    }
  }, [cliente]);

  // Al cambiar departamento, limpiamos municipio dependiente
  const handleDepartamentoChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      departamento: value,
      municipio: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      nombre: String(formData.nombre || "").trim(),
      correo: String(formData.correo || "").trim(),
      municipio: String(formData.municipio || "").trim(),
      departamento: String(formData.departamento || "").trim(),
      complementario: String(formData.complementario || "").trim(),
      // Campos opcionales (solo si vienen con valor)
      ...(formData.tipoDocumento ? { tipoDocumento: String(formData.tipoDocumento).trim() } : {}),
      ...(formData.numDocumento ? { numDocumento: String(formData.numDocumento).trim() } : {}),
      ...(formData.nrc ? { nrc: String(formData.nrc).trim() } : {}),
      ...(formData.codActividad ? { codActividad: String(formData.codActividad).trim() } : {}),
      ...(formData.descActividad ? { descActividad: String(formData.descActividad).trim() } : {}),
    };

    // Validación mínima requerida
    if (
      !payload.nombre ||
      !payload.correo ||
      !payload.departamento ||
      !payload.municipio ||
      !payload.complementario
    ) {
      setErrorMsg("Completa todos los campos requeridos.");
      setErrorOpen(true);
      return;
    }

    try {
      setLoading(true);
      if (isEdit) {
        log.debug("PATCH cliente →", { id: cliente._id, payload });
        await http.patch(`/api/clients/${cliente._id}`, payload);
        log.debug("PATCH cliente OK ←");
        onSave?.({ mode: "edit" });
      } else {
        log.debug("POST cliente →", payload);
        await http.post(`/api/clients`, payload);
        log.debug("POST cliente OK ←");
        onSave?.({ mode: "create" });
      }
    } catch (err) {
      const status = err?.status || 0;
      const p = err?.payload || null;
      let msg = isEdit ? "No se pudo actualizar el cliente." : "No se pudo crear el cliente.";
      if (status >= 400 && status < 500) {
        msg += " Verifica los datos o tus permisos.";
        if (p?.message) msg += `\n(${p.message})`;
      } else if (p?.message) {
        msg = p.message;
      }
      setErrorMsg(msg);
      setErrorOpen(true);
      log.error("ModalCliente ERROR", { status, payload: p });
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
        className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{isEdit ? "Editar Cliente" : "Agregar Cliente"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" title="Cerrar">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
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

          {/* Correo */}
          <div>
            <label className="block text-sm font-medium mb-2">Correo</label>
            <input
              type="email"
              value={formData.correo}
              onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          {/* Departamento */}
          <div>
            <label className="block text-sm font-medium mb-2">Departamento</label>
            <select
              value={formData.departamento}
              onChange={(e) => handleDepartamentoChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              required
            >
              <option value="" disabled>
                Selecciona un departamento
              </option>
              {DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Municipio (dependiente) */}
          <div>
            <label className="block text-sm font-medium mb-2">Municipio</label>
            <select
              value={formData.municipio}
              onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              required
              disabled={!formData.departamento}
            >
              <option value="" disabled>
                {formData.departamento ? "Selecciona un municipio" : "Selecciona un departamento primero"}
              </option>
              {municipiosOpciones.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Complementario */}
          <div>
            <label className="block text-sm font-medium mb-2">Complemento</label>
            <textarea
              value={formData.complementario}
              onChange={(e) => setFormData({ ...formData, complementario: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={3}
              required
            />
          </div>

          {/* Datos fiscales opcionales */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Datos fiscales (opcional)</h3>

            {/* Tipo de documento (libre con sugerencias) */}
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de documento</label>
              <input
                list="tipo-doc-sugeridos"
                type="text"
                value={formData.tipoDocumento}
                onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Ej. 36 (NIT), 13 (DUI), 03 (Pasaporte)"
              />
              <datalist id="tipo-doc-sugeridos">
                {TIPOS_DOC_SUGERIDOS.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Número de documento */}
            <div>
              <label className="block text-sm font-medium mb-2">Número de documento</label>
              <input
                type="text"
                value={formData.numDocumento}
                onChange={(e) => setFormData({ ...formData, numDocumento: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Ej. 06140107110029"
              />
            </div>

            {/* NRC */}
            <div>
              <label className="block text-sm font-medium mb-2">NRC</label>
              <input
                type="text"
                value={formData.nrc}
                onChange={(e) => setFormData({ ...formData, nrc: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="NRC del cliente (opcional)"
              />
            </div>

            {/* Código de actividad */}
            <div>
              <label className="block text-sm font-medium mb-2">Código de actividad</label>
              <input
                type="text"
                value={formData.codActividad}
                onChange={(e) => setFormData({ ...formData, codActividad: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Ej. 56107"
              />
            </div>

            {/* Descripción de actividad */}
            <div>
              <label className="block text-sm font-medium mb-2">Descripción de actividad</label>
              <input
                type="text"
                value={formData.descActividad}
                onChange={(e) => setFormData({ ...formData, descActividad: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Ej. Actividades varias de restaurantes"
              />
            </div>
          </div>

          {/* Botones */}
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
              className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
            >
              {isEdit ? "Guardar cambios" : "Guardar"}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Overlays SOLO del modal */}
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

export default ModalCliente;
