import { Controller, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const serverStart = Date.now();

@Controller()
export class AppController {
  @Get()
  async getStatus() {

    const version = "v1.0.0";

    const uptimeMs = Date.now() - serverStart;
    const uptimeSec = Math.floor(uptimeMs / 1000);
    const hours = String(Math.floor(uptimeSec / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((uptimeSec % 3600) / 60)).padStart(2, '0');
    const seconds = String(uptimeSec % 60).padStart(2, '0');
    const uptimeFormatted = `${hours}:${minutes}:${seconds}`;

    let dbStatus = "Connected";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "Error";
    }

    // 🔽🔽🔽 PEGÁ ACÁ TU LINK REAL DEL APK 🔽🔽🔽
    const APK_URL = "https://expo.dev/accounts/xxwmanu/projects/sudo/builds/168ad1eb-9f2b-4ac5-a572-24bcaab9c7c6";

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>SUDO — Backend & Descarga</title>

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
      min-height: 100vh;
      animation: fadeIn 1.2s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    h1 { margin-top: 20px; }

    iframe {
      margin-top: 15px;
      border-radius: 10px;
    }

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
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      width: 300px;
      line-height: 1.8;
      font-size: 1.05rem;
    }

    .label { color: #ccc; }

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
    }

    .btn {
      margin-top: 18px;
      padding: 12px 22px;
      border: none;
      background: #00ff66;
      color: #000;
      font-weight: bold;
      font-size: 1rem;
      border-radius: 10px;
      cursor: pointer;
      text-decoration: none;
    }

    .btn:hover {
      background: #00cc55;
    }

    .hint {
      margin-top: 10px;
      font-size: 0.85rem;
      color: #aaa;
      text-align: center;
      max-width: 300px;
    }
  </style>
</head>

<body>

  <iframe 
    src="https://expo.dev/accounts/xxwmanu/projects/sudo/builds/168ad1eb-9f2b-4ac5-a572-24bcaab9c7c6"
    height="550"
    width="450"
    frameborder="0"
    scrolling="no">
  </iframe>

  <h1>🚀 Backend en Producción</h1>

  <div class="status-bar"><div class="status-fill"></div></div>
  <div class="status-text">STATUS: OK</div>

  <div class="panel">
    <div><span class="label">Versión:</span> ${version}</div>
    <div><span class="label">Uptime:</span> ${uptimeFormatted}</div>
    <div><span class="label">Base de Datos:</span> ${dbStatus}</div>
  </div>

  <!-- 🔽 DESCARGA APK -->
  <a class="btn" href="${APK_URL}" download>⬇ Descargar APK (Android)</a>

  <div class="hint">
    Android puede pedir permiso para instalar apps desconocidas.<br/>
    iOS no permite instalación por archivo.
  </div>

  <div class="clock-container">
    <div class="clock" id="clock"></div>
    <div class="tz">🇦🇷 (ARG)</div>
  </div>

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
