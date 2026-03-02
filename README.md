# SII Cert Backoffice

Login básico de backoffice con:

- Next.js App Router
- UI con `shadcn/ui`
- Autenticación contra MongoDB (`certificacion.users`)
- Validación de contraseña con `bcryptjs`

## Getting Started

1. Configura variables de entorno:

```bash
cp .env.example .env
```

2. Ajusta `MONGODB_URI` en `.env`.
3. Levanta el proyecto:

```bash
pnpm dev
```

4. Abre [http://localhost:3000](http://localhost:3000)

## Endpoint de Login

`POST /api/login`

Body:

```json
{
  "email": "usuario@empresa.cl",
  "password": "tu-password"
}
```

Respuesta exitosa:

```json
{
  "ok": true,
  "message": "Login exitoso",
  "user": {
    "id": "...",
    "email": "usuario@empresa.cl"
  }
}
```

Si las credenciales son incorrectas retorna `401`.
