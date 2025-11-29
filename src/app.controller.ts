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
            justify-content: center;
            height: 100vh;
            text-align: center;
          }
          .clock {
            font-size: 3rem;
            margin-top: 20px;
          }
          iframe {
            margin-bottom: 30px;
            border-radius: 12px;
          }
        </style>
      </head>
      <body>

        <!-- ⭐ Tu iframe de Pinterest -->
        <iframe 
          src="https://assets.pinterest.com/ext/embed.html?id=2040762328782497" 
          height="550" 
          width="450" 
          frameborder="0" 
          scrolling="no">
        </iframe>

        <h1>🚀 Backend en Producción</h1>
        <div class="clock" id="clock"></div>

        <script>
          function updateClock() {
            const now = new Date();
            const time = now.toLocaleTimeString();
            document.getElementById('clock').textContent = time;
          }
          setInterval(updateClock, 1000);
          updateClock();
        </script>

      </body>
      </html>
    `;
  }
}
