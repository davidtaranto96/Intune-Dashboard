# Informe Tecnico y Guia: Intune Compliance Dashboard
## JBKnowledge - Information Technology Department

**Fecha:** Abril 2026
**Autor:** David Taranto - IT Department
**Proyecto:** Intune Compliance Dashboard
**URL:** https://delightful-water-07041da1e.azurestaticapps.net

---

## Indice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Que es Microsoft Graph API](#2-que-es-microsoft-graph-api)
3. [Que es Azure Static Web Apps](#3-que-es-azure-static-web-apps)
4. [Arquitectura del Proyecto](#4-arquitectura-del-proyecto)
5. [Como se Creo el Dashboard](#5-como-se-creo-el-dashboard)
6. [Funcionalidades Actuales](#6-funcionalidades-actuales)
7. [Permisos y Seguridad - Analisis de Riesgos](#7-permisos-y-seguridad---analisis-de-riesgos)
8. [Analisis de Costos](#8-analisis-de-costos)
9. [Funcionalidades Futuras](#9-funcionalidades-futuras)
10. [Guia de Mantenimiento](#10-guia-de-mantenimiento)

---

## 1. Resumen Ejecutivo

El **Intune Compliance Dashboard** es una aplicacion web interna desarrollada para JBKnowledge que permite monitorear en tiempo real el estado de compliance de todos los dispositivos gestionados por Microsoft Intune y Entra ID (Azure Active Directory).

### Problema que resuelve
Antes de este dashboard, para verificar el estado de compliance de los dispositivos habia que:
- Entrar al portal de Intune (endpoint.microsoft.com) y navegar manualmente
- Revisar dispositivo por dispositivo
- No habia una vista consolidada rapida
- No se podia ver facilmente que politica estaba fallando en cada dispositivo
- Para ver sign-in logs habia que ir a Entra ID > Sign-in logs manualmente

### Solucion
Un dashboard web unico que consolida:
- Estado de todos los dispositivos (compliant, non-compliant, grace period)
- Politicas de compliance y conditional access con detalle
- Graficos de torta y barras para visualizacion rapida
- Sign-in logs para ver bloqueos y enforcement de politicas
- Exportacion de reportes CSV
- Edicion de politicas desde el mismo dashboard
- Sync remoto de dispositivos

---

## 2. Que es Microsoft Graph API

### Definicion
Microsoft Graph API es la **puerta de entrada unificada** a todos los datos y servicios de Microsoft 365. Es una API REST que permite acceder programaticamente a:

- **Azure Active Directory / Entra ID**: Usuarios, grupos, dispositivos, sign-in logs
- **Microsoft Intune**: Dispositivos gestionados, politicas de compliance, configuraciones
- **Office 365**: Correos, calendarios, archivos de OneDrive/SharePoint
- **Microsoft Teams**: Canales, mensajes, reuniones
- **Y mucho mas**: Planner, To Do, Security, etc.

### Como funciona
```
Tu Aplicacion  --->  Microsoft Graph API  --->  Servicios Microsoft
(Dashboard)         (https://graph.microsoft.com)    (Intune, Entra ID, etc.)
```

1. La aplicacion se autentica con credenciales (Client ID + Secret)
2. Obtiene un token de acceso (OAuth 2.0)
3. Usa ese token para hacer llamadas REST a Graph API
4. Graph API devuelve los datos en formato JSON

### Ejemplo real de nuestro dashboard
```
GET https://graph.microsoft.com/v1.0/deviceManagement/managedDevices

Respuesta:
{
  "value": [
    {
      "deviceName": "LAPTOP-DAVID",
      "complianceState": "compliant",
      "operatingSystem": "Windows",
      "lastSyncDateTime": "2026-04-09T10:30:00Z"
      ...
    }
  ]
}
```

### Tipos de autenticacion

| Tipo | Descripcion | Nuestro caso |
|------|------------|--------------|
| **Delegated (usuario)** | Actua en nombre de un usuario logueado | NO usamos este |
| **Application (app-only)** | Actua como la aplicacion misma, sin usuario | **SI, usamos este** |

Nosotros usamos **Client Credentials** (app-only), lo que significa que el dashboard accede a Graph API con su propia identidad, no en nombre de un usuario. Esto es importante para la seccion de seguridad.

### Documentacion oficial
- https://learn.microsoft.com/en-us/graph/overview
- https://developer.microsoft.com/en-us/graph/graph-explorer (herramienta para probar queries)

---

## 3. Que es Azure Static Web Apps

### Definicion
Azure Static Web Apps es un servicio de Azure que **hostea sitios web estaticos** (HTML, CSS, JS) y les agrega una **API serverless** (Azure Functions) automaticamente.

### Por que lo elegimos

| Caracteristica | Beneficio |
|---------------|-----------|
| **Gratis (plan Free)** | $0/mes para nuestro uso |
| **Deploy automatico** | Cada push a GitHub deploya automaticamente |
| **Auth integrada** | Login con Microsoft incluido, sin codigo extra |
| **API serverless** | Azure Functions incluidas, sin servidor que mantener |
| **HTTPS automatico** | Certificado SSL gratis |
| **CDN global** | Carga rapida desde cualquier ubicacion |

### Como funciona el deploy
```
1. Developer hace push a GitHub (branch main)
2. GitHub Actions detecta el push automaticamente
3. GitHub Actions construye el proyecto
4. Lo sube a Azure Static Web Apps
5. El sitio se actualiza en 2-3 minutos
```

### Estructura del servicio
```
Azure Static Web App
├── Frontend (HTML/CSS/JS)     --> Se sirve desde CDN global
├── API (Azure Functions)      --> Se ejecuta serverless
├── Auth (built-in)            --> Microsoft login incluido
└── Configuration              --> Environment variables seguras
```

### Planes y Limites

| Caracteristica | Free | Standard ($9/mes) |
|---------------|------|-------------------|
| Bandwidth | 100 GB/mes | 100 GB/mes |
| Custom domains | 2 | 5 |
| SSL | Incluido | Incluido |
| Auth providers | Todos | Todos |
| API (Functions) | Incluido | Incluido |
| SLA | No | 99.95% |
| Enterprise Edge | No | Si |

**Para nuestro uso, el plan Free es mas que suficiente.**

---

## 4. Arquitectura del Proyecto

### Diagrama de arquitectura
```
┌─────────────────────────────────────────────────────┐
│                    INTERNET                          │
│                                                      │
│  Usuario (browser)                                   │
│       │                                              │
│       ▼                                              │
│  ┌─────────────────────────────────────────────┐     │
│  │   Azure Static Web App                       │     │
│  │   (delightful-water-07041da1e)              │     │
│  │                                              │     │
│  │   ┌──────────────┐  ┌──────────────────┐    │     │
│  │   │  Frontend     │  │  API (Functions)  │    │     │
│  │   │  index.html   │  │  /api/devices    │    │     │
│  │   │  (HTML/JS)    │  │  /api/policies   │    │     │
│  │   │              │  │  /api/reports    │    │     │
│  │   │              │  │  /api/sync       │    │     │
│  │   │              │  │  /api/signins    │    │     │
│  │   └──────────────┘  └───────┬──────────┘    │     │
│  │                              │               │     │
│  │   ┌──────────────────────────┘               │     │
│  │   │  Auth: /.auth/login/aad                  │     │
│  │   └──────────────────────────────────────────┘     │
│  │                              │                      │
│  │                              ▼                      │
│  │   ┌──────────────────────────────────────────┐     │
│  │   │  Microsoft Graph API                      │     │
│  │   │  (graph.microsoft.com)                    │     │
│  │   │                                           │     │
│  │   │  ┌──────────┐  ┌──────────┐  ┌────────┐ │     │
│  │   │  │  Intune   │  │ Entra ID │  │ Audit  │ │     │
│  │   │  │ Devices   │  │ Policies │  │  Logs  │ │     │
│  │   │  └──────────┘  └──────────┘  └────────┘ │     │
│  │   └──────────────────────────────────────────┘     │
│  │                                                     │
└─────────────────────────────────────────────────────┘
```

### Estructura de archivos
```
intune-dashboard/
├── frontend/
│   └── index.html              ← Dashboard completo (6 tabs)
├── api/
│   ├── graphClient.js          ← Auth con Graph API + paginacion
│   ├── package.json            ← Dependencias Node.js
│   ├── devices/                ← GET /api/devices
│   │   ├── index.js
│   │   └── function.json
│   ├── policies/               ← GET/PATCH /api/policies
│   │   ├── index.js
│   │   └── function.json
│   ├── reports/                ← GET /api/reports?type=X&format=csv
│   │   ├── index.js
│   │   └── function.json
│   ├── sync/                   ← POST /api/sync?deviceId=X
│   │   ├── index.js
│   │   └── function.json
│   └── signins/                ← GET /api/signins
│       ├── index.js
│       └── function.json
├── staticwebapp.config.json    ← Config: auth, rutas, runtime
├── .github/workflows/
│   └── azure-static-web-apps-*.yml  ← CI/CD automatico
├── .gitignore
└── README.md
```

### Stack tecnologico

| Componente | Tecnologia | Costo |
|-----------|-----------|-------|
| Frontend | HTML/CSS/JavaScript vanilla | $0 |
| Graficos | Chart.js (CDN) | $0 |
| Backend | Azure Functions (Node.js 18) | $0 (incluido) |
| Hosting | Azure Static Web Apps (Free) | $0 |
| Auth | Azure AD built-in | $0 |
| API datos | Microsoft Graph API | $0 |
| CI/CD | GitHub Actions | $0 |
| Repo | GitHub | $0 |

---

## 5. Como se Creo el Dashboard

### Paso 1: App Registration en Azure
Se creo una App Registration en Azure Portal para que el dashboard pueda autenticarse con Microsoft Graph API.

- **Nombre**: Intune-Dashboard
- **Tipo**: Application (app-only)
- **Tenant ID**: 008c6218-50df-4d2c-91bf-b43b2d4add33
- **Client ID**: 03cac16e-2c13-4ec0-9e26-0884a5d24b14
- **Client Secret**: Generado y almacenado de forma segura en Azure

### Paso 2: Permisos de Graph API
Se otorgaron los siguientes permisos (Application, no Delegated):

| Permiso | Tipo | Para que sirve |
|---------|------|---------------|
| Device.Read.All | Read | Leer dispositivos de Entra ID |
| DeviceManagementManagedDevices.Read.All | Read | Leer dispositivos de Intune |
| DeviceManagementManagedDevices.ReadWrite.All | Read+Write | Sync remoto de dispositivos |
| DeviceManagementConfiguration.ReadWrite.All | Read+Write | Editar compliance policies |
| Policy.Read.All | Read | Leer todas las politicas |
| Policy.ReadWrite.ConditionalAccess | Read+Write | Editar Conditional Access policies |
| User.Read.All | Read | Leer usuarios |
| AuditLog.Read.All | Read | Leer sign-in logs |

Todos los permisos tienen **Admin Consent** otorgado.

### Paso 3: Desarrollo del codigo
Se desarrollaron 5 Azure Functions (endpoints API) y 1 archivo HTML con todo el frontend.

### Paso 4: Repositorio GitHub
Codigo subido a: https://github.com/davidtaranto96/Intune-Dashboard

### Paso 5: Azure Static Web App
Se creo la Static Web App conectada al repo GitHub con deploy automatico.

### Paso 6: Environment Variables
Se configuraron en Azure:
- TENANT_ID
- CLIENT_ID
- CLIENT_SECRET

Estos valores **nunca estan en el codigo fuente** — se almacenan de forma segura en Azure.

---

## 6. Funcionalidades Actuales

### Tab: Home
- Pagina de bienvenida con descripcion del dashboard
- Cards explicando cada funcionalidad
- Resumen rapido: Total devices, Compliant, Non-Compliant, Policies

### Tab: Devices
- **Summary cards clickeables**: click en Compliant/Non-Compliant/Grace Period/etc. filtra la tabla
- **Graficos**: Donut de compliance status + Barras por sistema operativo
- **Tabla de dispositivos**: Nombre, usuario, OS, compliance, policy violations, last sync
- **Policy violations**: Muestra que politica especifica esta fallando cada dispositivo
- **Sync remoto**: Boton para forzar sincronizacion de un dispositivo
- **Busqueda**: Por nombre, usuario o email
- **Filtro por OS**: Windows, iOS, Android, macOS

### Tab: Policies
- **Compliance Policies**: Click para ver:
  - Todos los settings (password, encryption, firewall, defender, etc.)
  - Editar settings directamente desde el dashboard
  - Ver que dispositivos estan compliant/non-compliant/grace period
- **Conditional Access Policies**: Click para ver:
  - Condiciones: a quien aplica (usuarios, apps, plataformas)
  - Controles: que requiere (MFA, dispositivo compliant, bloqueo)
  - Cambiar estado: Enabled / Disabled / Report-only
- **Botones crear**: Links para crear nuevas policies en los portales de Intune/Entra

### Tab: Sign-in Logs
- Ultimos sign-ins con detalle de:
  - Usuario, aplicacion, hora
  - Status (exitoso/bloqueado) con razon del bloqueo
  - Ubicacion e IP
  - Device y browser
  - Que Conditional Access policies se aplicaron (pills verdes/rojas)
- Filtros: Todos, Bloqueados, Exitosos, CA Blocked, MFA Required
- Busqueda por usuario
- **Nota**: Requiere Azure AD Premium P1/P2

### Tab: Alerts
- Alertas automaticas por:
  - Dispositivos non-compliant
  - Dispositivos sin sync hace 7+ dias
  - Dispositivos en grace period
  - Dispositivos sin encryption
  - Dispositivos sin sync hace 30+ dias (abandonados)
- **Reglas configurables** con toggles on/off (se guardan en el browser)

### Tab: Reports
- Exportar CSV:
  - Todos los dispositivos
  - Solo non-compliant
  - Solo grace period
  - Nuevos (ultimos 30 dias)

### Autenticacion
- Login con cuenta Microsoft de JBKnowledge
- Solo usuarios autenticados pueden acceder
- Se muestra el email del usuario logueado en el header
- Boton Sign Out

---

## 7. Permisos y Seguridad - Analisis de Riesgos

### IMPORTANTE: Respuesta a las preocupaciones de seguridad

Esta seccion esta dirigida especialmente a la direccion/gerencia de JBKnowledge para aclarar las preocupaciones sobre los permisos otorgados.

### Como funciona la seguridad

```
┌─────────────────────────────────────────────────────┐
│  CAPA 1: Autenticacion del usuario                   │
│  Solo empleados de JBKnowledge pueden acceder        │
│  (login con cuenta Microsoft corporativa)            │
├─────────────────────────────────────────────────────┤
│  CAPA 2: Autenticacion de la aplicacion              │
│  El dashboard se conecta a Graph API con             │
│  Client Credentials (app-only, no usuario)           │
├─────────────────────────────────────────────────────┤
│  CAPA 3: Permisos acotados                           │
│  Solo puede hacer lo que los permisos permiten       │
│  (no puede borrar usuarios, no puede crear cuentas)  │
├─────────────────────────────────────────────────────┤
│  CAPA 4: Audit trail                                 │
│  Todo queda registrado en los logs de Azure           │
└─────────────────────────────────────────────────────┘
```

### Que PUEDE hacer el dashboard (con los permisos actuales)

| Accion | Permiso | Riesgo | Mitigacion |
|--------|---------|--------|------------|
| Leer dispositivos | Read | Ninguno | Solo lectura |
| Leer politicas | Read | Ninguno | Solo lectura |
| Leer usuarios | Read | Ninguno | Solo lectura |
| Leer sign-in logs | Read | Ninguno | Solo lectura |
| Editar compliance policies | ReadWrite | **Bajo** | Solo modifica settings existentes, no borra |
| Editar estado CA policies | ReadWrite | **Bajo** | Solo cambia enabled/disabled/report-only |
| Sync remoto dispositivos | Privileged | **Bajo** | Solo fuerza una sincronizacion, no borra datos |

### Que NO PUEDE hacer el dashboard (no tiene permisos)

| Accion | Por que no puede |
|--------|-----------------|
| Borrar dispositivos | No tiene DeviceManagement.Delete |
| Borrar usuarios o cuentas | No tiene User.ReadWrite.All ni Directory.ReadWrite.All |
| Leer emails o archivos | No tiene Mail.Read ni Files.Read |
| Modificar grupos | No tiene Group.ReadWrite.All |
| Resetear passwords | No tiene UserAuthenticationMethod.ReadWrite.All |
| Acceder a SharePoint/Teams | No tiene Sites.Read ni Team.Read |
| Borrar politicas | La API de compliance no permite DELETE via estos permisos |
| Crear usuarios | No tiene User.ReadWrite.All |
| Modificar roles de admin | No tiene RoleManagement.ReadWrite.Directory |

### Sobre la preocupacion de "que toque algo y modifique"

**La aplicacion NO puede actuar por si sola.** Todo cambio requiere que:

1. Un usuario autenticado de JBKnowledge este logueado en el dashboard
2. Ese usuario haga click en un boton especifico (ej: "Save Changes" o "Update State")
3. El cambio se envia a Graph API que lo ejecuta
4. El cambio queda registrado en los audit logs de Azure

**No hay procesos automaticos que modifiquen nada.** El dashboard solo lee datos automaticamente. Las escrituras siempre requieren accion manual del usuario.

### Que pasa si alguien compromete el Client Secret?

Si alguien obtuviera el Client Secret (que esta almacenado de forma segura en Azure, no en el codigo):

1. Podria leer datos de dispositivos y politicas (no emails, no archivos)
2. Podria modificar compliance policies o estado de CA policies
3. **NO podria** borrar nada, crear usuarios, leer emails, o acceder a datos confidenciales

**Mitigacion**: El Client Secret se puede rotar (renovar) en cualquier momento desde Azure Portal sin afectar el servicio — solo hay que actualizar el valor en Environment Variables.

### Recomendaciones de seguridad

1. **Rotar el Client Secret** cada 6-12 meses
2. **Monitorear los audit logs** de Azure para detectar uso inusual
3. **Limitar quien tiene acceso** al dashboard (actualmente cualquier empleado con cuenta Microsoft de JBK puede entrar)
4. Si se quiere restringir mas: se puede configurar que solo ciertos usuarios/grupos puedan acceder via staticwebapp.config.json
5. Los permisos de **ReadWrite se pueden reducir a Read-only** si se decide no necesitar la funcionalidad de edicion de politicas

### Nota sobre Claude/AI

Claude (la IA) **no tiene acceso al dashboard ni a Graph API**. Claude solo ayudo a escribir el codigo del dashboard. Una vez deployado, el dashboard funciona de forma independiente. Claude no puede:
- Acceder a los datos de JBKnowledge
- Ejecutar cambios en Intune o Entra ID
- Ver el Client Secret o credenciales
- Conectarse a los servicios de Microsoft de JBKnowledge

El codigo es open-source y esta en el repo de GitHub de David — se puede auditar en cualquier momento.

---

## 8. Analisis de Costos

### Costos actuales (Abril 2026)

| Servicio | Plan | Costo Mensual | Costo Anual |
|----------|------|--------------|-------------|
| Azure Static Web App | Free | **$0** | **$0** |
| Azure Functions (API) | Incluido en SWA | **$0** | **$0** |
| Microsoft Graph API | Incluido con M365 | **$0** | **$0** |
| GitHub (repositorio) | Free | **$0** | **$0** |
| GitHub Actions (CI/CD) | Free tier | **$0** | **$0** |
| App Registration | Incluido con Azure | **$0** | **$0** |
| Auth (login Microsoft) | Incluido en SWA | **$0** | **$0** |
| **TOTAL** | | **$0/mes** | **$0/ano** |

### Costos si se escala

| Escenario | Que se necesitaria | Costo estimado |
|-----------|-------------------|---------------|
| Mas de 100GB bandwidth/mes | Plan Standard SWA | $9/mes |
| Custom domain con SLA 99.95% | Plan Standard SWA | $9/mes |
| Sign-in logs via API | Azure AD Premium P1 | $6/user/mes (si no se tiene) |
| Notificaciones por Teams | Azure Logic App | ~$1-5/mes |
| Historial de compliance | Azure Table Storage | ~$0.05/GB/mes |
| Enterprise Edge (CDN global) | Plan Standard SWA | $9/mes |

### Comparacion con alternativas

| Solucion | Costo | Funcionalidad |
|----------|-------|--------------|
| **Nuestro dashboard (actual)** | **$0/mes** | Customizable, lectura+escritura, reportes |
| Microsoft Intune Portal | Incluido en M365 | Portal nativo pero sin customizacion |
| Power BI Dashboard | $10/user/mes | Graficos avanzados pero solo lectura |
| Terceros (Datto RMM, etc.) | $50-200/mes | Mas features pero costo alto |

### Conclusion de costos
El dashboard actualmente **no tiene costo adicional** para JBKnowledge ya que usa servicios gratuitos de Azure y el licenciamiento de Microsoft 365 que ya se paga. Es la solucion mas economica posible con maxima customizacion.

---

## 9. Funcionalidades Futuras (Roadmap)

### Corto plazo (1-2 meses)
- **Notificaciones por Microsoft Teams**: Alerta automatica cuando un dispositivo cae en non-compliant (usando Azure Logic App o Power Automate)
- **Crear policies desde el dashboard**: Formularios para crear compliance y CA policies directamente
- **Dashboard de compliance historico**: Guardar snapshots diarios en Azure Table Storage para ver tendencias

### Mediano plazo (3-6 meses)
- **Enrollment via Autopilot**: Configurar Windows Autopilot para dispositivos nuevos
- **Remediation scripts**: Ejecutar scripts de remediacion en dispositivos non-compliant
- **Multi-tenant**: Soportar multiples tenants de Azure AD
- **Roles y permisos**: Diferentes niveles de acceso (IT Admin, IT Manager, Read-only)

### Largo plazo (6-12 meses)
- **App mobile**: Version mobile del dashboard
- **AI/ML**: Prediccion de dispositivos que van a caer en non-compliant
- **Integration con ticketing**: Crear tickets automaticos en ServiceNow/Jira
- **Compliance scoring**: Puntaje de compliance por departamento/equipo

---

## 10. Guia de Mantenimiento

### Tareas regulares

| Tarea | Frecuencia | Como |
|-------|-----------|------|
| Rotar Client Secret | Cada 6-12 meses | Azure Portal > App Registration > Certificates & secrets > New secret > Actualizar en SWA Environment Variables |
| Verificar permisos | Trimestral | Azure Portal > App Registration > API permissions |
| Revisar audit logs | Mensual | Azure Portal > Entra ID > Sign-in logs |
| Actualizar dependencias | Trimestral | `cd api && npm update` + push |

### Si algo deja de funcionar

| Sintoma | Causa probable | Solucion |
|---------|---------------|----------|
| 401/403 en la API | Client Secret expirado | Rotar secret en App Registration + actualizar Environment Variable |
| "No devices found" | Permisos removidos | Verificar API permissions + Grant admin consent |
| Deploy falla | Error en el codigo | Revisar GitHub Actions logs |
| Login no funciona | Config de SWA | Verificar staticwebapp.config.json |
| Sign-in logs error | Falta Azure AD Premium P1 | Verificar licencia o desactivar el tab |

### Como hacer cambios al dashboard

1. Clonar el repo: `git clone https://github.com/davidtaranto96/Intune-Dashboard.git`
2. Hacer cambios en el codigo
3. Commit: `git add . && git commit -m "descripcion"`
4. Push: `git push`
5. GitHub Actions deploya automaticamente en 2-3 minutos
6. Verificar en la URL del dashboard

### Contacto
- **Desarrollador**: David Taranto (david.taranto@jbknowledge.com)
- **Repo**: https://github.com/davidtaranto96/Intune-Dashboard
- **Azure Resource**: intune-dashboard (Static Web App)
- **App Registration**: Intune-Dashboard (Client ID: 03cac16e-2c13-4ec0-9e26-0884a5d24b14)

---

*Documento generado como parte del proyecto Intune Compliance Dashboard de JBKnowledge.*
*Ultima actualizacion: Abril 2026*
