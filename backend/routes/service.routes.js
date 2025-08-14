import { Router } from "express";
import Service from "../models/Service.js";
import { auth } from "../middleware/auth.js";
import { permit } from "../middleware/roles.js";

const router = Router();

// Public: list active services
router.get("/", async (_req, res) => {
  const services = await Service.find({ active: true }).sort({ createdAt: -1 });
  res.json(services);
});

// Admin: create
router.post("/", auth, permit("admin"), async (req, res) => {
  try {
    const s = await Service.create(req.body);
    res.status(201).json(s);
  } catch {
    res.status(400).json({ message: "Invalid service data" });
  }
});

// Admin: update
router.put("/:id", auth, permit("admin"), async (req, res) => {
  const s = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!s) return res.status(404).json({ message: "Not found" });
  res.json(s);
});

// Admin: delete (soft deactivate)
router.delete("/:id", auth, permit("admin"), async (req, res) => {
  const s = await Service.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!s) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deactivated", service: s });
});

export default router;
