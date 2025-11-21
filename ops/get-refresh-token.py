#!/usr/bin/env python3
"""
Script para obtener un nuevo refresh token de Gmail OAuth
Requiere: pip install google-auth-oauthlib
"""

import subprocess
import json

# Obtener credenciales actuales de Secret Manager
print("🔍 Obteniendo credenciales actuales de Secret Manager...\n")

client_id_cmd = [
    "~/google-cloud-sdk/bin/gcloud", "secrets", "versions", "access", "latest",
    "--secret=gmail-oauth-client-id", "--project=mail-reader-433802"
]
client_secret_cmd = [
    "~/google-cloud-sdk/bin/gcloud", "secrets", "versions", "access", "latest",
    "--secret=gmail-oauth-client-secret", "--project=mail-reader-433802"
]

try:
    client_id = subprocess.check_output(" ".join(client_id_cmd), shell=True, text=True).strip()
    client_secret = subprocess.check_output(" ".join(client_secret_cmd), shell=True, text=True).strip()
except Exception as e:
    print(f"❌ Error obteniendo credenciales: {e}")
    print("\nPor favor, asegúrate de tener acceso a Secret Manager.")
    exit(1)

print(f"✓ Client ID: {client_id[:20]}...")
print(f"✓ Client Secret: {client_secret[:10]}...")
print()

# Generar nuevo refresh token
print("📝 Generando nuevo refresh token...")
print("Se abrirá una ventana del navegador para autorizar la aplicación.")
print()

try:
    from google_auth_oauthlib.flow import InstalledAppFlow

    SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

    client_config = {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uris": ["http://localhost"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }
    }

    flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
    creds = flow.run_local_server(port=8080)

    print("\n✅ ¡Autenticación exitosa!\n")
    print("=" * 70)
    print("NUEVO REFRESH TOKEN:")
    print("=" * 70)
    print(creds.refresh_token)
    print("=" * 70)
    print()

    # Guardar automáticamente en Secret Manager
    print("💾 ¿Deseas guardar este token automáticamente en Secret Manager? (s/n): ", end="")
    response = input().strip().lower()

    if response == 's' or response == 'y':
        save_cmd = f'echo -n "{creds.refresh_token}" | ~/google-cloud-sdk/bin/gcloud secrets versions add gmail-oauth-refresh-token --data-file=- --project=mail-reader-433802'
        subprocess.run(save_cmd, shell=True, check=True)
        print("✓ Token guardado en Secret Manager")
        print("\n✅ ¡Todo listo! El servicio debería funcionar ahora.")
        print("\nPróximos pasos:")
        print("1. Espera ~30 segundos para que Cloud Run recargue")
        print("2. Verifica: curl https://ingestor-iswgxwwvra-uc.a.run.app/health/oauth")
    else:
        print("\nPara guardar manualmente el token, ejecuta:")
        print(f'echo -n "TU_TOKEN" | ~/google-cloud-sdk/bin/gcloud secrets versions add gmail-oauth-refresh-token --data-file=- --project=mail-reader-433802')

except ImportError:
    print("❌ Error: Falta el paquete google-auth-oauthlib")
    print("\nInstala con: pip install google-auth-oauthlib")
    print("\nLuego ejecuta este script nuevamente.")
    exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
