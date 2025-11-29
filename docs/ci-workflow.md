# CI / Production Upsert Workflows

Este documento describe los workflows de GitHub Actions incluidos en este repositorio y los pasos para configurarlos.

## CI - Tests and Seed
- Ruta: `.github/workflows/ci.yml`
- Objetivo: Ejecuta pruebas en GitHub Actions con un servicio de Postgres (container) y ejecuta `prisma db push` + `prisma/create_test_user.ts` para que los tests tengan un usuario de prueba.

Requisitos:
- No necesita secretos (usamos `postgres:postgres` localmente en el runner).

Pasos importantes:
- `npm ci` -> `npm run prisma:generate` -> `npx prisma db push` -> `npx ts-node prisma/create_test_user.ts` -> `npm test`.

## Manual Production Upsert
- Ruta: `.github/workflows/prod-upsert.yml`
- Ejecutar: Manual (workflow_dispatch). Diseñado solamente para casos donde se necesita ejecutar `prisma/create_test_user.ts` en producción sin un deployment manual.

⚠️ Recomendaciones de seguridad:
- NO agregues secrets de producción en el repo/archivo sin revisiones.
- Define un `Environment` en GitHub con revisión y aprobadores para exigir aprobaciones antes de ejecutar.
- Secrets que el workflow usa: `DATABASE_URL_PROD` y opcional `DATABASE_PASSWORD_PROD`. Guarda `DATABASE_URL_PROD` en `Settings -> Secrets and variables -> Actions`.
- No ejecutes el workflow sin realizar un backup y sin revisión.

### Cómo usar la consola del proveedor (más seguro)
Si tu proveedor (p.ej. Railway) ofrece una Consola/SQL-runner, te recomendamos usarla para ejecutar el `INSERT ... ON CONFLICT` con el hash que generes localmente.

1. Generá el hash localmente con `node -e "console.log(require('bcrypt').hashSync('Test1234', 10));"`.
2. Abre la consola SQL del proveedor y ejecutá el `INSERT ... ON CONFLICT` con el hash.
3. Verificá `SELECT id, email, passwordHash FROM "User" WHERE email='prueba@example.com';` y valida localmente con `bcrypt.compareSync`.

---
Si querés que cree el PR para añadir estos archivos y configurarlos (o si necesitás que agregue un paso extra en el CI), confirmame y lo hago.