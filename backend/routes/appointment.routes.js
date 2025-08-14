import { Router } from "express";
import Appointment from "../models/Appointment.js";
import { auth } from "../middleware/auth.js";
import { permit } from "../middleware/roles.js";

const router = Router();

// Customer: create appointment
router.post("/", auth, async (req, res) => {
  const { service, date, time, notes } = req.body;
  if (!service || !date || !time) return res.status(400).json({ message: "Missing fields" });

  const appt = await Appointment.create({
    user: req.user._id,
    service,
    date,
    time,
    notes: notes || ""
  });
  res.status(201).json(appt);
});

// Customer: my appointments
router.get("/mine", auth, async (req, res) => {
  const list = await Appointment.find({ user: req.user._id })
    .populate("service")
    .sort({ createdAt: -1 });
  res.json(list);
});

// Admin: all appointments
router.get("/", auth, permit("admin"), async (_req, res) => {
  const all = await Appointment.find().populate("user").populate("service").sort({ createdAt: -1 });
  res.json(all);
});

// Admin: update status
router.put("/:id/status", auth, permit("admin"), async (req, res) => {
  const { status } = req.body;
  if (!["booked", "completed", "canceled"].includes(status))
    return res.status(400).json({ message: "Invalid status" });

  const appt = await Appointment.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!appt) return res.status(404).json({ message: "Not found" });
  res.json(appt);
});

export default router;
