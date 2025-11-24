# Backend Nuevo Proyecto

Esqueleto inicial del backend construido con NestJS y Prisma.

## Requisitos
- Node.js 18+
- npm 9+
- PostgreSQL 14+
- Redis (opcional por ahora)

## Configuración inicial
1. Clona el repositorio y ve al directorio `backend/`.
2. Copia `.env.example` a `.env` y actualiza las variables según tu entorno.
3. Instala dependencias:
   ```bash
   npm install
   ```
4. Genera el cliente de Prisma y corre migraciones iniciales:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
   Cuando sincronices cambios desde main ejecuta también `npx prisma migrate deploy` para aplicar nuevas migraciones en tu base local antes de correr pruebas.
5. Ejecuta el servidor en modo desarrollo:
   ```bash
   npm run start:dev
   ```

La API expone inicialmente módulos de autenticación y reservas.

## Scripts útiles
- `npm run start`: ejecuta la versión compilada.
- `npm run start:dev`: modo desarrollo con recarga automática.
- `npm run build`: compila a JavaScript en `dist/`.
- `npm run lint`: ejecuta ESLint.
- `npm run format`: aplica Prettier a los archivos fuente.
- `npm run test`: ejecuta Jest (pruebas unitarias + e2e).
- `npm run test:unit`: ejecuta únicamente specs unitarias dentro de `src/` (usa `--testPathPattern`).
- `npm run test:e2e`: ejecuta solo la suite e2e (`--runTestsByPath`).
- `npm run db:seed`: repuebla datos de ejemplo usando `prisma/seed.ts`.

## Estructura
```
src/
  auth/               # Controlador y servicio de autenticación
  bookings/           # Endpoints básicos de reservas
  config/             # Configuración centralizada via @nestjs/config
  prisma/             # Wrapper PrismaService para acceder a la base
  common/             # DTOs y utilidades compartidas
```

## Integración continua

El repositorio usa GitHub Actions (`.github/workflows/ci.yml`). El pipeline se activa en:

- Push a `master`.
- Pull requests dirigidos a cualquier rama.
- Un cron diario a las 06:00 UTC para revisar que `master` sigue compilando.

El flujo ejecuta tres trabajos encadenados:

1. **Lint**: instala dependencias y corre `npm run lint`.
2. **Unit Tests**: se ejecuta en pull requests y lanza `npm run test:unit`.
3. **Full Test Suite**: corre en push/cron, monta PostgreSQL con Docker, migra la base (`npx prisma migrate deploy`), la siembra (`npm run db:seed`) y finalmente dispara `npm run test`.

Para depurar fallos localmente puedes reproducir cada paso con los mismos comandos. Si la última etapa falla por conexión a PostgreSQL, asegúrate de que `DATABASE_URL` apunta a una base alcanzable (consulta `docs/local-e2e-guide.md`).

Más detalles en `docs/ci-pipeline.md`.

## Próximos pasos
- Implementar emisión real de JWT y estrategia de guardas.
- Completar flujos de bookings (filtros, cancelación, asignación de profesional).
- Añadir módulos para pagos, notificaciones y administración según el OpenAPI.

## Guía rápida de pruebas

- **Unitarias (rápidas)**: Archivos `*.spec.ts` dentro de `src/**`. Usan mocks en memoria
   para cubrir servicios y controladores sin tocar la base de datos. Ejemplos:
   - `src/bookings/bookings.service.spec.ts`: verifica paginación y mapeo.
   - `src/bookings/bookings.controller.spec.ts`: comprueba delegación con servicios simulados
      y propagación de errores (`NotFoundException`).
   - `src/payments/payments.service.spec.ts`: asegura normalización de decimales y mayúsculas.

- **End-to-end (más lentas)**: Ubicadas en `test/**`. Se apoyan en Prisma y el seed para
   validar flujos reales vía HTTP. Ejecutan el servidor Nest embebido, generan llaves RSA
   temporales para JWT y hacen peticiones con Supertest (no necesitas provisionar archivos de
   claves manualmente para ejecutar las suites).
   - `test/auth/register.e2e-spec.ts`: registra un usuario real, reutiliza el token emitido y prueba login + fallos de contraseña.
   - `test/auth/login.e2e-spec.ts`: usa un usuario sembrado para validar credenciales válidas, inválidas y correas inexistentes.
   - `test/app.e2e-spec.ts`: levanta datos completos con `runSeed`, registra un cliente, autentica al admin semilla y verifica `/services`, `/bookings` y `/payments` con tokens emitidos por el sistema.

- **Semillas de datos**: El script `prisma/seed.ts` expone `runSeed()` para reutilizar datos
   consistentes en e2e y CI. Las pruebas e2e lo invocan antes de cada suite y, en combinación
   con Prisma, aseguran que los usuarios (incluido el admin) tengan hashes `bcrypt` válidos para
   las autenticaciones.

- **Entorno local con Docker**: consulta `docs/local-e2e-guide.md` para levantar PostgreSQL vía
   Docker Compose, ejecutar migraciones/seed y correr la suite e2e conectada a ese contenedor.

- **Buenas prácticas**:
   1. Mockea dependencias externas (PrismaService, servicios ajenos) en unitarias con `useValue`.
   2. Usa `expect(...).rejects` para afirmar propagación de errores en controladores y servicios.
   3. Mantén los DTOs con pruebas de validación (`src/payments/dto/create-payment.dto.spec.ts`) que cubran
       rutas negativas de normalización.
   4. Corre `npm test` antes de subir cambios; Jest ya ejecuta tanto specs unitarias como e2e.
