# Guía rápida: Seed + pruebas e2e con Docker

Esta guía explica cómo preparar un entorno local para ejecutar la base de datos PostgreSQL, sembrar datos y correr la suite end-to-end (`test/app.e2e-spec.ts`) sin depender de un servidor externo.

## 1. Requisitos previos

- Docker y Docker Compose instalados.
- Node.js 18+ y npm 9+ (para ejecutar las pruebas).

## 2. Archivo `docker-compose.yml`

En la raíz del repositorio (o dentro de `backend/`), crea un `docker-compose.yml` con lo siguiente:

```yaml
db:
  image: postgres:15
  ports:
    - "5432:5432"
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    POSTGRES_DB: nuevo_proyecto_local
  healthcheck:
    test: ["CMD", "pg_isready", "-U", "postgres"]
    interval: 10s
    timeout: 5s
    retries: 5
  volumes:
    - ./docker/postgres/data:/var/lib/postgresql/data
```

> Puedes ajustar la ruta del volumen o las credenciales si lo necesitas. La carpeta `docker/postgres/data` permitirá persistir datos entre ejecuciones.

## 3. Levantar PostgreSQL

```bash
cd backend
docker compose up -d
```

Confirma que el contenedor está saludable:

```bash
docker compose ps
```

## 4. Configurar `DATABASE_URL`

Crea (o actualiza) tu `.env` en `backend/` con la cadena de conexión local:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/nuevo_proyecto_local
```

## 5. Ejecutar migraciones y seed

Con la base levantada, aplica migraciones y siembra datos iniciales:

```bash
npm run prisma:migrate
npm run db:seed
```

> `npm run db:seed` invoca `prisma/seed.ts`, que expone `runSeed()` para reutilizar en pruebas e2e.

## 6. Ejecutar la suite e2e

```bash
npm run test:e2e
```

- Asegúrate de que `DATABASE_URL` apunta a la base levantada en Docker.
- La suite e2e limpia y repuebla datos vía Prisma antes de cada prueba.

## 7. Detener el entorno

Cuando termines, puedes bajar el contenedor:

```bash
docker compose down
```

Si quieres borrar los datos persistidos, elimina la carpeta `docker/postgres/data`.

---

### Consejos adicionales

- Si necesitas reiniciar el estado rápidamente, puedes ejecutar `npm run db:seed` nuevamente tras `docker compose up -d`.
- Para depurar, puedes conectarte a la base con `psql`:

  ```bash
  docker compose exec db psql -U postgres -d nuevo_proyecto_local
  ```

- Considera agregar este compose a `.gitignore` si creas versiones personalizadas.
