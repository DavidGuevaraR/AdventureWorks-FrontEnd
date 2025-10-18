// src/components/_core/ErrorBoundary.jsx
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, err: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, err: error };
  }

  componentDidCatch(error, info) {
    // Log útil en dev / monitoring en prod
    console.error("[AW] ErrorBoundary atrapó un error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Algo salió mal</h2>
            <p className="text-sm text-gray-700">
              Se produjo un error al renderizar la interfaz. Revisa la consola para más detalles.
            </p>
            {process.env.NODE_ENV !== "production" && (
              <pre className="mt-4 text-xs bg-gray-100 p-3 rounded overflow-auto">
                {String(this.state.err)}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
