# Parche portable — Point of Sale (desktop manual)

Paquete para corregir instalaciones desktop empaquetadas a mano (`win-unpacked` o NSIS) en **otra PC**, sin tocar la base de datos del usuario.

## Qué corrige

| Problema | Solución del parche |
|----------|---------------------|
| Falta `license-public.pem` en el backend empaquetado | Copia la clave a `resources/backend/dist/license/keys/` |
| `sqlite3` / `bcrypt` no compilados para Electron | `npm install` + `@electron/rebuild` contra Electron **41.9.0** |
| La app cierra sola o la API no arranca | Módulos nativos y licencia listos para `ELECTRON_RUN_AS_NODE` |

**No modifica** `%APPDATA%\PointOfSale\` (SQLite, uploads, certificados AFIP).

## Requisitos en la PC destino

- Windows 10/11
- **Node.js 20+** y **npm** en el PATH ([nodejs.org](https://nodejs.org))
- Si `electron-rebuild` falla: **Visual Studio Build Tools** con carga *Desktop development with C++*

## Antes de ejecutar

1. Cerrá **Point of Sale** por completo.
2. Cerrá **`npm run dev:stack`** u otro proceso que use el puerto **3001**.
3. Descomprimí este ZIP en cualquier carpeta (ej. `C:\Temp\desktop-patch`).

## Cómo ejecutar

Abrir PowerShell en la carpeta descomprimida:

```powershell
# Instalación NSIS (ruta por defecto si existe)
.\apply-desktop-patch.ps1

# Carpeta win-unpacked o ruta custom
.\apply-desktop-patch.ps1 -AppPath "C:\Temp\pos-build\win-unpacked"

# Otra instalación NSIS
.\apply-desktop-patch.ps1 -AppPath "$env:LOCALAPPDATA\Programs\Point of Sale"
```

`-AppPath` debe apuntar a la carpeta que contiene `Point of Sale.exe` y `resources\backend\`.

Si no pasás `-AppPath`, el script busca en:

- `%LOCALAPPDATA%\Programs\Point of Sale`
- `%LOCALAPPDATA%\Programs\point-of-sale-desktop`

y pide la ruta si no encuentra ninguna.

## Contenido del ZIP

| Archivo | Uso |
|---------|-----|
| `apply-desktop-patch.ps1` | Script principal |
| `license-public.pem` | Clave pública embebida |
| `README-PARCHE.md` | Esta guía |

## Después del parche

Abrí la app como siempre. Los datos en AppData se conservan.

Si sigue fallando, revisá que la instalación tenga `resources\backend\dist\main.js` y ejecutá de nuevo con la ruta correcta de `-AppPath`.
