const mongoose = require("mongoose");

const specializedBookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, unique: true },
    serviceType: {
      type: String,
      enum: ["nemt", "notary", "movers", "shuttle", "event_transport", "campus_shuttle", "laundry", "tow"],
      required: true,
    },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "SpecializedProvider" }, // notary/mover the customer picked

    // Common fields
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
    },
    // Granular sub-status history for flows that track more than one state between
    // "scheduled" and "completed" (e.g. movers: crew on the way -> arrived -> loading ->
    // en route -> arrived at destination). The customer app's status screens read this
    // instead of just the coarse `status` field.
    statusTimeline: [
      {
        status: { type: String }, // "crew_on_the_way", "arrived", "loading", "en_route", "arrived_destination", "completed"
        note: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    scheduledDate: { type: Date, required: true },
    timeSlot: { type: String }, // "09:00 AM - 11:00 AM"
    cost: { type: Number, default: 0 },
    tip: { type: Number, default: 0 },
    notes: { type: String },
    documents: [{ type: String }], // uploaded document URLs (notary: docs to be notarized; movers: proof photos)

    // NEMT specific
    patientName: { type: String },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" }, // set when an agency/hospital books on behalf of a registered patient
    bookedByAgency: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    vehicleType: { type: String, enum: ["wheelchair_van", "ambulatory", "standard_sedan", "stretcher"] },
    medicalNotes: { type: String },
    appointmentLocation: { type: String },
    mobilityNeeds: { type: String, enum: ["ambulatory", "wheelchair", "stretcher"] },
    boardingAssistance: { type: Boolean, default: false },
    appointmentType: { type: String }, // "Dialysis", "Therapy", "Checkup", etc.
    pickupLocation: { type: String },
    dropoffLocation: { type: String },
    isRoundTrip: { type: Boolean, default: false },
    returnPickupTime: { type: String },
    insuranceBilling: { type: Boolean, default: false },

    // Notary specific
    clientName: { type: String },
    serviceSubType: { type: String }, // "Real Estate Closing", "Legal Documents"
    notaryName: { type: String },
    documentType: { type: String },
    locationType: { type: String, enum: ["home", "office", "hospital", "jail", "retirement_home"] },
    fullAddress: { type: String },
    numberOfSignatures: { type: Number, default: 1 },

    // Movers specific
    moveType: { type: String }, // "Apartment Move", "House Move", "Office Move", "Furniture Move", "Heavy Item Move"
    moveSize: { type: String }, // "1 Bedroom", "2 Bedroom", "4 Bedroom"
    pickupAddress: { type: String },
    deliveryAddress: { type: String },
    pickupAccessType: { type: String, enum: ["stairs", "elevator"] },
    pickupFloor: { type: Number },
    deliveryAccessType: { type: String, enum: ["stairs", "elevator"] },
    deliveryFloor: { type: Number },
    crewSize: { type: Number },
    crewName: { type: String },
    // Room-by-room inventory the customer builds before getting quotes
    inventory: [
      {
        room: { type: String }, // "Living Room", "Bedroom", "Kitchen"
        item: { type: String }, // "Sofa", "Dresser"
        quantity: { type: Number, default: 1 },
        photo: { type: String },
      },
    ],
    damageReport: {
      reported: { type: Boolean, default: false },
      description: { type: String },
      photos: [{ type: String }],
      reportedAt: { type: Date },
    },

    // Shuttle specific
    route: { type: String },
    passengers: { type: Number, default: 1 },
    pickupPoint: { type: String },
    dropPoint: { type: String },
    recurrence: { type: String, enum: ["one_time", "daily", "weekly", "monthly"], default: "one_time" },

    // Event transport / campus shuttle specific
    eventName: { type: String },
    organization: { type: String },

    // Laundry specific
    itemDetails: { type: String },

    // Tow service specific
    vehicleInfo: { type: String },
    breakdownLocation: { type: String },
  },
  { timestamps: true }
);

specializedBookingSchema.pre("save", function () {
  if (!this.bookingId) {
    const prefix = { nemt: "NEMT", notary: "NOT", movers: "MOV", shuttle: "SHT", event_transport: "EVT", campus_shuttle: "CMP", laundry: "LDY", tow: "TOW" }[this.serviceType] || "SVC";
    this.bookingId = prefix + "-" + Date.now().toString().slice(-4);
  }
});

module.exports = mongoose.model("SpecializedBooking", specializedBookingSchema);
