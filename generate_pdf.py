from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.lib import colors

OUTPUT_PATH = r"C:\Users\DavidSebastianTarant\OneDrive - JBKnowledge, Inc\Desktop\Intune Compliance Dashboard - Guia Tecnica.pdf"

BLUE = HexColor("#0078d4")
DARK_BLUE = HexColor("#1a237e")
LIGHT_BLUE = HexColor("#e8f0fe")
GREEN = HexColor("#107c10")
RED = HexColor("#d13438")
ORANGE = HexColor("#ff8c00")
LIGHT_GRAY = HexColor("#f5f5f5")
GRAY = HexColor("#666666")
DARK = HexColor("#1a1a2e")

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(name='CoverTitle', fontSize=28, leading=34, textColor=white, alignment=TA_CENTER, fontName='Helvetica-Bold', spaceAfter=12))
styles.add(ParagraphStyle(name='CoverSubtitle', fontSize=14, leading=18, textColor=white, alignment=TA_CENTER, fontName='Helvetica', spaceAfter=6))
styles.add(ParagraphStyle(name='SectionTitle', fontSize=20, leading=24, textColor=DARK_BLUE, fontName='Helvetica-Bold', spaceAfter=12, spaceBefore=20))
styles.add(ParagraphStyle(name='SubSection', fontSize=14, leading=18, textColor=BLUE, fontName='Helvetica-Bold', spaceAfter=8, spaceBefore=14))
styles.add(ParagraphStyle(name='BodyText2', fontSize=10, leading=14, textColor=DARK, fontName='Helvetica', spaceAfter=6, alignment=TA_JUSTIFY))
styles.add(ParagraphStyle(name='BulletItem', fontSize=10, leading=14, textColor=DARK, fontName='Helvetica', spaceAfter=4, leftIndent=20, bulletIndent=10))
styles.add(ParagraphStyle(name='SmallGray', fontSize=9, leading=12, textColor=GRAY, fontName='Helvetica'))
styles.add(ParagraphStyle(name='TableHeader', fontSize=9, leading=12, textColor=white, fontName='Helvetica-Bold', alignment=TA_CENTER))
styles.add(ParagraphStyle(name='TableCell', fontSize=9, leading=12, textColor=DARK, fontName='Helvetica'))
styles.add(ParagraphStyle(name='PageNum', fontSize=8, leading=10, textColor=GRAY, fontName='Helvetica', alignment=TA_CENTER))
styles.add(ParagraphStyle(name='InfoBox', fontSize=10, leading=14, textColor=DARK_BLUE, fontName='Helvetica', spaceAfter=6, leftIndent=10))
styles.add(ParagraphStyle(name='Warning', fontSize=10, leading=14, textColor=RED, fontName='Helvetica-Bold', spaceAfter=6))

def add_page_number(canvas_obj, doc):
    canvas_obj.saveState()
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.setFillColor(GRAY)
    canvas_obj.drawCentredString(letter[0]/2, 30, f"{doc.page}")
    canvas_obj.drawString(72, 30, "JBKnowledge - Intune Compliance Dashboard")
    canvas_obj.restoreState()

def make_table(headers, rows, col_widths=None):
    header_cells = [Paragraph(h, styles['TableHeader']) for h in headers]
    data = [header_cells]
    for row in rows:
        data.append([Paragraph(str(c), styles['TableCell']) for c in row])

    if not col_widths:
        col_widths = [460 / len(headers)] * len(headers)

    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#dddddd")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    return t

def info_box(text):
    t = Table([[Paragraph(text, styles['InfoBox'])]], colWidths=[440])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BLUE),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    return t

