#!/bin/bash

# Dashboard Setup Script
# Este script te ayuda a configurar el dashboard React paso a paso

set -e

echo "======================================"
echo "🚀 Finance Dashboard Setup"
echo "======================================"
echo ""

# Step 1: Check Node.js
echo "[1/5] Verificando Node.js..."
if ! command -v node &> /dev/null; then
  echo "❌ Node.js no está instalado. Por favor instala Node.js 20+"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "⚠️  Node.js version $NODE_VERSION es muy antigua. Se recomienda 20+"
fi

echo "✓ Node.js $(node -v) instalado"
echo ""

# Step 2: Check if .env.local exists
echo "[2/5] Verificando configuración..."
if [ ! -f ".env.local" ]; then
  echo "⚠️  .env.local no existe. Creando archivo de ejemplo..."
  cat > .env.local << EOF
# Firebase Configuration
VITE_FIREBASE_PROJECT_ID=mail-reader-433802
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=mail-reader-433802.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=mail-reader-433802.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
EOF

  echo ""
  echo "📝 IMPORTANTE: Debes configurar .env.local con tus credenciales reales"
  echo ""
  echo "Para obtener las credenciales:"
  echo "1. Ve a https://console.firebase.google.com/project/mail-reader-433802/settings/general"
  echo "2. En 'Your apps', crea una Web App si no existe"
  echo "3. Copia las credenciales a .env.local"
  echo ""
  read -p "Presiona Enter cuando hayas configurado .env.local..."
fi

# Verify required variables
if grep -q "your-api-key-here" .env.local; then
  echo "⚠️  ADVERTENCIA: .env.local tiene valores por defecto"
  echo "El dashboard podría no funcionar correctamente"
  echo ""
fi

echo "✓ Archivo .env.local existe"
echo ""

# Step 3: Check if generated SDK exists
echo "[3/5] Verificando SDK generado..."
if [ ! -d "src/generated" ]; then
  echo "⚠️  SDK no encontrado. Generando..."

  # Check if we're in the right directory
  if [ -f "../../services/ingestor/src/generated/index.d.ts" ]; then
    cp -r ../../services/ingestor/src/generated src/
    echo "✓ SDK copiado desde services/ingestor"
  else
    echo "❌ No se pudo encontrar el SDK generado"
    echo "Ejecuta desde la raíz del proyecto:"
    echo "  /usr/local/bin/firebase dataconnect:sdk:generate"
    exit 1
  fi
else
  echo "✓ SDK generado encontrado"
fi
echo ""

# Step 4: Install dependencies
echo "[4/5] Instalando dependencias..."
if [ ! -d "node_modules" ]; then
  npm install
else
  echo "✓ Dependencias ya instaladas"
  echo "  (ejecuta 'npm install' si quieres reinstalar)"
fi
echo ""

# Step 5: Ready to run
echo "[5/5] ¡Listo para ejecutar!"
echo ""
echo "======================================"
echo "✅ Setup Completo"
echo "======================================"
echo ""
echo "Para iniciar el dashboard en desarrollo:"
echo "  npm run dev"
echo ""
echo "Luego abre en tu navegador:"
echo "  http://localhost:5173/"
echo ""
echo "Comandos útiles:"
echo "  npm run build    - Compilar para producción"
echo "  npm run preview  - Preview del build"
echo "  npm run lint     - Verificar código"
echo ""
echo "📚 Para más información, lee: SETUP.md"
echo ""
