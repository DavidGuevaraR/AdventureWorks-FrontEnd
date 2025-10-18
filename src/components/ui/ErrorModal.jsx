// src/components/ui/ErrorModal.jsx
import { motion, AnimatePresence } from "framer-motion";
import { log } from "../../lib/logger";

export default function ErrorModal({ open, onClose, title = "Error", message = "Ha ocurrido un error." }) {
  if (open) log.debug("ErrorModal abierto:", { title, message });
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
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
            <div className="px-6 py-4 bg-gray-50 flex justify-end">
              <button
                onClick={() => { log.debug("ErrorModal cerrado"); onClose?.(); }}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
