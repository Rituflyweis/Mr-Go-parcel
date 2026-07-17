const mongoose = require("mongoose");

// A single scheduled departure of a Route on a given day — "Campus Loop - North · 8:00 AM"
// on the Driver Dashboard. Admin schedules these (Fleet & Scheduling); the driver starts/
// completes them; currentOccupancy is the live "23/40" count from QR boarding scans.
const routeRunSchema = new mongoose.Schema(
  {
    route: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    runDate: { type: Date, required: true },
    departureTime: { type: String, required: true }, // "08:00 AM"
    status: {
      type: String,
      enum: ["scheduled", "idle", "running", "completed", "cancelled"],
      default: "scheduled",
    },
    currentOccupancy: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

routeRunSchema.index({ route: 1, runDate: 1, departureTime: 1 });

module.exports = mongoose.model("RouteRun", routeRunSchema);
