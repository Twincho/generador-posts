const express = require("express");
const Groq = require("groq-sdk");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const LIMITE_GRATIS = 3;
const contadorIPs = {};

function obtenerIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
}

app.get("/check-limite", (req, res) => {
  const ip = obtenerIP(req);
  const usadas = contadorIPs[ip] || 0;
  res.json({ usadas, limite: LIMITE_GRATIS, bloqueado: usadas >= LIMITE_GRATIS });
});

app.post("/generar", async (req, res) => {
  const ip = obtenerIP(req);
  const usadas = contadorIPs[ip] || 0;

  if (usadas >= LIMITE_GRATIS) {
    return res.status(403).json({ error: "limite_alcanzado" });
  }

  const { negocio, descripcion, redes } = req.body;

  const prompt = `Sos un experto en marketing digital y redes sociales para negocios latinoamericanos.

El usuario tiene el siguiente negocio: ${negocio}
Descripción adicional: ${descripcion}
Redes donde quiere publicar: ${redes.join(", ")}

Generá posts creativos, atractivos y listos para copiar y pegar. Para cada red social solicitada, creá 2 opciones diferentes.

Formato de respuesta:
- Usá emojis relevantes
- Tono cercano y natural, no corporativo
- Incluí hashtags relevantes al final de cada post
- Separalos claramente con el nombre de la red y "Opción 1" / "Opción 2"`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });
    const text = completion.choices[0].message.content;

    contadorIPs[ip] = usadas + 1;

    res.json({ 
      resultado: text,
      usadas: contadorIPs[ip],
      limite: LIMITE_GRATIS
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al generar los posts" });
  }
});

app.listen(3000, () => {
  console.log("✅ Servidor corriendo en http://localhost:3000");
});

process.on('uncaughtException', (err) => {
  console.error("Error no capturado:", err);
});