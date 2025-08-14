import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    date: { type: String, required: true },     // e.g. "2025-08-20"
    time: { type: String, required: true },     // e.g. "14:30"
    status: { type: String, enum: ["booked", "completed", "canceled"], default: "booked" },
    notes: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);
