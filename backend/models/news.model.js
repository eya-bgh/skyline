import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    image: {
      type: String,
      default: "default.jpg",
    },
    date: {
      type: Date,
      default: Date.now, // <-- Date actuelle par défaut
    },
  },
  { timestamps: true }
);

export default mongoose.model("News", newsSchema);
