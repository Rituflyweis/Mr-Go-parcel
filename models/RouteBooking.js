const mongoose = require("mongoose");

// A rider's reserved seat on a specific RouteRun — bookingCode doubles as the QR
// boarding-pass payload the driver scans to board them.
const routeBookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, unique: true },
    route: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true },
    routeRun: { type: mongoose.Schema.Types.ObjectId, ref: "RouteRun", required: true },
    rider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    boardStop: { type: String },
    status: {
      type: String,
      enum: ["reserved", "boarded", "completed", "cancelled", "no_show"],
      default: "reserved",
    },
    boardedAt: { type: Date },
  },
  { timestamps: true }
);

routeBookingSchema.pre("save", function () {
  if (!this.bookingCode) {
    this.bookingCode = "RTB-" + Date.now().toString().slice(-6) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  }
});

module.exports = mongoose.model("RouteBooking", routeBookingSchema);
