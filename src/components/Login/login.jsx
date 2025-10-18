// src/components/Login/login.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { http } from "../../lib/httpClient";
import { secureSet } from "../../lib/secureStorage";
import Loader from "../ui/Loader";
import ErrorModal from "../ui/ErrorModal";
import { log } from "../../lib/logger";

const Login = () => {
  log.debug("Login component render");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const showError = (status, payload) => {
    let msg = "Ha ocurrido un error. Inténtalo de nuevo.";
    if (status >= 400 && status < 500) {
      msg = "Error: revisa las credenciales e inténtalo nuevamente.";
      if (payload?.message) msg += `\n(${payload.message})`;
    } else if (payload?.message) {
      msg = payload.message;
    }
    setErrorMsg(msg);
    setErrorOpen(true);
    log.error("Login error:", { status, payload, msg });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    log.debug("handleSubmit → start", { email });
    setLoading(true);

    try {
      const body = { email, password };
      const res = await http.post("/api/auth/login", body); // usa base de .env

      log.debug("Auth response:", res);

      if (!res?.access_token || !res?.user) {
        const err = new Error("Respuesta de autenticación inválida");
        err.status = 500;
        err.payload = res;
        throw err;
      }

      await secureSet("aw:token", res.access_token);
      await secureSet("aw:user", res.user);

      log.info("Login OK → redirigiendo a /dashboard");
      navigate("/dashboard");
    } catch (err) {
      const status = err?.status || 0;
      const payload = err?.payload || null;
      showError(status, payload);
    } finally {
      setLoading(false);
      log.debug("handleSubmit → end");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Óvalos decorativos superiores */}
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-[260px] z-0">
        <div className="absolute -top-10 -left-32 w-[820px] h-[220px] rounded-[999px] bg-[#f4d9c4] blur-3xl opacity-70 -rotate-6 mix-blend-multiply" />
        <div className="absolute -top-14 -right-32 w-[820px] h-[220px] rounded-[999px] bg-[#f4b942] blur-3xl opacity-60 rotate-6 mix-blend-multiply" />
      </div>

      {/* Contenedor maestro centrado */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 flex items-center justify-center">
        {/* Formulario centrado */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5 }}
          className="w-full max-w-75"
        >
          <div className="mb-8 text-center ">
            <h1 className="text-5xl font-bold mb-2 transition-all duration-500">
              Adventure <span className="text-[#f4b942]">Works</span>
            </h1>
          </div>

          <div className="bg-[#4a4a4a] rounded-3xl p-6 shadow-2xl w-full">
            <h2 className="text-white text-2xl font-semibold mb-8 text-center">Iniciar Sesión</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#f4b942]"
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#f4b942]"
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="text-right">
                <a href="#" className="text-white text-sm hover:underline">
                  Forgot Password ?
                </a>
              </div>

              <button
                type="submit"
                className="w-full bg-[#f4b942] text-gray-800 font-semibold py-2 rounded-lg hover:bg-[#e5a832] transition-colors"
                disabled={loading}
              >
                {loading ? "Verificando…" : "Login"}
              </button>
            </form>
          </div>
        </motion.div>

         {/* Ilustración / mockup desplazada a la derecha sin afectar el centrado del formulario */ }
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hidden sm:block absolute top-1/2 -translate-y-1/2 sm:scale-90"
          style={{ right: '70px' }}
        >
          <div className="relative scale-80 pt-110">
            {/* Phone mockup */}
            <div className="w-[200px] h-[400px] bg-white rounded-[30px] shadow-2xl border-6 border-gray-800 relative overflow-hidden">
              {/* Phone notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-4 bg-gray-800 rounded-b-xl"></div>

              {/* Phone content */}
              <div className="p-6 pt-10">
                <div className="space-y-4">
                  {/* Clothing items */}
                  <div className="flex items-center justify-between">
                    <div className="text-3xl">👕</div>
                    <div className="w-12 h-1 bg-[#4dd4ac] rounded"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl">👕</div>
                    <div className="w-12 h-1 bg-[#4dd4ac] rounded"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl">👕</div>
                    <div className="w-12 h-1 bg-[#4dd4ac] rounded"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Woman illustration */}
            <div className="absolute -right-16 bottom-0 w-[150px] h-[300px]">
              <div className="relative">
                {/* Head */}
                <div className="absolute top-0 right-6 w-12 h-16 bg-[#f4d9c4] rounded-full"></div>
                {/* Hair */}
                <div className="absolute top-0 right-3 w-16 h-20 bg-gray-900 rounded-b-full"></div>
                {/* Body - yellow shirt */}
                <div className="absolute top-16 right-0 w-24 h-32 bg-[#f4b942] rounded-t-2xl"></div>
                {/* Arm */}
                <div className="absolute top-20 -right-6 w-20 h-6 bg-[#f4b942] rounded-full transform rotate-45"></div>
                {/* Hand */}
                <div className="absolute top-16 right-3 w-6 h-6 bg-[#f4d9c4] rounded-full"></div>
                {/* Pants */}
                <div className="absolute top-48 right-3 w-20 h-24 bg-gray-900 rounded-b-2xl"></div>
                {/* Shoes */}
                <div className="absolute bottom-0 right-3 w-10 h-5 bg-[#f4b942] rounded-full"></div>
                <div className="absolute bottom-0 right-12 w-10 h-5 bg-[#f4b942] rounded-full"></div>
              </div>
            </div>

            {/* Shopping bags */}
            <div className="absolute -bottom-6 -right-24 flex gap-3">
              <div className="w-16 h-20 bg-[#4dd4ac] rounded-t-xl relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-3 border-3 border-[#4dd4ac] rounded-t-full"></div>
              </div>
              <div className="w-16 h-20 bg-[#f4b942] rounded-t-xl relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-3 border-3 border-[#f4b942] rounded-t-full"></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Overlay: Loader y Modal de error reutilizable */}
      <Loader show={loading} />
      <ErrorModal
        open={errorOpen}
        onClose={() => setErrorOpen(false)}
        title="No se pudo iniciar sesión"
        message={errorMsg}
      />
    </div>
  );
};

export default Login;
