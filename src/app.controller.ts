import { Controller, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const serverStart = Date.now(); // Para calcular uptime

@Controller()
export class AppController {
  @Get()
  async getStatus() {

    // Version del backend (CAMBIAR ACÁ si querés)
    const version = "v1.0.0";

    // Uptime real
    const uptimeMs = Date.now() - serverStart;
    const uptimeSec = Math.floor(uptimeMs / 1000);
    const hours = String(Math.floor(uptimeSec / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((uptimeSec % 3600) / 60)).padStart(2, '0');
    const seconds = String(uptimeSec % 60).padStart(2, '0');
    const uptimeFormatted = `${hours}:${minutes}:${seconds}`;

    // Estado real de DB
    let dbStatus = "Connected";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "Error";
    }

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Backend - En Producción</title>

        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            color: #fff;
            background: linear-gradient(135deg, #0d0d0d, #1a1a1a, #111);
            display: flex;
            flex-direction: column;
            align-items: center;
            animation: fadeIn 1.2s ease-in-out;
            min-height: 100vh;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          h1 {
            margin-top: 20px;
          }

          iframe {
            margin-top: 15px;
            border-radius: 10px;
          }

          /* STATUS BAR */
          .status-bar {
            margin-top: 20px;
            width: 240px;
            background: #003300;
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid #00aa00;
          }

          .status-fill {
            width: 100%;
            height: 25px;
            background: #00ff00;
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0% { opacity: 0.8; }
            50% { opacity: 1; }
            100% { opacity: 0.8; }
          }

          .status-text {
            text-align: center;
            margin-top: 5px;
            font-weight: bold;
            color: #00ff00;
          }

          .panel {
            margin-top: 25px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            backdrop-filter: blur(6px);
            width: 280px;
            text-align: left;
            line-height: 1.8;
            font-size: 1.1rem;
          }

          .label {
            color: #ccc;
          }

          /* RELOJ */
          .clock-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 25px;
          }

          .clock {
            font-size: 3rem;
            font-weight: bold;
            letter-spacing: 2px;
          }

          .tz {
            font-size: 1.2rem;
            color: #ccc;
            margin-top: 5px;
            letter-spacing: 2px;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .flag {
            font-size: 1.5rem;
          }

          /* BOTON */
          .btn {
            margin-top: 20px;
            padding: 10px 20px;
            border: none;
            background: #00c3ff;
            color: #000;
            font-weight: bold;
            font-size: 1rem;
            border-radius: 8px;
            cursor: pointer;
          }

          .btn:hover {
            background: #0099cc;
          }
        </style>
      </head>

      <body>

        <!-- IFRAME -->
        <iframe 
          src="https://assets.pinterest.com/ext/embed.html?id=2040762328782497"
          height="550"
          width="450"
          frameborder="0"
          scrolling="no">
        </iframe>

        <h1>🚀 Backend en Producción</h1>

        <!-- STATUS BAR -->
        <div class="status-bar">
          <div class="status-fill"></div>
        </div>
        <div class="status-text">STATUS: OK</div>

        <!-- PANEL DE INFORMACIÓN -->
        <div class="panel">
          <div><span class="label">Versión:</span> ${version}</div>
          <div><span class="label">Uptime:</span> ${uptimeFormatted}</div>
          <div><span class="label">Base de Datos:</span> ${dbStatus}</div>
        </div>

        <!-- RELOJ -->
        <div class="clock-container">
          <div class="clock" id="clock"></div>
          <div class="tz">
            <span class="flag">🇦🇷</span> (ARG)
          </div>
        </div>

        <!-- Botón refrescar -->
        <button class="btn" onclick="location.reload()">Refrescar estado</button>

        <script>
          function updateClock() {
            const now = new Date();

            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');

            document.getElementById('clock').textContent = \`\${h}:\${m}:\${s}\`;
          }

          setInterval(updateClock, 1000);
          updateClock();
        </script>

      </body>
      </html>
    `;
  }
}
