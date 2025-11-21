# Firebase Data Connect Setup

Este directorio contiene la configuración de Firebase Data Connect para el AI Finance Agent.

## Estructura

```
dataconnect/
├── dataconnect.yaml          # Configuración principal de Data Connect
├── schema/
│   └── schema.gql           # Schema GraphQL (tipos, enums)
└── connector/
    ├── connector.yaml       # Configuración SDK para backend
    ├── connector-web.yaml   # Configuración SDK para frontend
    ├── queries.gql          # Queries GraphQL
    └── mutations.gql        # Mutations GraphQL
```

## Diferencias con PostgreSQL tradicional

Firebase Data Connect **NO usa connection strings** como:
```
❌ postgresql://user:pass@host:5432/db
```

En su lugar:
- **Backend (Cloud Run)**: Usa el SDK generado + Firebase Admin SDK
- **Frontend (React)**: Usa el SDK generado + Firebase Web SDK
- **Autenticación**: Automática via Workload Identity (backend) o Firebase Auth (frontend)

## Setup Local

### 1. Instalar Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 2. Inicializar el proyecto

```bash
firebase use mail-reader-433802
```

### 3. Generar SDKs

```bash
# Genera SDK para backend y frontend
firebase dataconnect:sdk:generate
```

Esto creará:
- `services/ingestor/src/generated/` - SDK para el servicio ingestor
- `web/dashboard/src/generated/` - SDK para el dashboard React

### 4. Ejecutar emulador local

```bash
firebase emulators:start --only dataconnect
```

El emulador estará disponible en:
- Data Connect: `http://localhost:9399`
- UI del emulador: `http://localhost:4000`

## Deployment

### 1. Deploy del schema y connectors

```bash
firebase deploy --only dataconnect
```

### 2. Verificar el deployment

```bash
firebase dataconnect:services:list
```

## Usar en el código

### Backend (services/ingestor)

```typescript
import { getDataConnect } from 'firebase-admin/data-connect';
import {
  upsertEmail,
  createTransaction
} from './generated';

// Usar las funciones generadas
const result = await upsertEmail({
  gmailMessageId: 'msg-123',
  senderEmail: 'bank@example.com',
  // ...
});
```

### Frontend (web/dashboard)

```typescript
import { getDataConnect } from 'firebase/data-connect';
import {
  listTransactions,
  getSpendingSummary
} from './generated';

// Usar las queries generadas
const { data } = await listTransactions({
  limit: 50,
  startDate: '2025-01-01'
});
```

## Migraciones

Firebase Data Connect sincroniza automáticamente el schema desde `schema.gql` a PostgreSQL.

Si necesitas ejecutar SQL manualmente (triggers, functions):
1. Conecta via Cloud SQL Proxy
2. Ejecuta los scripts desde `packages/sql/schema.sql`

```bash
gcloud sql connect personal-dashboard-fdc --user=postgres --database=fdcdb
```

## Troubleshooting

### Error: "Secret not found"
Crea los secretos primero:
```bash
gcloud secrets create gmail-oauth-client-id --replication-policy="automatic"
```

### Error: "Schema validation failed"
Verifica que `schema.gql` esté correctamente formateado:
```bash
firebase dataconnect:schema:validate
```

### Error: "SDK not generated"
Regenera los SDKs:
```bash
rm -rf services/ingestor/src/generated
rm -rf web/dashboard/src/generated
firebase dataconnect:sdk:generate
```

## Recursos

- [Firebase Data Connect Docs](https://firebase.google.com/docs/data-connect)
- [GraphQL Schema Reference](https://firebase.google.com/docs/data-connect/gql-reference)
- [SDK Generation Guide](https://firebase.google.com/docs/data-connect/sdk-generation)
