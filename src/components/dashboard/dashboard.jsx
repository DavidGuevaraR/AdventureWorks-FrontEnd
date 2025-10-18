"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Sidebar from "./Sidebar"
import GenerarVenta from "./pages/GenerarVenta"
import Productos from "./pages/Productos"
import Clientes from "./pages/Clientes"
import VentasGeneradas from "./pages/VentasGeneradas"

function App() {
  const [currentPage, setCurrentPage] = useState("hacer-venta")

  const renderPage = () => {
    switch (currentPage) {
      case "hacer-venta":
        return <GenerarVenta />
      case "productos":
        return <Productos />
      case "clientes":
        return <Clientes />
      case "ventas-generadas":
        return <VentasGeneradas />
      default:
        return <GenerarVenta />
    }
  }

  return (
    <div className="flex h-screen bg-[#e8dcc8] overflow-hidden">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
