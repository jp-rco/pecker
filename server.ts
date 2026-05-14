import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import FormData from "form-data";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  // 1. API routes go here FIRST
  // n8n Webhook Proxy
  app.post("/api/analyze", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const n8nUrl = process.env.N8N_WEBHOOK_URL;

      // If no n8n URL is provided, we'll return a helpful error or some mock data for development
      if (!n8nUrl) {
        console.warn("N8N_WEBHOOK_URL not configured. Returning mock data.");
        await new Promise(resolve => setTimeout(resolve, 2000));
        return res.json({
          success: true,
          data: {
            summary: "Análisis de nutrición animal completado. Se detectaron optimizaciones en los suplementos proteicos.",
            metrics: [
              { label: "Eficiencia Alimenticia", value: 85, trend: "up" },
              { label: "Costo por Ganancia", value: 1.2, trend: "down" },
              { label: "Salud del Hato", value: 92, trend: "up" }
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
              "El lote B muestra una mejora del 12% en conversión cárnica."
            ]
          }
        });
      }

      // Using form-data package for maximum compatibility in Node.js envs
      const form = new FormData();
      form.append("file", file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await axios.post(n8nUrl, form, {
        headers: {
          ...form.getHeaders(),
        },
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("Error analyzing file:", error.message);
      res.status(500).json({
        error: "Failed to analyze file with n8n",
        details: error.response?.data || error.message
      });
    }
  });

  // 2. Middleware for development vs production
  if (process.env.NODE_ENV === "production" || process.env.VITE_PROD === "true") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Important: API routes must come BEFORE the wildcard catch-all
    app.get("*", (req, res) => {
      // If the request is for an API that doesn't exist, don't serve index.html
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: "API endpoint not found" });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();