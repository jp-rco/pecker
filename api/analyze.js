import axios from "axios";
import FormData from "form-data";
import { IncomingForm } from "formidable";
import { createReadStream } from "fs";

// Disable Vercel's default body parser so we can handle multipart ourselves
export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 300, // Allow up to 5 minutes for slow n8n workflows (Vercel max is 300s on Pro, 60s on Hobby)
};

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ keepExtensions: true });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { files } = await parseForm(req);

    const uploadedFile = files.file;
    const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const n8nUrl = process.env.N8N_WEBHOOK_URL;

    if (!n8nUrl) {
      console.warn("N8N_WEBHOOK_URL not configured. Returning mock data.");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return res.json({
        success: true,
        data: {
          summary:
            "Análisis de nutrición animal completado. Se detectaron optimizaciones en los suplementos proteicos.",
          metrics: [
            { label: "Eficiencia Alimenticia", value: 85, trend: "up" },
            { label: "Costo por Ganancia", value: 1.2, trend: "down" },
            { label: "Salud del Hato", value: 92, trend: "up" },
          ],
          chartData: [
            { month: "Ene", proteina: 400, energia: 240, salud: 240 },
            { month: "Feb", proteina: 300, energia: 139, salud: 221 },
            { month: "Mar", proteina: 200, energia: 980, salud: 229 },
            { month: "Abr", proteina: 278, energia: 390, salud: 200 },
            { month: "May", proteina: 189, energia: 480, salud: 218 },
            { month: "Jun", proteina: 239, energia: 380, salud: 250 },
          ],
          importantInsights: [
            "Aumentar suplemento mineral en vacas gestantes.",
            "Reducir desperdicio de forraje en un 5% mediante silos optimizados.",
            "El lote B muestra una mejora del 12% en conversión cárnica.",
          ],
        },
      });
    }

    // Forward the file to n8n
    const form = new FormData();
    form.append("file", createReadStream(file.filepath), {
      filename: file.originalFilename || "upload",
      contentType: file.mimetype || "application/octet-stream",
    });

    const response = await axios.post(n8nUrl, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 600000, // 10 minutes in milliseconds
    });

    return res.json(response.data);
  } catch (error) {
    console.error("Error analyzing file:", error.message);
    return res.status(500).json({
      error: "Failed to analyze file with n8n",
      details: error.response?.data || error.message,
    });
  }
}
