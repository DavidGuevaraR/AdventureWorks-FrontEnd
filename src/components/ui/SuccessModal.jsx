// src/components/ui/SuccessModal.jsx
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { log } from "../../lib/logger";

export default function SuccessModal({
  open,
  onClose,
  title = "Operación exitosa",
  message = "La acción se completó correctamente.",
  autoCloseMs, // opcional: cierra solo después de X ms
}) {
  useEffect(() => {
    if (!open || !autoCloseMs) return;
    log.debug("SuccessModal autoclose en", autoCloseMs, "ms");
    const t = setTimeout(() => onClose?.(), autoCloseMs);
    return () => clearTimeout(t);
  }, [open, autoCloseMs, onClose]);

  if (open) log.debug("SuccessModal abierto:", { title, message });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
          >
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 whitespace-pre-line">{message}</p>
            </div>
            {!autoCloseMs && (
              <div className="px-6 py-4 bg-gray-50 flex justify-end">
                <button
                  onClick={() => { log.debug("SuccessModal cerrado"); onClose?.(); }}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition"
                >
                  Cerrar
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
