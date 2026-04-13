# JBKnowledge SWA — Security Template
> Copiar este template a cualquier Azure Static Web App de la empresa para aplicar las mismas medidas de seguridad.

---

## 1. `staticwebapp.config.json`

Colocar en la raíz del proyecto. Reemplazar `node:18` por el runtime que use tu app (`node:18`, `python:3.11`, etc.)

```json
{
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/.auth/login/github",
      "statusCode": 404
    },
    {
      "route": "/.auth/login/twitter",
      "statusCode": 404
    },
    {
      "route": "/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad?prompt=select_account",
      "statusCode": 302
    }
  },
  "platform": {
    "apiRuntime": "node:18"
  }
}
```

**Qué hace cada parte:**
| Config | Propósito |
|---|---|
| `/api/*` → authenticated | Nadie puede llamar las APIs sin estar logueado |
| GitHub/Twitter → 404 | Bloquea proveedores de login que no usamos |
| `/*` → authenticated | Toda la app requiere login |
| 401 → AAD + `prompt=select_account` | Redirige al login de Microsoft y siempre muestra el selector de cuentas |

---

## 2. Login button — HTML

El botón de "Sign in with Microsoft" debe incluir `prompt=select_account` para que siempre muestre el selector, nunca entre automáticamente con la sesión anterior.

```html
<a href="/.auth/login/aad?post_login_redirect_uri=/&prompt=select_account">
  Sign in with Microsoft
</a>
```

---

## 3. Sign Out — JS

El logout debe incluir `post_logout_redirect_uri` para que AAD cierre la sesión completamente y no quede cacheada.

```javascript
function logout() {
  window.location.href = '/.auth/logout?post_logout_redirect_uri=/';
}
```

---

## 4. Domain allowlist — JS (frontend check)

Después del login, verificar que el email sea del dominio de la empresa. Si no, mostrar "Access Denied" con botón para cambiar de cuenta.

Pegar esto en el `<script>` del HTML, antes de `checkAuth()`:

```javascript
const ALLOWED_DOMAIN = 'jbknowledge.com'; // cambiar si es otra empresa

function isAllowedUser(email) {
  return email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN);
}
```

Y el `checkAuth()` completo con la verificación:

```javascript
async function checkAuth() {
  try {
    const res = await fetch('/.auth/me');
    const data = await res.json();
    if (data.clientPrincipal) {
      const user = data.clientPrincipal;
      const email = (user.userDetails || user.userId || '').toLowerCase();

      if (!isAllowedUser(email)) {
        // Mostrar Access Denied — reemplazar 'loginCard' con el ID de tu contenedor
        document.getElementById('loginCard').innerHTML =
          '<div style="font-size:52px;margin-bottom:16px;">⛔</div>' +
          '<h2 style="color:#d13438;">Access Denied</h2>' +
          '<p>La cuenta <strong>' + email + '</strong> no tiene acceso.<br>' +
          'Solo cuentas <strong>@' + ALLOWED_DOMAIN + '</strong> están autorizadas.</p>' +
          '<a href="/.auth/logout?post_logout_redirect_uri=/" ' +
          'style="display:inline-block;margin-top:16px;padding:10px 24px;' +
          'background:#fde7e9;border:2px solid #d13438;color:#d13438;' +
          'border-radius:8px;text-decoration:none;">↩ Usar otra cuenta</a>';
        return;
      }

      // Usuario autorizado — mostrar la app
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('app').classList.add('show'); // ajustar al ID de tu app
      // ... resto de la inicialización
    }
  } catch (e) {
    // No logueado — mostrar página de login
  }
}
```

---

## 5. Azure AD — Restricción a nivel servidor ⚠️ RECOMENDADO

> Esta es la medida más importante. Sin esto, alguien con una cuenta en tu Azure AD igual podría bypassear el check frontend.

**Pasos (una sola vez por app):**

1. Ir a [portal.azure.com](https://portal.azure.com)
2. **Azure Active Directory** → **Enterprise Applications**
3. Buscar la app (mismo nombre que tu Static Web App)
4. **Properties** → `Assignment required` = **Yes** → **Save**
5. **Users and groups** → **Add user/group** → Agregar solo los usuarios/grupos autorizados

**Resultado:** Azure rechaza el login ANTES de que llegue a tu app. Nadie fuera de la lista puede entrar, aunque conozca la URL.

---

## 6. Checklist completo

- [ ] `staticwebapp.config.json` con rutas protegidas y GitHub/Twitter bloqueados
- [ ] Login button con `prompt=select_account`
- [ ] `logout()` con `post_logout_redirect_uri=/`
- [ ] `checkAuth()` con domain allowlist y página de Access Denied
- [ ] Azure AD Enterprise App → `Assignment required = Yes` + usuarios asignados

---

## Notas

- **`prompt=select_account`** → siempre muestra el selector de cuentas de Microsoft, nunca entra automáticamente
- **`post_logout_redirect_uri=/`** → limpia la sesión de AAD completamente al hacer Sign Out
- El check de dominio en JS es una capa de UX; la protección real es Azure AD Enterprise App
- Si tu app tiene múltiples dominios permitidos, cambiar `isAllowedUser` a: `const ALLOWED_DOMAINS = ['jbknowledge.com', 'otrodominio.com']` y usar `ALLOWED_DOMAINS.some(d => email.endsWith('@' + d))`
