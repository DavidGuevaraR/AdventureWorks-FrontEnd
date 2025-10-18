// src/router/PrivateRoute.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { secureGet } from "../lib/secureStorage";

export default function PrivateRoute({ children }) {
  const [ok, setOk] = useState(null);

  useEffect(() => {
    (async () => {
      const token = await secureGet("aw:token");
      setOk(!!token);
    })();
  }, []);

  if (ok === null) return null; // o un loader mínimo
  return ok ? children : <Navigate to="/login" replace />;
}
