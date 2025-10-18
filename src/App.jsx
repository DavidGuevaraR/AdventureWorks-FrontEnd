// src/App.jsx
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./AppRouter";
import ErrorBoundary from "./components/_core/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
