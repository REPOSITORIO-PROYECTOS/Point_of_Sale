# Setup inicial (primera vez)

Ejecutar **una sola vez** por máquina de desarrollo.

## Requisitos

- Node.js 20+
- npm
- Docker Desktop (para AFIP en dev)
- Git

## Pasos

```powershell
Set-Location "C:\Users\ticia\SISTEMAS\Point_of_Sale"

# Orquestación raíz
npm install

# Frontend
npm install --prefix frontend
npm install --prefix frontend react@18.3.1 react-dom@18.3.1

# Backend
Set-Location backend
Copy-Item .env.example .env
npm install
npm run db:init
Set-Location ..

# Desktop
npm install --prefix desktop
```

## Verificar

```powershell
npm run dev:stack
```

En otra terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api
Start-Process http://localhost:5173
```

## Siguiente paso

→ [Desarrollo diario](../casos-de-uso/01-desarrollo-diario.md)

## Referencias

- Datos: [../data/README.md](../data/README.md)
- IA: [../ai/dev-runbook.md](../ai/dev-runbook.md)
