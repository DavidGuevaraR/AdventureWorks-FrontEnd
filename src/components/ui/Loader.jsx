// src/components/ui/Loader.jsx
import { motion } from "framer-motion";
import { log } from "../../lib/logger";

const dotVariants = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" },
  },
};

export default function Loader({ show = false }) {
  if (show) log.debug("Loader abierto");
  return !show ? null : (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl px-8 py-6 shadow-2xl">
        <div className="flex items-end gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-3 h-3 rounded-full bg-gray-800"
              variants={dotVariants}
              animate="animate"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
        <p className="mt-3 text-sm text-gray-700 text-center">Autenticando…</p>
      </div>
    </div>
  );
}
