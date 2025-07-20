import Service from "../models/service.model.js";

// Créer un service
export const createService = async (req, res) => {
  try {
    const { name, description, logo, communicationRate } = req.body;
    const service = await Service.create({ name, description, logo, communicationRate });
    res.status(201).json({ success: true, service });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer tous les services (avec recherche + pagination)
export const getAllServices = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    let filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Service.countDocuments(filter);

    const services = await Service.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalServices: total,
      services,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer un service par ID
export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mettre à jour un service
export const updateService = async (req, res) => {
  try {
    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedService) return res.status(404).json({ message: "Service not found" });
    res.json({ success: true, service: updatedService });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Supprimer un service
export const deleteService = async (req, res) => {
  try {
    const deletedService = await Service.findByIdAndDelete(req.params.id);
    if (!deletedService) return res.status(404).json({ message: "Service not found" });
    res.json({ success: true, message: "Service deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
