const mongoose = require("mongoose");

// Fixed-loop shuttle route (campus / corporate park) — "Choose Your Route" screen.
// Distinct from SpecializedBooking's point-to-point shuttle: many riders share seats
// on the same scheduled run instead of booking a dedicated pickup/drop.
const routeSchema = new mongoose.Schema(
  {
    routeId: { type: String, unique: true },
    name: { type: String, required: true }, // "Campus Loop - North"
    category: { type: String, enum: ["campus", "corporate"], required: true },
    organization: { type: String }, // university / corporate park name
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    stops: [{
      name: { type: String, required: true }, // "Main Gate", "Engineering Building"
      order: { type: Number, required: true },
      etaOffsetMinutes: { type: Number, default: 0 }, // minutes after departure
    }],
    capacity: { type: Number, default: 40 },
    estimatedDurationMinutes: { type: Number },
    frequencyMinutes: { type: Number }, // loop interval, e.g. every 45 min
    scheduleTimes: [{ type: String }], // explicit departures, e.g. ["08:00 AM", "08:45 AM"]
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "SpecializedProvider" }, // operator running this route

    // "Vehicle: BUS-001" on the admin route list — points at a specific vehicle inside
    // the operator's fleet (SpecializedProvider.vehicles subdocument). label is a
    // snapshot of that vehicle's name so the list can render without an extra join.
    assignedVehicle: {
      provider: { type: mongoose.Schema.Types.ObjectId, ref: "SpecializedProvider" },
      vehicleId: { type: mongoose.Schema.Types.ObjectId },
      label: { type: String },
    },
  },
  { timestamps: true }
);

routeSchema.pre("save", function () {
  if (!this.routeId) {
    this.routeId = "RT-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-4);
  }
});

module.exports = mongoose.model("Route", routeSchema);