def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT_PATH, pagesize=letter,
        topMargin=72, bottomMargin=60, leftMargin=72, rightMargin=72
    )
    story = []
    W = letter[0] - 144  # usable width

    # ============ COVER PAGE ============
    story.append(Spacer(1, 60))
    cover_data = [
        [Paragraph("Intune Compliance Dashboard", styles['CoverTitle'])],
        [Paragraph("Guia Tecnica y Reporte de Seguridad", styles['CoverSubtitle'])],
        [Spacer(1, 20)],
        [Paragraph("JBKnowledge - Information Technology", styles['CoverSubtitle'])],
        [Paragraph("Abril 2026", styles['CoverSubtitle'])],
    ]
    cover_table = Table(cover_data, colWidths=[W])
    cover_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), DARK_BLUE),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (0, 0), 40),
        ('BOTTOMPADDING', (0, -1), (0, -1), 40),
        ('LEFTPADDING', (0, 0), (-1, -1), 20),
        ('RIGHTPADDING', (0, 0), (-1, -1), 20),
        ('ROUNDEDCORNERS', [10, 10, 10, 10]),
    ]))
    story.append(cover_table)
    story.append(Spacer(1, 40))

    cover_info = [
        ["URL", "https://delightful-water-07041da1e.azurestaticapps.net"],
        ["Repositorio", "github.com/davidtaranto96/Intune-Dashboard"],
        ["Autor", "David Taranto - IT Department"],
        ["Costo actual", "$0 / mes"],
    ]
    for row in cover_info:
        story.append(Paragraph(f"<b>{row[0]}:</b> {row[1]}", styles['BodyText2']))

    story.append(PageBreak())

    # ============ INDEX ============
    story.append(Paragraph("Indice", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", color=DARK_BLUE, thickness=2))
    story.append(Spacer(1, 12))

    toc_items = [
        "1. Que es Microsoft Graph API",
        "2. Que es Azure Static Web Apps",
        "3. Arquitectura del Proyecto",
        "4. Funcionalidades del Dashboard",
        "5. Permisos y Seguridad",
        "6. Analisis de Costos",
        "7. Funcionalidades Futuras",
        "8. Guia de Mantenimiento",
    ]
    for item in toc_items:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {item}", styles['BulletItem']))

    story.append(PageBreak())

    # ============ SECTION 1: GRAPH API ============
    story.append(Paragraph("1. Que es Microsoft Graph API", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", color=BLUE, thickness=1))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "Microsoft Graph API es la <b>puerta de entrada unificada</b> a todos los datos y servicios de Microsoft 365. "
        "Es una API REST que permite acceder programaticamente a Azure Active Directory / Entra ID, "
        "Microsoft Intune, Office 365, Microsoft Teams, y muchos mas servicios.",
        styles['BodyText2']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Como funciona", styles['SubSection']))
    story.append(Paragraph(
        "1. La aplicacion se autentica con credenciales (Client ID + Secret)<br/>"
        "2. Obtiene un token de acceso (OAuth 2.0)<br/>"
        "3. Usa ese token para hacer llamadas REST a Graph API<br/>"
        "4. Graph API devuelve los datos en formato JSON",
        styles['BodyText2']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Tipos de autenticacion", styles['SubSection']))
    story.append(make_table(
        ["Tipo", "Descripcion", "Nuestro caso"],
        [
            ["Delegated (usuario)", "Actua en nombre de un usuario logueado", "NO usamos"],
            ["Application (app-only)", "Actua como la aplicacion misma", "SI, usamos este"],
        ],
        [120, 220, 120]
    ))
    story.append(Spacer(1, 8))
    story.append(info_box(
        "<b>Importante:</b> Usamos Client Credentials (app-only), lo que significa que el dashboard accede "
        "a Graph API con su propia identidad, no en nombre de un usuario. Esto es clave para la seguridad."
    ))

    story.append(PageBreak())

    # ============ SECTION 2: STATIC WEB APPS ============
    story.append(Paragraph("2. Que es Azure Static Web Apps", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", color=BLUE, thickness=1))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "Azure Static Web Apps es un servicio de Azure que <b>hostea sitios web estaticos</b> (HTML, CSS, JS) "
        "y les agrega una <b>API serverless</b> (Azure Functions) automaticamente. "
        "Incluye deploy automatico desde GitHub, autenticacion integrada con Microsoft, HTTPS y CDN global.",
        styles['BodyText2']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Planes y limites", styles['SubSection']))
    story.append(make_table(
        ["Caracteristica", "Free", "Standard ($9/mes)"],
        [
            ["Bandwidth", "100 GB/mes", "100 GB/mes"],
            ["Custom domains", "2", "5"],
            ["SSL/HTTPS", "Incluido", "Incluido"],
            ["Auth providers", "Todos", "Todos"],
            ["API (Functions)", "Incluido", "Incluido"],
            ["SLA", "No", "99.95%"],
        ],
        [180, 140, 140]
    ))
    story.append(Spacer(1, 8))
    story.append(info_box("<b>Para nuestro uso, el plan Free es mas que suficiente.</b> No tiene costo adicional."))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Como funciona el deploy", styles['SubSection']))
    story.append(Paragraph(
        "<bullet>&bull;</bullet> El developer hace push a GitHub (branch main)",
        styles['BulletItem']
    ))
    story.append(Paragraph(
        "<bullet>&bull;</bullet> GitHub Actions detecta el push automaticamente",
        styles['BulletItem']
    ))
    story.append(Paragraph(
        "<bullet>&bull;</bullet> Construye el proyecto y lo sube a Azure Static Web Apps",
        styles['BulletItem']
    ))
    story.append(Paragraph(
        "<bullet>&bull;</bullet> El sitio se actualiza en 2-3 minutos",
        styles['BulletItem']
    ))

    story.append(PageBreak())

    # ============ SECTION 3: ARCHITECTURE ============
    story.append(Paragraph("3. Arquitectura del Proyecto", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", color=BLUE, thickness=1))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Stack tecnologico", styles['SubSection']))
    story.append(make_table(
        ["Componente", "Tecnologia", "Costo"],
        [
            ["Frontend", "HTML/CSS/JavaScript vanilla + Chart.js", "$0"],
            ["Backend", "Azure Functions (Node.js 18)", "$0 (incluido)"],
            ["Hosting", "Azure Static Web Apps (Free)", "$0"],
            ["Autenticacion", "Azure AD built-in", "$0"],
            ["API de datos", "Microsoft Graph API", "$0"],
            ["CI/CD", "GitHub Actions", "$0"],
            ["Repositorio", "GitHub", "$0"],
        ],
        [120, 220, 120]
    ))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Endpoints de la API", styles['SubSection']))
    story.append(make_table(
        ["Endpoint", "Metodo", "Descripcion"],
        [
            ["/api/devices", "GET", "Lista todos los dispositivos con compliance state y violaciones"],
            ["/api/policies", "GET/PATCH", "Compliance, CA policies - leer y editar"],
            ["/api/reports", "GET", "Exporta reportes CSV (all, noncompliant, grace, new)"],
            ["/api/sync", "POST", "Fuerza sync remoto en un dispositivo"],
            ["/api/signins", "GET", "Sign-in logs de Entra ID (requiere Premium P1)"],
        ],
        [100, 70, 290]
    ))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Estructura de archivos", styles['SubSection']))
    struct_items = [
        "frontend/index.html - Dashboard completo (6 tabs)",
        "api/graphClient.js - Auth con Graph API + paginacion",
        "api/devices/ - Endpoint de dispositivos",
        "api/policies/ - Endpoint de politicas (lectura + edicion)",
        "api/reports/ - Endpoint de reportes CSV",
        "api/sync/ - Endpoint de sync remoto",
        "api/signins/ - Endpoint de sign-in logs",
        "staticwebapp.config.json - Config de auth y rutas",
        ".github/workflows/ - CI/CD automatico",
    ]
    for item in struct_items:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {item}", styles['BulletItem']))

    story.append(PageBreak())

    # ============ SECTION 4: FEATURES ============
    story.append(Paragraph("4. Funcionalidades del Dashboard", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", color=BLUE, thickness=1))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Login con Microsoft", styles['SubSection']))
    story.append(Paragraph(
        "Pantalla de inicio de sesion con cuenta Microsoft corporativa de JBKnowledge. "
        "Solo usuarios autenticados pueden acceder al dashboard. Se muestra el email del usuario en el header.",
        styles['BodyText2']
    ))

    story.append(Paragraph("Tab: Home", styles['SubSection']))
    story.append(Paragraph(
        "Pagina de bienvenida con descripcion del dashboard, cards de funcionalidades, "
        "y resumen rapido de Total Devices, Compliant, Non-Compliant y Policies.",
        styles['BodyText2']
    ))

    story.append(Paragraph("Tab: Devices", styles['SubSection']))
    features_devices = [
        "Summary cards clickeables: click en Compliant/Non-Compliant/etc. filtra la tabla",
        "Graficos: Donut de compliance status + Barras por sistema operativo",
        "Tabla con nombre, usuario, OS, compliance, policy violations, last sync",
        "Policy violations: muestra que politica especifica falla cada dispositivo",
        "Sync remoto: boton para forzar sincronizacion",
        "Busqueda por nombre, usuario o email + filtro por OS",
    ]
    for f in features_devices:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {f}", styles['BulletItem']))

    story.append(Paragraph("Tab: Policies", styles['SubSection']))
    features_policies = [
        "Compliance Policies: click para ver settings (password, encryption, firewall, etc.) y editarlos",
        "Conditional Access: click para ver condiciones, grant controls, y cambiar estado (enable/disable)",
        "Botones para crear nuevas policies (enlaza a portales de Intune/Entra)",
    ]
    for f in features_policies:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {f}", styles['BulletItem']))

    story.append(Paragraph("Tab: Sign-in Logs", styles['SubSection']))
    story.append(Paragraph(
        "Ultimos sign-ins de Entra ID con detalle de usuario, app, status (exitoso/bloqueado), "
        "ubicacion, IP, device, browser y que CA policies se aplicaron. "
        "Filtros: Todos, Bloqueados, Exitosos, CA Blocked, MFA Required. "
        "<b>Requiere Azure AD Premium P1/P2.</b>",
        styles['BodyText2']
    ))

    story.append(Paragraph("Tab: Alerts", styles['SubSection']))
    story.append(Paragraph(
        "Alertas automaticas configurables con toggles on/off: dispositivos non-compliant, "
        "stale (7+ dias), grace period, sin encryption, abandonados (30+ dias).",
        styles['BodyText2']
    ))

    story.append(Paragraph("Tab: Reports", styles['SubSection']))
    story.append(Paragraph(
        "Exportar reportes CSV: todos los dispositivos, solo non-compliant, "
        "solo grace period, nuevos (ultimos 30 dias).",
        styles['BodyText2']
    ))

    story.append(PageBreak())

    # ============ SECTION 5: SECURITY ============
    story.append(Paragraph("5. Permisos y Seguridad", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", color=BLUE, thickness=1))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "Esta seccion esta dirigida especialmente a la direccion de JBKnowledge para aclarar "
        "las preocupaciones sobre los permisos otorgados a la aplicacion.",
        styles['BodyText2']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Permisos otorgados", styles['SubSection']))
    story.append(make_table(
        ["Permiso", "Tipo", "Para que sirve"],
        [
            ["Device.Read.All", "Lectura", "Leer dispositivos de Entra ID"],
            ["DeviceManagement...Read.All", "Lectura", "Leer dispositivos de Intune"],
            ["DeviceManagement...ReadWrite.All", "Lectura+Escritura", "Sync remoto de dispositivos"],
            ["DeviceManagementConfig...ReadWrite", "Lectura+Escritura", "Editar compliance policies"],
            ["Policy.Read.All", "Lectura", "Leer todas las politicas"],
            ["Policy.ReadWrite.ConditionalAccess", "Lectura+Escritura", "Editar CA policies"],
            ["User.Read.All", "Lectura", "Leer usuarios"],
            ["AuditLog.Read.All", "Lectura", "Leer sign-in logs"],
        ],
        [165, 95, 200]
    ))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Que NO puede hacer el dashboard", styles['SubSection']))
    story.append(Paragraph(
        "<font color='#d13438'><b>La aplicacion NO tiene permisos para:</b></font>",
        styles['BodyText2']
    ))
    no_can_do = [
        "Borrar dispositivos, usuarios o cuentas",
        "Leer emails, archivos de OneDrive/SharePoint",
        "Modificar grupos o roles de administrador",
        "Resetear passwords de usuarios",
        "Acceder a Teams, SharePoint o cualquier dato personal",
        "Crear usuarios o cuentas nuevas",
        "Borrar politicas existentes",
    ]
    for item in no_can_do:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {item}", styles['BulletItem']))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Capas de seguridad", styles['SubSection']))
    story.append(make_table(
        ["Capa", "Descripcion"],
        [
            ["1. Auth del usuario", "Solo empleados de JBKnowledge pueden acceder (login Microsoft)"],
            ["2. Auth de la app", "Client Credentials con secret almacenado en Azure (no en codigo)"],
            ["3. Permisos acotados", "Solo puede hacer lo que los permisos permiten"],
            ["4. Audit trail", "Todo queda registrado en los logs de Azure"],
        ],
        [130, 330]
    ))

    story.append(Spacer(1, 12))
    story.append(info_box(
        "<b>IMPORTANTE - Sobre cambios automaticos:</b><br/><br/>"
        "La aplicacion NO puede actuar por si sola. Todo cambio requiere que:<br/>"
        "1. Un usuario autenticado de JBK este logueado<br/>"
        "2. Ese usuario haga click en un boton especifico (ej: 'Save Changes')<br/>"
        "3. El cambio queda registrado en los audit logs de Azure<br/><br/>"
        "<b>No hay procesos automaticos que modifiquen nada.</b> El dashboard solo lee datos automaticamente. "
        "Las escrituras siempre requieren accion manual."
    ))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Sobre Claude / IA", styles['SubSection']))
    story.append(info_box(
        "<b>Claude (la IA) NO tiene acceso al dashboard ni a Graph API.</b><br/><br/>"
        "Claude solo ayudo a escribir el codigo. Una vez deployado, el dashboard funciona independientemente. "
        "Claude no puede acceder a datos de JBK, ejecutar cambios en Intune/Entra, "
        "ver credenciales, ni conectarse a servicios de Microsoft de JBKnowledge.<br/><br/>"
        "El codigo es open-source en GitHub y se puede auditar en cualquier momento."
    ))

    story.append(PageBreak())

    # ============ SECTION 6: COSTS ============
    story.append(Paragraph("6. Analisis de Costos", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", color=BLUE, thickness=1))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Costos actuales (Abril 2026)", styles['SubSection']))
    story.append(make_table(
        ["Servicio", "Plan", "Costo Mensual", "Costo Anual"],
        [
            ["Azure Static Web App", "Free", "$0", "$0"],
            ["Azure Functions (API)", "Incluido en SWA", "$0", "$0"],
            ["Microsoft Graph API", "Incluido con M365", "$0", "$0"],
            ["GitHub + Actions", "Free", "$0", "$0"],
            ["Auth (login Microsoft)", "Incluido en SWA", "$0", "$0"],
            ["TOTAL", "", "$0/mes", "$0/ano"],
        ],
        [140, 120, 100, 100]
    ))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Costos si se escala", styles['SubSection']))
    story.append(make_table(
        ["Escenario", "Que se necesita", "Costo estimado"],
        [
            ["Mas de 100GB bandwidth", "Plan Standard SWA", "$9/mes"],
            ["Custom domain + SLA", "Plan Standard SWA", "$9/mes"],
            ["Sign-in logs via API", "Azure AD Premium P1", "$6/user/mes"],
            ["Notificaciones Teams", "Azure Logic App", "~$1-5/mes"],
            ["Historial compliance", "Azure Table Storage", "~$0.05/GB/mes"],
        ],
        [150, 160, 150]
    ))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Comparacion con alternativas", styles['SubSection']))
    story.append(make_table(
        ["Solucion", "Costo", "Notas"],
        [
            ["Nuestro dashboard", "$0/mes", "Customizable, lectura+escritura, reportes"],
            ["Microsoft Intune Portal", "Incluido en M365", "Nativo pero sin customizacion"],
            ["Power BI Dashboard", "$10/user/mes", "Graficos avanzados, solo lectura"],
            ["Terceros (Datto, etc.)", "$50-200/mes", "Mas features, costo alto"],
        ],
        [140, 100, 220]
    ))

    story.append(PageBreak())

    # ============ SECTION 7: FUTURE ============
    story.append(Paragraph("7. Funcionalidades Futuras", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", color=BLUE, thickness=1))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Corto plazo (1-2 meses)", styles['SubSection']))
    short_term = [
        "Notificaciones por Microsoft Teams cuando un dispositivo cae en non-compliant",
        "Crear compliance y CA policies directamente desde el dashboard",
        "Historial de compliance con snapshots diarios (Azure Table Storage)",
    ]
    for item in short_term:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {item}", styles['BulletItem']))

    story.append(Paragraph("Mediano plazo (3-6 meses)", styles['SubSection']))
    mid_term = [
        "Enrollment via Windows Autopilot para dispositivos nuevos",
        "Scripts de remediacion para dispositivos non-compliant",
        "Soporte multi-tenant para multiples Azure AD",
        "Roles y permisos: IT Admin, IT Manager, Read-only",
    ]
    for item in mid_term:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {item}", styles['BulletItem']))

    story.append(Paragraph("Largo plazo (6-12 meses)", styles['SubSection']))
    long_term = [
        "Version mobile del dashboard",
        "Prediccion con AI/ML de dispositivos en riesgo",
        "Integracion con ticketing (ServiceNow/Jira)",
        "Compliance scoring por departamento",
    ]
    for item in long_term:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {item}", styles['BulletItem']))

    story.append(PageBreak())

    # ============ SECTION 8: MAINTENANCE ============
    story.append(Paragraph("8. Guia de Mantenimiento", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", color=BLUE, thickness=1))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Tareas regulares", styles['SubSection']))
    story.append(make_table(
        ["Tarea", "Frecuencia", "Como"],
        [
            ["Rotar Client Secret", "Cada 6-12 meses", "Azure > App Registration > Certificates & secrets"],
            ["Verificar permisos", "Trimestral", "Azure > App Registration > API permissions"],
            ["Revisar audit logs", "Mensual", "Azure > Entra ID > Sign-in logs"],
            ["Actualizar dependencias", "Trimestral", "cd api && npm update + push"],
        ],
        [130, 100, 230]
    ))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Troubleshooting", styles['SubSection']))
    story.append(make_table(
        ["Sintoma", "Causa probable", "Solucion"],
        [
            ["401/403 en la API", "Client Secret expirado", "Rotar secret + actualizar Environment Variable"],
            ["No devices found", "Permisos removidos", "Verificar API permissions + Grant admin consent"],
            ["Deploy falla", "Error en codigo", "Revisar GitHub Actions logs"],
            ["Login no funciona", "Config de SWA", "Verificar staticwebapp.config.json"],
            ["Sign-in logs error", "Falta Premium P1", "Verificar licencia Azure AD"],
        ],
        [120, 120, 220]
    ))

    story.append(Spacer(1, 20))
    story.append(Paragraph("Contacto", styles['SubSection']))
    story.append(Paragraph("<b>Desarrollador:</b> David Taranto (david.taranto@jbknowledge.com)", styles['BodyText2']))
    story.append(Paragraph("<b>Repo:</b> github.com/davidtaranto96/Intune-Dashboard", styles['BodyText2']))
    story.append(Paragraph("<b>Azure Resource:</b> intune-dashboard (Static Web App)", styles['BodyText2']))
    story.append(Paragraph("<b>App Registration:</b> Intune-Dashboard (Client ID: 03cac16e-2c13-4ec0-9e26-0884a5d24b14)", styles['BodyText2']))

    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="100%", color=GRAY, thickness=0.5))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "<i>Documento generado como parte del proyecto Intune Compliance Dashboard de JBKnowledge. Abril 2026.</i>",
        styles['SmallGray']
    ))

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"PDF generado exitosamente en: {OUTPUT_PATH}")

if __name__ == "__main__":
    build_pdf()
