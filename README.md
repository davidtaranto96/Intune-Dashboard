# Intune Compliance Dashboard

Dashboard web para monitorear el compliance de dispositivos en Microsoft Intune + Entra ID para JBKnowledge.

## Funcionalidades

- **Devices**: Vista de todos los dispositivos (Intune managed + Entra only) con estado de compliance, grace periods, y opcion de sync remoto
- **Policies**: Compliance policies, Conditional Access, y App Protection policies con status por dispositivo
- **Alerts**: Alertas automaticas para dispositivos non-compliant, stale (7+ dias sin sync), y en grace period
- **Reports**: Exportar reportes CSV (all, noncompliant, grace period, nuevos 30 dias)

## Stack

| Componente | Tecnologia |
|---|---|
| Frontend | HTML/CSS/JS vanilla |
| Backend | Azure Functions (Node.js) |
| Deploy | Azure Static Web App + GitHub Actions |
| Auth | Client Credentials (app-only) via Microsoft Graph API |

## API Endpoints

| Endpoint | Metodo | Descripcion |
|---|---|---|
| `/api/devices` | GET | Lista todos los dispositivos con compliance state |
| `/api/policies` | GET | Compliance, Conditional Access, App Protection policies |
| `/api/reports?type=all&format=csv` | GET | Exporta CSV (tipos: all, noncompliant, grace, new) |
| `/api/sync?deviceId=xxx` | POST | Fuerza sync remoto en un dispositivo |

## Estructura del proyecto

```
intune-dashboard/
├── frontend/
│   └── index.html              <- Dashboard completo (4 tabs)
├── api/
│   ├── graphClient.js          <- Helper: token + paginacion Graph API
│   ├── package.json
│   ├── devices/                <- GET /api/devices
│   ├── policies/               <- GET /api/policies
│   ├── reports/                <- GET /api/reports
│   └── sync/                   <- POST /api/sync
├── staticwebapp.config.json
├── .github/workflows/
│   └── deploy.yml              <- CI/CD automatico
└── README.md
```

## Setup

### 1. App Registration en Azure

La app registration ya esta creada con estos permisos (Application permissions):

- `Device.Read.All`
- `DeviceManagementManagedDevices.Read.All`
- `Policy.Read.All`
- `User.Read.All`

Permisos adicionales para escritura (agregar si se necesitan):
- `DeviceManagementManagedDevices.ReadWrite.All`
- `DeviceManagementConfiguration.ReadWrite.All`
- `Policy.ReadWrite.ConditionalAccess`

### 2. Crear Static Web App en Azure

1. Azure Portal > Create resource > Static Web App
2. Conectar a GitHub > repo `Intune-Dashboard` > branch `main`
3. App location: `frontend` | API location: `api` | Output: (vacio)

### 3. Application Settings

Agregar en la Static Web App (Configuration > Application Settings):

| Setting | Valor |
|---|---|
| `TENANT_ID` | Tu Tenant ID |
| `CLIENT_ID` | Tu Client ID |
| `CLIENT_SECRET` | Tu Client Secret |

### 4. GitHub Secret

1. Azure > Static Web App > Manage deployment token > copiar
2. GitHub > repo Settings > Secrets > Actions > crear `AZURE_STATIC_WEB_APPS_API_TOKEN`

### 5. Deploy

El deploy es automatico con cada push a `main` via GitHub Actions.

## Roadmap (v2)

- Notificaciones por Teams cuando un dispositivo cae en non-compliant
- Historial de compliance (snapshots en Azure Table Storage)
- Configurar compliance policies desde el dashboard
- Enrollment automatico via Autopilot para dispositivos Windows nuevos
