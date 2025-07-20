import express from "express";
import upload from "../middleware/Upload.js";
import {
  createNews,
  getAllNews,
  getNewsById,
  updateNews,
  deleteNews,
  getNewsCount
} from "../controllers/news.controller.js";

const router = express.Router();

// CRUD
router.get("/", getAllNews);
router.get("/count", getNewsCount);
router.get("/:id", getNewsById);
router.post("/", upload.single("image"), createNews);
router.put("/:id", upload.single("image"), updateNews);
router.delete("/:id", deleteNews);

export default router;
