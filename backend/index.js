import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { connectdb } from "./db/connectdb.js";

import authRoutes from "./routes/auth.route.js";
import newsRoutes from "./routes/news.route.js";
import serviceRoutes from "./routes/service.route.js";



dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json()); // Pour parser JSON
app.use(cookieParser()); // Pour cookies

// Pour servir les images si tu fais des uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/services", serviceRoutes);

// Lancer serveur uniquement si MongoDB est connecté
const startServer = async () => {
  try {
    await connectdb(); // Connexion DB
    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to database:", error.message);
    process.exit(1); // Arrête le serveur si DB down
  }
};

startServer();
