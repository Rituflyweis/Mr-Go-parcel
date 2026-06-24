const mongoose = require("mongoose");

const specializedBookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, unique: true },
    serviceType: {
      type: String,
      enum: ["nemt", "notary", "movers", "shuttle"],
      required: true,
    },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },

    // Common fields
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
    },
    scheduledDate: { type: Date, required: true },
    timeSlot: { type: String }, // "09:00 AM - 11:00 AM"
    cost: { type: Number, default: 0 },
    notes: { type: String },

    // NEMT specific
    patientName: { type: String },
    vehicleType: { type: String, enum: ["wheelchair_van", "ambulatory", "standard_sedan", "stretcher"] },
    medicalNotes: { type: String },
    appointmentLocation: { type: String },

    // Notary specific
    clientName: { type: String },
    serviceSubType: { type: String }, // "Real Estate Closing", "Legal Documents"
    notaryName: { type: String },
    documentType: { type: String },

    // Movers specific
    moveSize: { type: String }, // "1 Bedroom", "2 Bedroom", "4 Bedroom"
    pickupAddress: { type: String },
    deliveryAddress: { type: String },
    crewSize: { type: Number },
    crewName: { type: String },

    // Shuttle specific
    route: { type: String },
    passengers: { type: Number, default: 1 },
    pickupPoint: { type: String },
    dropPoint: { type: String },
    recurrence: { type: String, enum: ["one_time", "daily", "weekly", "monthly"], default: "one_time" },
  },
  { timestamps: true }
);

specializedBookingSchema.pre("save", function (next) {
  if (!this.bookingId) {
    const prefix = { nemt: "NEMT", notary: "NOT", movers: "MOV", shuttle: "SHT" }[this.serviceType] || "SVC";
    this.bookingId = prefix + "-" + Date.now().toString().slice(-4);
  }
  next();
});

module.exports = mongoose.model("SpecializedBooking", specializedBookingSchema);
