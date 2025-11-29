import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getStatus() {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Backend - En Producción</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #111;
            color: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: start;
            padding-top: 20px;
            text-align: center;
            height: 100vh;
          }

          h1 {
            margin-top: 20px;
          }

          iframe {
            margin-top: 15px;
            border-radius: 10px;
          }

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
        </style>
      </head>

      <body>

        <!-- ⭐ IFRAME DE PINTEREST -->
        <iframe 
          src="https://assets.pinterest.com/ext/embed.html?id=2040762328782497" 
          height="550" 
          width="450" 
          frameborder="0" 
          scrolling="no">
        </iframe>

        <h1>🚀 Backend en Producción</h1>

        <!-- ⭐ RELOJ -->
        <div class="clock-container">
          <div class="clock" id="clock"></div>
          <div class="tz">(ARG)</div>
        </div>

        <script>
          function updateClock() {
            const now = new Date();

            // Formato 24h con ceros adelante
            const hours   = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');

            document.getElementById('clock').textContent =
              \`\${hours}:\${minutes}:\${seconds}\`;
          }

          setInterval(updateClock, 1000);
          updateClock();
        </script>

      </body>
      </html>
    `;
  }
}
