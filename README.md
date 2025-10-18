# AdventureWorks FrontEnd

Aplicación **FrontEnd** del proyecto AdventureWorks.

## 🚀 ¿Cómo verlo en local?

### Requisitos
- **Node.js** 18+ (recomendado LTS)
- **Yarn** (o `corepack` en Windows)
- (Opcional) Archivo `.env` con tus variables (por ej. `VITE_API_URL`)

### 1) Clonar el repo
```bash
git clone <URL-DEL-REPO>
cd AdventureWorks-FrontEnd
```

### 2) Instalar dependencias  
**Opción estándar (macOS/Linux/Windows):**
```bash
yarn install
```

**Si estás en Windows y usas Corepack:**
```bash
corepack yarn install
```

### 3) Levantar el servidor de desarrollo  
**Opción estándar:**
```bash
yarn dev
```

**Con Corepack en Windows:**
```bash
corepack yarn dev
```

> El proyecto quedará disponible en la URL que imprima la consola (por defecto suele ser `http://localhost:5173` o similar).

---

## 📜 Scripts útiles

```bash
yarn dev        # Inicia entorno de desarrollo
yarn build      # Genera build de producción
yarn preview    # Sirve la build localmente para probar
```

> Con Corepack en Windows antepone `corepack`:
```bash
corepack yarn build
corepack yarn preview
```

---

## 🧩 Variables de entorno (ejemplo)

Crea un archivo `.env` en la raíz:

```
# URL base de tu API (sin slash final o con, el cliente lo normaliza)
VITE_API_BASE_URL=http://localhost:8080

# Frase secreta para derivar la clave de cifrado del storage
VITE_STORAGE_SECRET=adasdasdasdasdasdasdasd

```

---

## 🛠️ Problemas comunes

- **“Command ‘yarn’ not found”**  
  Activa Corepack:
  ```bash
  corepack enable
  ```
- **Versión de Node incompatible**  
  Usa Node 18+ (LTS). Si usas `nvm`:
  ```bash
  nvm use 18
  ```

---
