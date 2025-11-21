#!/bin/bash

# Script para ayudarte a obtener las credenciales de Firebase

echo "======================================"
echo "🔑 Firebase Web App Configuration"
echo "======================================"
echo ""

PROJECT_ID="mail-reader-433802"

echo "Para configurar el dashboard, necesitas crear una Web App en Firebase."
echo ""
echo "Sigue estos pasos:"
echo ""
echo "1. Abre este enlace en tu navegador:"
echo "   https://console.firebase.google.com/project/${PROJECT_ID}/settings/general"
echo ""
echo "2. Scroll hacia abajo hasta 'Your apps'"
echo ""
echo "3. Si NO hay una Web App:"
echo "   a. Click en el ícono '</>' (Web)"
echo "   b. Dale un nombre: 'Finance Dashboard'"
echo "   c. NO marques 'Also set up Firebase Hosting'"
echo "   d. Click 'Register app'"
echo "   e. Verás un código como:"
echo ""
echo "   const firebaseConfig = {"
echo "     apiKey: 'AIzaSy...',"
echo "     authDomain: 'mail-reader-433802.firebaseapp.com',"
echo "     projectId: 'mail-reader-433802',"
echo "     storageBucket: 'mail-reader-433802.appspot.com',"
echo "     messagingSenderId: '123456...',"
echo "     appId: '1:123456:web:abc...'"
echo "   };"
echo ""
echo "4. Si YA hay una Web App:"
echo "   a. Click en el ícono de engranaje al lado de tu app"
echo "   b. Verás las mismas credenciales"
echo ""
echo "5. COPIA los valores y pégalos cuando se te solicite"
echo ""
echo "======================================"
echo ""

# Prompt for credentials
read -p "¿Ya tienes las credenciales? (s/n): " ready

if [ "$ready" != "s" ] && [ "$ready" != "S" ]; then
  echo ""
  echo "Por favor obtén las credenciales primero y luego ejecuta este script de nuevo."
  exit 0
fi

echo ""
echo "Vamos a configurar .env.local paso a paso:"
echo ""

# Get API Key
read -p "API Key (empieza con 'AIza'): " api_key

# Get App ID
read -p "App ID (formato '1:123...:web:abc...'): " app_id

# Get Messaging Sender ID
read -p "Messaging Sender ID (número largo): " sender_id

# Create .env.local
cat > .env.local << EOF
# Firebase Configuration
# Generado automáticamente - $(date)

VITE_FIREBASE_PROJECT_ID=mail-reader-433802
VITE_FIREBASE_API_KEY=${api_key}
VITE_FIREBASE_AUTH_DOMAIN=mail-reader-433802.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=mail-reader-433802.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=${sender_id}
VITE_FIREBASE_APP_ID=${app_id}
EOF

echo ""
echo "✅ .env.local configurado correctamente!"
echo ""
echo "Contenido:"
cat .env.local
echo ""
echo "======================================"
echo "Ahora puedes ejecutar:"
echo "  npm run dev"
echo "======================================"
echo ""
