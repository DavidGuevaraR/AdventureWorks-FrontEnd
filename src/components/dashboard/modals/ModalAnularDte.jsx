// src/components/dashboard/modals/ModalAnularDte.jsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

import Loader from "../../ui/Loader";
import ErrorModal from "../../ui/ErrorModal";
import { http } from "../../../lib/httpClient";
import { log } from "../../../lib/logger";

const ModalAnularDte = ({ venta, onClose, onSuccess, onError }) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = { reason: String(reason || "").trim() };
    if (!body.reason) {
      const msg = "Debes indicar la razón de la anulación.";
      setErrorMsg(msg);
      setErrorOpen(true);
      onError?.(msg);
      return;
    }

    try {
      setLoading(true);
      // ⬇️ RUTA ACTUALIZADA
      const url = `/api/sales/${venta?._id}/cancel`;
      log.debug("ANULAR DTE →", { url, body });
      await http.patch(url, body);
      log.debug("ANULAR DTE OK ←");
      onSuccess?.();
    } catch (err) {
      const status = err?.status || 0;
      const p = err?.payload || null;
      let msg = "No se pudo anular el DTE.";
      if (status >= 400 && status < 500) {
        msg += " Valida permisos o el estado del documento.";
        if (p?.message) msg += `\n(${p.message})`;
      } else if (p?.message) {
        msg = p.message;
      }
      setErrorMsg(msg);
      setErrorOpen(true);
      onError?.(msg);
      log.error("ANULAR DTE ERROR", { status, payload: p });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[80] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">Anular DTE</h2>
          <button className="text-gray-400 hover:text-gray-600" onClick={onClose} title="Cerrar">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            <div className="text-sm text-gray-600">
              <p>
                Vas a anular el DTE con código de generación:{" "}
                <span className="font-mono font-semibold text-gray-900">{venta?.codigo_generacion}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Razón</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Describe la razón de la anulación"
                required
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
            >
              Anular DTE
            </button>
          </div>
        </form>
      </motion.div>

      <Loader show={loading} />
      <ErrorModal
        open={errorOpen}
        onClose={() => setErrorOpen(false)}
        title="No se pudo anular"
        message={errorMsg}
      />
    </motion.div>
  );
};

export default ModalAnularDte;
