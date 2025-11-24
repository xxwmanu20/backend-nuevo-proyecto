# Flujo de CI

Este documento resume la tuberia configurada en `.github/workflows/ci.yml` y ofrece pasos para reproducirla localmente.

## Desencadenadores

- **push** a `master`.
- **pull_request** hacia cualquier rama.
- **schedule** diario (`0 6 * * *`, 06:00 UTC) que valida el estado de `master` aunque no existan commits nuevos.

## Trabajos

Cada ejecución dispara los siguientes jobs en GitHub Actions:

1. **Lint**
   - Sistema: `ubuntu-latest`.
   - Pasos clave: `npm ci`, `npm run lint`.
   - Resultado: verifica estilo y errores de TypeScript.

2. **Unit Tests** (solo en `pull_request`)
   - Depende de `Lint`.
  - Pasos clave: `npm ci`, cache del cliente Prisma (`node_modules/.prisma`), `npm run test:unit`.
   - Garantiza que los cambios no rompan servicios/controladores que usan mocks.

3. **Full Test Suite** (en `push` y `schedule`)
   - Depende de `Lint`.
   - Arranca un servicio Docker de PostgreSQL (`postgres:15`) expuesto en `localhost:5433`.
   - Variables: `DATABASE_URL=postgres://postgres:postgres@localhost:5433/nuevo_proyecto_test`, `NODE_ENV=test`.
   - Pasos clave:
     1. `npm ci`
     2. Espera activa hasta que la base responda (`pg_isready`).
     3. `npx prisma migrate deploy`
     4. `npm run db:seed`
     5. `npm run test`
   - Cubre specs unitarias y e2e con datos reales y validación de semillas.

## Reproducción local

1. Asegura que tienes PostgreSQL disponible. Puedes usar Docker siguiendo `docs/local-e2e-guide.md`.
2. Instala dependencias: `npm ci`.
3. Aplíca migraciones: `npx prisma migrate deploy` (o `npm run prisma:migrate`).
4. Siembra datos: `npm run db:seed`.
5. Ejecuta las pruebas: `npm run test`.

## Depuración

- **Errores de conexión**: confirma el puerto (`5433` en CI) y credenciales. En GitHub Actions la base usa `POSTGRES_HOST_AUTH_METHOD=trust` para facilitar la autenticación.
- **Fallos en migraciones**: ejecuta `npx prisma migrate status` para detectar migraciones pendientes o corruptas.
- **Flaky e2e**: revisa que `runSeed` no lance excepciones; inspecciona las tablas con `npx prisma studio` o `psql`.
- **Caches**: borra `node_modules/.prisma` si cambiaste el esquema y ejecuta `npm run prisma:generate`.

## Buenas practicas

- Antes de hacer push, corre `npm run lint` y `npm run test` localmente.
- Cuando agregues nuevas dependencias de base de datos, actualiza las semillas para evitar e2e inconsistentes.
- Documenta scripts adicionales en este archivo o en el README para mantener la CI transparente.
