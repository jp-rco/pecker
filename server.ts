import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

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
       // Return a mock result for demonstration if n8n is not configured
       // This allows the UI to be tested even without the n8n backend ready
       console.warn("N8N_WEBHOOK_URL not configured. Returning mock data.");
       
       // Simulate processing time
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

    // Prepare form data for n8n
    const formData = new FormData();
    const blob = new Blob([file.buffer], { type: file.mimetype });
    formData.append("file", blob, file.originalname);

    const response = await axios.post(n8nUrl, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error analyzing file:", error);
    res.status(500).json({ error: "Failed to analyze file with n8n" });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
