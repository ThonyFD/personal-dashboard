# 🚀 Dashboard Setup Guide

Esta guía te ayudará a configurar y ejecutar el dashboard React localmente.

---

## 📋 Prerrequisitos

- Node.js 20+ instalado
- Tu proyecto Firebase configurado (`mail-reader-433802`)
- Firebase Data Connect desplegado y funcionando

---

## 🔧 Paso 1: Obtener Credenciales de Firebase

Necesitas las credenciales de tu aplicación web Firebase. Sigue estos pasos:

### Opción A: Crear una Web App en Firebase (Si no existe)

1. Ve a [Firebase Console](https://console.firebase.google.com/project/mail-reader-433802/settings/general)
2. Scroll hasta "Your apps"
3. Click en el ícono `</>` (Web) para agregar una app web
4. Dale un nombre (ej: "Finance Dashboard")
5. **NO marques** "Also set up Firebase Hosting"
6. Click "Register app"
7. Copia las credenciales que aparecen

### Opción B: Usar una Web App Existente

1. Ve a [Firebase Console - Settings](https://console.firebase.google.com/project/mail-reader-433802/settings/general)
2. Scroll hasta "Your apps"
3. Si ya hay una web app, click en el ícono de configuración (engranaje)
4. Click "Config" para ver las credenciales

---

## 🔑 Paso 2: Configurar Variables de Entorno

Edita el archivo `.env.local` con tus credenciales:

```bash
cd /Users/thonyfd/projects/personal-dashboard/web/dashboard
nano .env.local
```

Reemplaza con tus valores reales:

```env
VITE_FIREBASE_PROJECT_ID=mail-reader-433802
VITE_FIREBASE_API_KEY=AIza...  # Tu API Key
VITE_FIREBASE_AUTH_DOMAIN=mail-reader-433802.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=mail-reader-433802.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789...  # Tu Sender ID
VITE_FIREBASE_APP_ID=1:123456789:web:abc123...  # Tu App ID
```

**Ejemplo completo de firebaseConfig:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB1234567890abcdefghijklmnop",
  authDomain: "mail-reader-433802.firebaseapp.com",
  projectId: "mail-reader-433802",
  storageBucket: "mail-reader-433802.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

Guarda y cierra (`Ctrl+X`, luego `Y`, luego `Enter`).

---

## 📦 Paso 3: Instalar Dependencias

```bash
cd /Users/thonyfd/projects/personal-dashboard/web/dashboard
npm install
```

Esto instalará:
- React 18
- React Router
- TanStack Query (React Query)
- Firebase SDK 12.4.0
- Date-fns para formateo de fechas
- Recharts para gráficos
- Vite como bundler

---

## 🚀 Paso 4: Ejecutar en Modo Desarrollo

```bash
npm run dev
```

Deberías ver algo como:

```
  VITE v5.0.8  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Abre tu navegador en **http://localhost:5173/**

---

## 🎨 Paso 5: Navegar por el Dashboard

El dashboard tiene 3 páginas:

### 1. **Overview** (`/`)
- Total de transacciones
- Monto total gastado
- Gasto del mes actual
- Top merchant
- Últimas 10 transacciones

### 2. **Transactions** (`/transactions`)
- Lista completa de transacciones
- Tabla con fecha, comercio, tipo, canal, monto, proveedor, tarjeta
- Botón "Export CSV" para descargar

### 3. **Merchants** (`/merchants`)
- Lista de comercios
- Total gastado por comercio
- Número de transacciones
- Promedio por transacción

---

## 🐛 Troubleshooting

### Problema 1: "Error loading transactions"

**Causa:** No hay datos en la base de datos o Firebase Data Connect no está configurado.

**Solución:**

1. Verifica que haya transacciones en la base de datos:
```bash
~/google-cloud-sdk/bin/gcloud logging read \
  "jsonPayload.event=transaction_stored" \
  --limit=5 \
  --project=mail-reader-433802 \
  --format="table(timestamp.date('%Y-%m-%d %H:%M:%S %Z', tz='America/Panama'),jsonPayload.amount,jsonPayload.merchant)"
```

2. Si no hay transacciones, envía un email de prueba al formato de banco

3. Verifica la configuración de Firebase:
```bash
/usr/local/bin/firebase dataconnect:services:list
```

### Problema 2: "Firebase: No Firebase App '[DEFAULT]' has been created"

**Causa:** Las credenciales en `.env.local` están incorrectas o faltantes.

**Solución:**

1. Verifica que `.env.local` existe y tiene todas las variables
2. Verifica que las variables empiezan con `VITE_`
3. Reinicia el servidor de desarrollo (`Ctrl+C` y `npm run dev`)

### Problema 3: "Module not found: Can't resolve '../generated'"

**Causa:** El SDK de Firebase Data Connect no está generado.

**Solución:**

```bash
# Desde la raíz del proyecto
/usr/local/bin/firebase dataconnect:sdk:generate

# Copia el SDK al dashboard
cp -r services/ingestor/src/generated web/dashboard/src/
```

### Problema 4: Pantalla en blanco o errores de consola

**Solución:**

1. Abre la consola del navegador (`F12` o `Cmd+Option+I`)
2. Mira la pestaña "Console" para ver errores
3. Los errores más comunes:
   - **CORS errors**: Normal en desarrollo, ignora
   - **401 Unauthorized**: Credenciales incorrectas
   - **Network errors**: Firebase Data Connect no alcanzable

---

## 🔍 Verificar que Todo Funciona

### Test 1: Ver el Dashboard
```bash
# Abre en el navegador
open http://localhost:5173/
```

Deberías ver la página de Overview con estadísticas.

### Test 2: Verificar en la Consola del Navegador

Abre las Dev Tools (`F12`) y ejecuta:

```javascript
// Verificar que Firebase está inicializado
firebase.apps.length
// Debe ser > 0

// Verificar el projectId
firebase.apps[0].options.projectId
// Debe ser "mail-reader-433802"
```

### Test 3: Probar una Query Manualmente

En la consola del navegador:

```javascript
// Importa el cliente (si está disponible globalmente)
// O simplemente navega a /transactions y verifica que carguen datos
```

---

## 📊 Si No Hay Datos (Base de Datos Vacía)

Si tu base de datos está vacía, puedes:

### Opción 1: Enviar Emails de Prueba

Envíate emails con formato de banco simulado:

```
Para: tu-email@gmail.com
Asunto: Compra autorizada - BAC

Monto: $45.99
Comercio: Super 99
Tarjeta: **** 1234
Fecha: 01/11/2025
```

### Opción 2: Insertar Datos de Prueba Directamente

Puedes insertar datos de prueba usando la consola de Firebase Data Connect o creando un script.

---

## 🎨 Personalización

### Cambiar Estilos

Los estilos están en:
- `src/App.css` - Estilos globales del dashboard
- `src/index.css` - Estilos base

### Agregar Más Páginas

1. Crea un archivo en `src/pages/TuPagina.tsx`
2. Agrega la ruta en `src/App.tsx`

### Modificar Queries

Edita `src/api/dataconnect-client.ts` para:
- Cambiar límites de resultados
- Agregar filtros
- Modificar transformaciones de datos

---

## 🚢 Deploy a Producción

Cuando estés listo para desplegar:

```bash
# Build para producción
npm run build

# Deploy a Firebase Hosting
/usr/local/bin/firebase deploy --only hosting
```

---

## 📝 Comandos Útiles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo

# Build
npm run build            # Compila para producción
npm run preview          # Preview del build de producción

# Linting
npm run lint             # Verifica código con ESLint

# Actualizar dependencias
npm update               # Actualiza paquetes

# Limpiar y reinstalar
rm -rf node_modules package-lock.json
npm install
```

---

## 🎯 Siguiente Paso

Una vez que el dashboard esté funcionando localmente:

1. **Verifica que muestre tus transacciones reales**
2. **Prueba la exportación a CSV**
3. **Personaliza los estilos a tu gusto**
4. **Despliega a Firebase Hosting**

---

## 💡 Tips

1. **Usa React Dev Tools** - Instala la extensión de Chrome/Firefox para debuggear
2. **Mantén la consola abierta** - Ver errores en tiempo real
3. **Hot Module Replacement** - Vite recarga automáticamente cuando guardas cambios
4. **TanStack Query Dev Tools** - Disponible en el dashboard para ver queries

---

**¿Problemas?** Revisa los logs del navegador y asegúrate de que:
- Firebase Data Connect está funcionando
- Las credenciales son correctas
- Hay datos en la base de datos
