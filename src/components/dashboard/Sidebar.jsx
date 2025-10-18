"use client"

import { motion } from "framer-motion"
import { ShoppingCart, Package, Users, FileText } from "lucide-react"

const Sidebar = ({ currentPage, setCurrentPage }) => {
  const menuItems = [
    { id: "hacer-venta", label: "Hacer una Venta", icon: ShoppingCart },
    { id: "productos", label: "Productos", icon: Package },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "ventas-generadas", label: "Ventas Generadas", icon: FileText },
  ]

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="w-[200px] bg-[#4a4a4a] text-white flex flex-col rounded-tr-3xl rounded-br-3xl shadow-2xl"
    >
      {/* User Profile */}
      <div className="p-6 border-b border-gray-600">
        <div className="flex items-center gap-3">
          <img src="https://i.pravatar.cc/150?img=12" alt="Jose Lora" className="w-12 h-12 rounded-full" />
          <div>
            <p className="text-xs text-gray-400">CAJA 01</p>
            <p className="text-sm font-semibold">Jose Lora</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-6">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id

          return (
            <motion.button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full px-6 py-3 flex items-center gap-3 text-left transition-colors relative ${
                isActive ? "bg-[#5a5a5a]" : "hover:bg-[#5a5a5a]"
              }`}
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={18} />
              <span className="text-sm">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute right-0 top-0 bottom-0 w-1 bg-cyan-400"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          )
        })}
      </nav>
    </motion.aside>
  )
}

export default Sidebar
