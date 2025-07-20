import News from "../models/news.model.js";

// Create
export const createNews = async (req, res) => {
  try {
    const { title, description, author, category } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    const image = req.file ? `/uploads/news/${req.file.filename}` : "";

    const news = await News.create({ title, description, author, category, image });
    res.status(201).json(news);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Read (with search, month & pagination)
export const getAllNews = async (req, res) => {
  try {
    const { search, month, page = 1, limit = 10 } = req.query;

    let filter = {};

    // Search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by month
    if (month) {
      const [year, m] = month.split("-");
      const startDate = new Date(year, m - 1, 1);
      const endDate = new Date(year, m, 1);
      filter.createdAt = { $gte: startDate, $lt: endDate };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await News.countDocuments(filter);
    const news = await News.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ news, totalPages: Math.ceil(total / limit), currentPage: parseInt(page) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Read one
export const getNewsById = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ message: "News not found" });
    res.json(news);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update
export const updateNews = async (req, res) => {
  try {
    const { title, description, author, category } = req.body;
    const image = req.file ? `/uploads/news/${req.file.filename}` : undefined;

    const updatedData = { title, description, author, category };
    if (image) updatedData.image = image;

    const news = await News.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    if (!news) return res.status(404).json({ message: "News not found" });

    res.json(news);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete
export const deleteNews = async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);
    if (!news) return res.status(404).json({ message: "News not found" });
    res.json({ message: "News deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Count
export const getNewsCount = async (req, res) => {
  try {
    const count = await News.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
