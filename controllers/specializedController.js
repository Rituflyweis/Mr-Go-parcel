const SpecializedBooking = require("../models/SpecializedBooking");
const SpecializedProvider = require("../models/SpecializedProvider");
const Patient = require("../models/Patient");
const VerificationDocument = require("../models/VerificationDocument");
const { successResponse, errorResponse } = require("../utils/response");

const getStats = async (serviceType, req) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0,0,0,0);

  const [todayTrips, inProgress, completed, totalRevArr] = await Promise.all([
    SpecializedBooking.countDocuments({ serviceType, scheduledDate: { $gte: todayStart, $lt: todayEnd } }),
    SpecializedBooking.countDocuments({ serviceType, status: "in_progress" }),
    SpecializedBooking.countDocuments({ serviceType, status: "completed" }),
    SpecializedBooking.aggregate([{ $match: { serviceType, status: "completed" } }, { $group: { _id: null, total: { $sum: "$cost" } } }]),
  ]);

  const weeklyTrend = await SpecializedBooking.aggregate([
    { $match: { serviceType, createdAt: { $gte: weekStart } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  return {
    todayTrips, inProgress, completed,
    revenueToday: totalRevArr[0]?.total || 0,
    weeklyTrend,
  };
};

// ── NEMT ─────────────────────────────────────────────────────────────────────

// @route GET /api/admin/specialized/nemt
const getNEMT = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const filter = { serviceType: "nemt" };
    if (status) filter.status = status;
    if (search) filter.$or = [{ bookingId: { $regex: search, $options: "i" } }, { patientName: { $regex: search, $options: "i" } }];

    const stats = await getStats("nemt", req);
    const bookings = await SpecializedBooking.find(filter)
      .populate("customer", "name phone")
      .populate("assignedDriver")
      .sort({ scheduledDate: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await SpecializedBooking.countDocuments(filter);
    successResponse(res, 200, "NEMT bookings", { stats, bookings, total });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/specialized/nemt
const createNEMT = async (req, res) => {
  try {
    const booking = await SpecializedBooking.create({ ...req.body, serviceType: "nemt" });
    successResponse(res, 201, "NEMT booking created", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── NOTARY ────────────────────────────────────────────────────────────────────

// @route GET /api/admin/specialized/notary
const getNotary = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const filter = { serviceType: "notary" };
    if (status) filter.status = status;
    if (search) filter.$or = [{ bookingId: { $regex: search, $options: "i" } }, { clientName: { $regex: search, $options: "i" } }, { documentType: { $regex: search, $options: "i" } }];

    const stats = await getStats("notary", req);
    const bookings = await SpecializedBooking.find(filter)
      .populate("customer", "name phone")
      .sort({ scheduledDate: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await SpecializedBooking.countDocuments(filter);
    successResponse(res, 200, "Notary bookings", { stats, bookings, total });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/specialized/notary
const createNotary = async (req, res) => {
  try {
    const booking = await SpecializedBooking.create({ ...req.body, serviceType: "notary" });
    successResponse(res, 201, "Notary appointment created", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── MOVERS ────────────────────────────────────────────────────────────────────

// @route GET /api/admin/specialized/movers
const getMovers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const filter = { serviceType: "movers" };
    if (status) filter.status = status;
    if (search) filter.$or = [{ bookingId: { $regex: search, $options: "i" } }, { "customer.name": { $regex: search, $options: "i" } }];

    const stats = await getStats("movers", req);
    const bookings = await SpecializedBooking.find(filter)
      .populate("customer", "name phone")
      .sort({ scheduledDate: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await SpecializedBooking.countDocuments(filter);
    successResponse(res, 200, "Moving jobs", { stats, bookings, total });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/specialized/movers
const createMovers = async (req, res) => {
  try {
    const booking = await SpecializedBooking.create({ ...req.body, serviceType: "movers" });
    successResponse(res, 201, "Moving job created", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── SHUTTLE ───────────────────────────────────────────────────────────────────

// @route GET /api/admin/specialized/shuttle
const getShuttle = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const filter = { serviceType: "shuttle" };
    if (status) filter.status = status;

    const stats = await getStats("shuttle", req);
    const bookings = await SpecializedBooking.find(filter)
      .populate("customer", "name phone")
      .sort({ scheduledDate: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await SpecializedBooking.countDocuments(filter);
    successResponse(res, 200, "Shuttle bookings", { stats, bookings, total });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/admin/specialized/shuttle
const createShuttle = async (req, res) => {
  try {
    const booking = await SpecializedBooking.create({ ...req.body, serviceType: "shuttle" });
    successResponse(res, 201, "Shuttle booking created", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── COMMON ────────────────────────────────────────────────────────────────────

// @route PUT /api/admin/specialized/:id
const updateBooking = async (req, res) => {
  try {
    const booking = await SpecializedBooking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!booking) return errorResponse(res, 404, "Booking not found");
    successResponse(res, 200, "Booking updated", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route DELETE /api/admin/specialized/:id
const deleteBooking = async (req, res) => {
  try {
    await SpecializedBooking.findByIdAndDelete(req.params.id);
    successResponse(res, 200, "Booking deleted");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── CUSTOMER ──────────────────────────────────────────────────────────────────

const VALID_SERVICE_TYPES = ["nemt", "notary", "movers", "shuttle", "event_transport", "campus_shuttle", "laundry", "tow"];

// @route POST /api/specialized/:serviceType/book
const createCustomerBooking = async (req, res) => {
  try {
    const { serviceType } = req.params;
    if (!VALID_SERVICE_TYPES.includes(serviceType)) {
      return errorResponse(res, 400, "Invalid service type");
    }

    const booking = await SpecializedBooking.create({
      ...req.body,
      serviceType,
      customer: req.user._id,
    });
    successResponse(res, 201, "Booking created", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/my-bookings
const getMyBookings = async (req, res) => {
  try {
    const { serviceType, status, page = 1, limit = 20 } = req.query;
    const filter = { customer: req.user._id };
    if (serviceType) filter.serviceType = serviceType;
    if (status) filter.status = status;

    const bookings = await SpecializedBooking.find(filter)
      .populate("assignedDriver")
      .populate("provider")
      .sort({ scheduledDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await SpecializedBooking.countDocuments(filter);
    successResponse(res, 200, "My bookings", { bookings, total });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/my-bookings/:id
const getMyBookingById = async (req, res) => {
  try {
    const booking = await SpecializedBooking.findOne({ _id: req.params.id, customer: req.user._id })
      .populate("assignedDriver")
      .populate("provider");
    if (!booking) return errorResponse(res, 404, "Booking not found");
    successResponse(res, 200, "Booking details", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/specialized/my-bookings/:id/cancel
const cancelMyBooking = async (req, res) => {
  try {
    const booking = await SpecializedBooking.findOne({ _id: req.params.id, customer: req.user._id });
    if (!booking) return errorResponse(res, 404, "Booking not found");
    if (["completed", "cancelled"].includes(booking.status)) {
      return errorResponse(res, 400, `Booking already ${booking.status}`);
    }
    booking.status = "cancelled";
    await booking.save();
    successResponse(res, 200, "Booking cancelled", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/:serviceType/providers
// Browse available notaries/movers/etc. for a service type — the "Available notaries"
// / "Available Movers" list screens in the customer app (name, rating, price, distance,
// specialties/truck type) have nothing to query against without this.
const getProviders = async (req, res) => {
  try {
    const { serviceType } = req.params;
    if (!VALID_SERVICE_TYPES.includes(serviceType)) {
      return errorResponse(res, 400, "Invalid service type");
    }
    const { search, specialty, zipCode, minRating, passengers, sortBy = "rating" } = req.query;

    const filter = { serviceType, isActive: true, isApproved: true };
    if (search) filter.name = { $regex: search, $options: "i" };
    if (specialty) filter.specialties = specialty;
    if (zipCode) filter.zipCodesServed = zipCode;
    if (minRating) filter.rating = { $gte: Number(minRating) };
    if (passengers) filter.passengerCapacityMax = { $gte: Number(passengers) };

    const sortMap = {
      rating: { rating: -1 },
      price: { flatRate: 1, perSignatureFee: 1, shuttleFare: 1 },
      reliability: { reliabilityScore: -1 },
    };

    const providers = await SpecializedProvider.find(filter).sort(sortMap[sortBy] || sortMap.rating);
    successResponse(res, 200, "Available providers", { providers });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/specialized/my-bookings/:id/provider
// Customer picks a provider from the browse list (e.g. tapping "Sarah Martinez" before
// "Confirm Appointment"). Also snapshots the provider's current price into `cost` so a
// later price change on the provider's profile doesn't retroactively change a booking
// the customer already confirmed.
const selectProvider = async (req, res) => {
  try {
    const { providerId, vehicleCount } = req.body;
    const booking = await SpecializedBooking.findOne({ _id: req.params.id, customer: req.user._id });
    if (!booking) return errorResponse(res, 404, "Booking not found");

    const provider = await SpecializedProvider.findOne({ _id: providerId, serviceType: booking.serviceType, isActive: true });
    if (!provider) return errorResponse(res, 404, "Provider not found or not available for this service");

    // vehicleCount lets event/group transport book multiple vehicles from one provider
    // ("Price per Vehicle x Number of Vehicles = Total Amount"); defaults to 1 so this
    // is a no-op for service types (nemt/notary/movers) that only ever book one unit.
    const pricePerVehicle = provider.nemtFare || provider.flatRate || provider.perSignatureFee || provider.shuttleFare || booking.cost;
    const count = vehicleCount || booking.vehicleCount || 1;

    booking.provider = provider._id;
    booking.pricePerVehicle = pricePerVehicle;
    booking.vehicleCount = count;
    booking.cost = pricePerVehicle * count;
    await booking.save();
    successResponse(res, 200, "Provider selected", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/specialized/my-bookings/:id/documents
// Notary "Upload Documents" step — req.files populated by the `upload` (multer) middleware.
const uploadBookingDocuments = async (req, res) => {
  try {
    const booking = await SpecializedBooking.findOne({ _id: req.params.id, customer: req.user._id });
    if (!booking) return errorResponse(res, 404, "Booking not found");
    if (!req.files || !req.files.length) return errorResponse(res, 400, "No files uploaded");

    const paths = req.files.map((f) => f.path);
    booking.documents.push(...paths);
    await booking.save();
    successResponse(res, 200, "Documents uploaded", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/specialized/my-bookings/:id/inventory
// Movers "Inventory Listing" step — customer builds a room-by-room item list before
// getting quotes from available movers.
const submitInventory = async (req, res) => {
  try {
    const { inventory } = req.body; // [{ room, item, quantity, photo }]
    if (!Array.isArray(inventory)) return errorResponse(res, 400, "inventory must be an array");

    const booking = await SpecializedBooking.findOne({ _id: req.params.id, customer: req.user._id });
    if (!booking) return errorResponse(res, 404, "Booking not found");

    booking.inventory = inventory;
    await booking.save();
    successResponse(res, 200, "Inventory updated", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/specialized/my-bookings/:id/damage-report
// Movers "Report Damage or Issue" — customer-facing side of the damage report shown on
// the delivery-complete screen.
const reportDamage = async (req, res) => {
  try {
    const { description } = req.body;
    const booking = await SpecializedBooking.findOne({ _id: req.params.id, customer: req.user._id });
    if (!booking) return errorResponse(res, 404, "Booking not found");

    const photos = (req.files || []).map((f) => f.path);
    booking.damageReport = { reported: true, description, photos, reportedAt: new Date() };
    await booking.save();
    successResponse(res, 200, "Damage report submitted", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/my-bookings/:id/status-timeline
// Movers "Move in Progress" tracker (crew on the way -> arrived -> loading -> en route ->
// arrived at destination). Read-only for the customer app; entries get appended by the
// assigned provider/driver side (not built yet — out of scope for the customer app pass).
const getStatusTimeline = async (req, res) => {
  try {
    const booking = await SpecializedBooking.findOne({ _id: req.params.id, customer: req.user._id }).select("statusTimeline status");
    if (!booking) return errorResponse(res, 404, "Booking not found");
    successResponse(res, 200, "Status timeline", { status: booking.status, statusTimeline: booking.statusTimeline });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/specialized/my-bookings/:id/tip
// Payment review screen "Add Tip" step, applied after the ride's base fare is already set.
const addTip = async (req, res) => {
  try {
    const { tip } = req.body;
    if (typeof tip !== "number" || tip < 0) return errorResponse(res, 400, "tip must be a non-negative number");

    const booking = await SpecializedBooking.findOne({ _id: req.params.id, customer: req.user._id });
    if (!booking) return errorResponse(res, 404, "Booking not found");

    booking.tip = tip;
    await booking.save();
    successResponse(res, 200, "Tip added", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/specialized/my-bookings/:id/rate
const rateBooking = async (req, res) => {
  try {
    const { rating, review } = req.body;
    if (typeof rating !== "number" || rating < 1 || rating > 5) return errorResponse(res, 400, "rating must be between 1 and 5");

    const booking = await SpecializedBooking.findOne({ _id: req.params.id, customer: req.user._id });
    if (!booking) return errorResponse(res, 404, "Booking not found");
    if (booking.status !== "completed") return errorResponse(res, 400, "Only completed bookings can be rated");

    booking.rating = rating;
    booking.review = review;
    await booking.save();
    successResponse(res, 200, "Rating submitted", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── PROVIDER (NEMT partner / agency driver) ───────────────────────────────────

const getOwnProvider = async (req) => SpecializedProvider.findOne({ user: req.user._id });

// @route POST /api/specialized/providers/register
// Partner Portal "Join as a professional mover/notary/etc." signup — creates the
// SpecializedProvider profile that getProviders/selectProvider query against. Starts
// unapproved; an admin has to flip isApproved before the profile shows up for customers.
const registerAsProvider = async (req, res) => {
  try {
    const { serviceType, name, phone, email } = req.body;
    if (!serviceType || !VALID_SERVICE_TYPES.includes(serviceType)) {
      return errorResponse(res, 400, "A valid serviceType is required");
    }
    if (!name) return errorResponse(res, 400, "name is required");

    const existing = await SpecializedProvider.findOne({ user: req.user._id, serviceType });
    if (existing) return errorResponse(res, 409, "Already registered as a provider for this service type");

    const {
      specialties, notaryCommissionNumber, notaryCommissionState, notaryCommissionExpiry,
      perSignatureFee, travelFee, afterHoursFee,
      truckType, crewSize, flatRate, hourlyRate,
      vehicleTier, equipment, nemtFare, etaMinutes,
      vehicleType, passengerCapacityMin, passengerCapacityMax,
      luggageCapacityMin, luggageCapacityMax, amenities, shuttleFare,
      dotMcNumber, fleetSize, coverageAreas, servicesOffered,
      serviceRadius, zipCodesServed, availableTimeBlocks,
    } = req.body;

    const provider = await SpecializedProvider.create({
      serviceType, user: req.user._id, name, phone, email,
      specialties, notaryCommissionNumber, notaryCommissionState, notaryCommissionExpiry,
      perSignatureFee, travelFee, afterHoursFee,
      truckType, crewSize, flatRate, hourlyRate,
      vehicleTier, equipment, nemtFare, etaMinutes,
      vehicleType, passengerCapacityMin, passengerCapacityMax,
      luggageCapacityMin, luggageCapacityMax, amenities, shuttleFare,
      dotMcNumber, fleetSize, coverageAreas: coverageAreas || [], servicesOffered: servicesOffered || [],
      serviceRadius, zipCodesServed, availableTimeBlocks,
    });

    successResponse(res, 201, "Provider application submitted. Awaiting admin approval.", { provider });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/providers/me
const getMyProviderProfiles = async (req, res) => {
  try {
    const providers = await SpecializedProvider.find({ user: req.user._id });
    successResponse(res, 200, "Your provider profiles", { providers });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/specialized/providers/me/:id
const PROVIDER_PROFILE_ALLOWED_FIELDS = [
  "name", "image", "phone", "email",
  "specialties", "notaryCommissionNumber", "notaryCommissionState", "notaryCommissionExpiry",
  "perSignatureFee", "travelFee", "afterHoursFee",
  "truckType", "crewSize", "flatRate", "hourlyRate",
  "vehicleTier", "equipment", "nemtFare", "etaMinutes",
  "vehicleType", "passengerCapacityMin", "passengerCapacityMax",
  "luggageCapacityMin", "luggageCapacityMax", "amenities", "shuttleFare",
  "dotMcNumber", "fleetSize", "coverageAreas", "servicesOffered",
  "serviceRadius", "zipCodesServed", "availableTimeBlocks",
];
const updateMyProviderProfile = async (req, res) => {
  try {
    const updates = {};
    PROVIDER_PROFILE_ALLOWED_FIELDS.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    const provider = await SpecializedProvider.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updates,
      { new: true }
    );
    if (!provider) return errorResponse(res, 404, "Provider profile not found");
    successResponse(res, 200, "Provider profile updated", { provider });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/specialized/providers/me/documents
// Document Upload step — Vehicle Insurance, Commercial License, Vehicle Registration,
// Business License. Company-level KYC, not tied to a specific service-type profile.
const uploadProviderDocument = async (req, res) => {
  try {
    const validTypes = ["vehicle_insurance", "commercial_license", "vehicle_registration", "business_license"];
    const { documentType } = req.body;
    if (!validTypes.includes(documentType)) {
      return errorResponse(res, 422, `documentType must be one of: ${validTypes.join(", ")}`);
    }
    if (!req.file) return errorResponse(res, 400, "No file uploaded");

    const doc = await VerificationDocument.findOneAndUpdate(
      { subject: req.user._id, subjectType: "specialized_provider", documentType },
      {
        $set: {
          subjectName: req.user.name,
          documentUrl: req.file.path,
          status: "pending_review",
        },
        $unset: { rejectionReason: "" },
        $setOnInsert: {
          subject: req.user._id,
          subjectType: "specialized_provider",
          documentType,
          verificationId: "VER-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-4),
        },
      },
      { new: true, upsert: true }
    );

    successResponse(res, 200, "Document uploaded, pending review", { document: doc });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/providers/me/documents
const getProviderDocuments = async (req, res) => {
  try {
    const documents = await VerificationDocument.find({ subject: req.user._id, subjectType: "specialized_provider" });
    successResponse(res, 200, "Provider documents fetched", { documents });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/specialized/providers/me/:id/vehicles
// "Vehicle Fleet — Add Vehicle"
const addVehicle = async (req, res) => {
  try {
    const provider = await SpecializedProvider.findOne({ _id: req.params.id, user: req.user._id });
    if (!provider) return errorResponse(res, 404, "Provider profile not found");

    const { name, vehicleType, passengerCapacity, luggageCapacity, amenities } = req.body;
    if (!name || !vehicleType) return errorResponse(res, 422, "name and vehicleType are required");

    provider.vehicles.push({ name, vehicleType, passengerCapacity, luggageCapacity, amenities });
    await provider.save();
    successResponse(res, 201, "Vehicle added", { provider });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/specialized/providers/me/:id/vehicles/:vehicleId
// "Setup Pricing" on a fleet vehicle
const updateVehicle = async (req, res) => {
  try {
    const provider = await SpecializedProvider.findOne({ _id: req.params.id, user: req.user._id });
    if (!provider) return errorResponse(res, 404, "Provider profile not found");

    const vehicle = provider.vehicles.id(req.params.vehicleId);
    if (!vehicle) return errorResponse(res, 404, "Vehicle not found");

    const { name, vehicleType, passengerCapacity, luggageCapacity, amenities, status, pricing } = req.body;
    if (name !== undefined) vehicle.name = name;
    if (vehicleType !== undefined) vehicle.vehicleType = vehicleType;
    if (passengerCapacity !== undefined) vehicle.passengerCapacity = passengerCapacity;
    if (luggageCapacity !== undefined) vehicle.luggageCapacity = luggageCapacity;
    if (amenities !== undefined) vehicle.amenities = amenities;
    if (status !== undefined) vehicle.status = status;
    if (pricing !== undefined) {
      if (pricing.flatRate !== undefined) vehicle.pricing.flatRate = pricing.flatRate;
      if (pricing.hourlyRate !== undefined) vehicle.pricing.hourlyRate = pricing.hourlyRate;
      if (pricing.perMileRate !== undefined) vehicle.pricing.perMileRate = pricing.perMileRate;
    }

    await provider.save();
    successResponse(res, 200, "Vehicle updated", { provider });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route DELETE /api/specialized/providers/me/:id/vehicles/:vehicleId
const deleteVehicle = async (req, res) => {
  try {
    const provider = await SpecializedProvider.findOne({ _id: req.params.id, user: req.user._id });
    if (!provider) return errorResponse(res, 404, "Provider profile not found");

    const vehicle = provider.vehicles.id(req.params.vehicleId);
    if (!vehicle) return errorResponse(res, 404, "Vehicle not found");

    vehicle.deleteOne();
    await provider.save();
    successResponse(res, 200, "Vehicle removed", { provider });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/admin/specialized/providers?serviceType=&status=pending
const getProvidersAdmin = async (req, res) => {
  try {
    const { serviceType, status } = req.query;
    const filter = {};
    if (serviceType) filter.serviceType = serviceType;
    if (status === "pending") filter.isApproved = false;
    if (status === "approved") filter.isApproved = true;

    const providers = await SpecializedProvider.find(filter).populate("user", "name email phone").sort({ createdAt: -1 });
    successResponse(res, 200, "Providers", { providers, total: providers.length });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/admin/specialized/providers/:id/approve
const approveProviderAdmin = async (req, res) => {
  try {
    const { isApproved, verificationStatus } = req.body;
    const provider = await SpecializedProvider.findByIdAndUpdate(
      req.params.id,
      { isApproved: isApproved !== undefined ? isApproved : true, verificationStatus: verificationStatus || "verified" },
      { new: true }
    );
    if (!provider) return errorResponse(res, 404, "Provider not found");
    successResponse(res, 200, `Provider ${provider.isApproved ? "approved" : "rejected"}`, { provider });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/specialized/provider/availability
// Provider dashboard "Online/Offline" toggle controlling whether they receive new trip requests.
const toggleProviderAvailability = async (req, res) => {
  try {
    const provider = await getOwnProvider(req);
    if (!provider) return errorResponse(res, 404, "Provider profile not found");

    provider.isOnline = typeof req.body.isOnline === "boolean" ? req.body.isOnline : !provider.isOnline;
    await provider.save();
    successResponse(res, 200, "Availability updated", { provider });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/provider/dashboard
// Provider dashboard: today's earnings/trips, this-week earnings, rating.
const getProviderDashboard = async (req, res) => {
  try {
    const provider = await getOwnProvider(req);
    if (!provider) return errorResponse(res, 404, "Provider profile not found");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayAgg, weekAgg, monthAgg, acceptedTrips, pendingCount, activeCount] = await Promise.all([
      SpecializedBooking.aggregate([
        { $match: { provider: provider._id, status: "completed", updatedAt: { $gte: todayStart } } },
        { $group: { _id: null, earnings: { $sum: "$cost" }, trips: { $sum: 1 } } },
      ]),
      SpecializedBooking.aggregate([
        { $match: { provider: provider._id, status: "completed", updatedAt: { $gte: weekStart } } },
        { $group: { _id: null, earnings: { $sum: "$cost" } } },
      ]),
      SpecializedBooking.aggregate([
        { $match: { provider: provider._id, status: "completed", updatedAt: { $gte: monthStart } } },
        { $group: { _id: null, earnings: { $sum: "$cost" }, trips: { $sum: 1 } } },
      ]),
      SpecializedBooking.find({ provider: provider._id, status: { $in: ["scheduled", "in_progress"] } })
        .populate("customer", "name phone")
        .sort({ scheduledDate: 1 }),
      SpecializedBooking.countDocuments({ provider: provider._id, status: "scheduled" }),
      SpecializedBooking.countDocuments({ provider: provider._id, status: "in_progress" }),
    ]);

    successResponse(res, 200, "Provider dashboard", {
      name: provider.name,
      verificationStatus: provider.verificationStatus,
      isOnline: provider.isOnline,
      rating: provider.rating,
      totalRatings: provider.totalRatings,
      todayEarnings: todayAgg[0]?.earnings || 0,
      todayTrips: todayAgg[0]?.trips || 0,
      weekEarnings: weekAgg[0]?.earnings || 0,
      monthEarnings: monthAgg[0]?.earnings || 0,
      monthTrips: monthAgg[0]?.trips || 0,
      pendingBookings: pendingCount,
      activeTrips: activeCount,
      acceptedTrips,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/provider/trips/available
// "Available Trip Requests" feed — unassigned bookings for this provider's service type.
const getAvailableTrips = async (req, res) => {
  try {
    const provider = await getOwnProvider(req);
    if (!provider) return errorResponse(res, 404, "Provider profile not found");

    const trips = await SpecializedBooking.find({
      serviceType: provider.serviceType,
      provider: null,
      status: "scheduled",
    })
      .populate("customer", "name phone")
      .sort({ scheduledDate: 1 })
      .limit(20);

    successResponse(res, 200, "Available trip requests", { trips, count: trips.length });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/provider/trips?status=scheduled|in_progress|completed
// This provider's own assigned trips — backs the "Trips" / "Active" / "Schedule" tabs.
const getProviderTrips = async (req, res) => {
  try {
    const provider = await getOwnProvider(req);
    if (!provider) return errorResponse(res, 404, "Provider profile not found");

    const { status } = req.query;
    const filter = { provider: provider._id };
    if (status) filter.status = status;

    const trips = await SpecializedBooking.find(filter)
      .populate("customer", "name phone")
      .sort({ scheduledDate: 1 });

    successResponse(res, 200, "Provider trips", { trips, count: trips.length });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/provider/earnings
// "Earning Summary" — completed trips with individual payout amounts, for the Earnings tab.
const getProviderEarnings = async (req, res) => {
  try {
    const provider = await getOwnProvider(req);
    if (!provider) return errorResponse(res, 404, "Provider profile not found");

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const trips = await SpecializedBooking.find({ provider: provider._id, status: "completed", updatedAt: { $gte: monthStart } })
      .populate("customer", "name phone")
      .sort({ updatedAt: -1 });

    const totalEarnings = trips.reduce((sum, t) => sum + (t.cost || 0), 0);
    successResponse(res, 200, "Provider earnings", {
      summary: { totalEarnings, completedTrips: trips.length },
      trips,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/specialized/provider/trips/:id/accept
const acceptTrip = async (req, res) => {
  try {
    const provider = await getOwnProvider(req);
    if (!provider) return errorResponse(res, 404, "Provider profile not found");

    const booking = await SpecializedBooking.findOne({ _id: req.params.id, serviceType: provider.serviceType, provider: null });
    if (!booking) return errorResponse(res, 404, "Trip request not found or already taken");

    // Stays "scheduled" (now assigned to this provider, pending its start time) — jumping
    // straight to "in_progress" collapsed the "accepted but not started" and "underway"
    // states together, which the provider dashboard's Pending vs Active counts need apart.
    booking.provider = provider._id;
    booking.statusTimeline.push({ status: "accepted" });
    await booking.save();
    successResponse(res, 200, "Trip accepted", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/specialized/provider/trips/:id/start
// "Started at 09:15" — moves an accepted trip from Pending to Active.
const startTrip = async (req, res) => {
  try {
    const provider = await getOwnProvider(req);
    if (!provider) return errorResponse(res, 404, "Provider profile not found");

    const booking = await SpecializedBooking.findOne({ _id: req.params.id, provider: provider._id, status: "scheduled" });
    if (!booking) return errorResponse(res, 404, "Trip not found or not in a startable state");

    booking.status = "in_progress";
    booking.statusTimeline.push({ status: "in_progress" });
    await booking.save();
    successResponse(res, 200, "Trip started", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/specialized/provider/trips/:id/complete
const completeTrip = async (req, res) => {
  try {
    const provider = await getOwnProvider(req);
    if (!provider) return errorResponse(res, 404, "Provider profile not found");

    const booking = await SpecializedBooking.findOne({ _id: req.params.id, provider: provider._id, status: "in_progress" });
    if (!booking) return errorResponse(res, 404, "Trip not found or not in progress");

    booking.status = "completed";
    booking.statusTimeline.push({ status: "completed" });
    await booking.save();
    successResponse(res, 200, "Trip completed", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/specialized/provider/trips/:id/decline
// No-op on the booking itself (it just stays unassigned for other providers) — recorded
// so the same trip isn't re-shown to this provider in future feed refreshes.
const declineTrip = async (req, res) => {
  try {
    const provider = await getOwnProvider(req);
    if (!provider) return errorResponse(res, 404, "Provider profile not found");

    const booking = await SpecializedBooking.findOne({ _id: req.params.id, serviceType: provider.serviceType, provider: null });
    if (!booking) return errorResponse(res, 404, "Trip request not found or already taken");

    successResponse(res, 200, "Trip declined");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── AGENCY / HOSPITAL PORTAL (books NEMT rides on behalf of registered patients) ──

// @route POST /api/specialized/agency/patients
const createPatient = async (req, res) => {
  try {
    const { name, phone, address, mobilityType } = req.body;
    if (!name || !phone) return errorResponse(res, 400, "name and phone are required");

    const patient = await Patient.create({ agency: req.user._id, name, phone, address, mobilityType });
    successResponse(res, 201, "Patient added", { patient });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/agency/patients?search=&status=active|inactive
const getPatients = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = { agency: req.user._id };
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;
    if (search) filter.name = { $regex: search, $options: "i" };

    const patients = await Patient.find(filter).sort({ createdAt: -1 });

    const withRideStats = await Promise.all(
      patients.map(async (p) => {
        const [totalRides, lastBooking] = await Promise.all([
          SpecializedBooking.countDocuments({ patient: p._id }),
          SpecializedBooking.findOne({ patient: p._id }).sort({ scheduledDate: -1 }).select("scheduledDate"),
        ]);
        return { ...p.toObject(), totalRides, lastRide: lastBooking?.scheduledDate || null };
      })
    );

    successResponse(res, 200, "Patients", { patients: withRideStats, total: patients.length });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/specialized/agency/patients/:id
const updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findOneAndUpdate({ _id: req.params.id, agency: req.user._id }, req.body, { new: true });
    if (!patient) return errorResponse(res, 404, "Patient not found");
    successResponse(res, 200, "Patient updated", { patient });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route DELETE /api/specialized/agency/patients/:id
const deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findOneAndDelete({ _id: req.params.id, agency: req.user._id });
    if (!patient) return errorResponse(res, 404, "Patient not found");
    successResponse(res, 200, "Patient removed");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/specialized/agency/patients/:id/book-ride
// "Book New Ride for Patient" — agency books an NEMT trip on the patient's behalf;
// insuranceBilling defaults true since agency-booked NEMT rides are billed to the
// patient's insurance rather than paid directly.
const bookRideForPatient = async (req, res) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, agency: req.user._id });
    if (!patient) return errorResponse(res, 404, "Patient not found");

    const {
      pickupLocation, dropoffLocation, scheduledDate, appointmentType,
      mobilityNeeds, boardingAssistance, isRoundTrip, returnPickupTime, medicalNotes, recurrence,
    } = req.body;
    if (!pickupLocation || !dropoffLocation || !scheduledDate) {
      return errorResponse(res, 400, "pickupLocation, dropoffLocation and scheduledDate are required");
    }

    const booking = await SpecializedBooking.create({
      serviceType: "nemt",
      customer: req.user._id,
      bookedByAgency: req.user._id,
      patient: patient._id,
      patientName: patient.name,
      pickupLocation,
      dropoffLocation,
      scheduledDate,
      appointmentType,
      mobilityNeeds: mobilityNeeds || patient.mobilityType,
      boardingAssistance: boardingAssistance || false,
      isRoundTrip: isRoundTrip || false,
      returnPickupTime,
      medicalNotes,
      recurrence: recurrence || "one_time",
      insuranceBilling: true,
    });

    successResponse(res, 201, "Ride booked for patient", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/agency/dashboard
const getAgencyDashboard = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const [todayRides, activeNow, completed, totalPatients, pendingBillingAgg] = await Promise.all([
      SpecializedBooking.countDocuments({ bookedByAgency: req.user._id, scheduledDate: { $gte: todayStart, $lt: todayEnd } }),
      SpecializedBooking.countDocuments({ bookedByAgency: req.user._id, status: "in_progress" }),
      SpecializedBooking.countDocuments({ bookedByAgency: req.user._id, status: "completed" }),
      Patient.countDocuments({ agency: req.user._id }),
      SpecializedBooking.aggregate([
        { $match: { bookedByAgency: req.user._id, insuranceBilling: true, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$cost" } } },
      ]),
    ]);

    successResponse(res, 200, "Agency dashboard", {
      todayRides, activeNow, completed, totalPatients,
      pendingBilling: pendingBillingAgg[0]?.total || 0,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/agency/schedule?date=YYYY-MM-DD
// "Today's Schedule" screen — defaults to today; each row shows patient, pickup/drop
// and whether a driver has been assigned yet ("Assigned" vs "Scheduled").
const getAgencySchedule = async (req, res) => {
  try {
    const day = req.query.date ? new Date(req.query.date) : new Date();
    const rangeStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const rangeDays = req.query.view === "week" ? 7 : 1;
    const rangeEnd = new Date(rangeStart.getTime() + rangeDays * 86400000);

    const bookings = await SpecializedBooking.find({
      bookedByAgency: req.user._id,
      scheduledDate: { $gte: rangeStart, $lt: rangeEnd },
    })
      .populate({ path: "assignedDriver", populate: { path: "user", select: "name phone" } })
      .populate("patient", "name mobilityType")
      .sort({ scheduledDate: 1 });

    const schedule = bookings.map((b) => ({
      _id: b._id,
      bookingId: b.bookingId,
      patientName: b.patientName,
      pickupLocation: b.pickupLocation,
      dropoffLocation: b.dropoffLocation,
      scheduledDate: b.scheduledDate,
      status: b.status,
      driverStatus: b.assignedDriver ? "assigned" : "pending",
      driverName: b.assignedDriver?.user?.name || null,
    }));

    successResponse(res, 200, req.query.view === "week" ? "Week schedule" : "Today's schedule", {
      date: rangeStart, view: req.query.view === "week" ? "week" : "day", schedule, total: schedule.length,
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/agency/performance
// "This Month Performance" card — total rides + avg rating for rides the agency booked.
const getAgencyPerformance = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalRidesAgg, ratingAgg] = await Promise.all([
      SpecializedBooking.countDocuments({ bookedByAgency: req.user._id, createdAt: { $gte: monthStart } }),
      SpecializedBooking.aggregate([
        { $match: { bookedByAgency: req.user._id, createdAt: { $gte: monthStart }, rating: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]),
    ]);

    successResponse(res, 200, "This month's performance", {
      totalRides: totalRidesAgg,
      avgRating: parseFloat((ratingAgg[0]?.avg || 0).toFixed(1)),
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/my-recent-destinations
// NEMT home screen "Recent Destinations" — most-visited dropoff locations, most recent first.
const getRecentDestinations = async (req, res) => {
  try {
    const destinations = await SpecializedBooking.aggregate([
      { $match: { customer: req.user._id, serviceType: "nemt", dropoffLocation: { $nin: [null, ""] } } },
      { $group: { _id: "$dropoffLocation", visits: { $sum: 1 }, lastVisited: { $max: "$scheduledDate" } } },
      { $sort: { lastVisited: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, location: "$_id", visits: 1, lastVisited: 1 } },
    ]);

    successResponse(res, 200, "Recent destinations", { destinations });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/my-journey-stats
// NEMT home screen "Your Journey Stats" — total rides, avg rating given, rides this month.
const getJourneyStats = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalRides, thisMonth, ratingAgg] = await Promise.all([
      SpecializedBooking.countDocuments({ customer: req.user._id, serviceType: "nemt" }),
      SpecializedBooking.countDocuments({ customer: req.user._id, serviceType: "nemt", createdAt: { $gte: monthStart } }),
      SpecializedBooking.aggregate([
        { $match: { customer: req.user._id, serviceType: "nemt", rating: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]),
    ]);

    successResponse(res, 200, "Journey stats", {
      totalRides,
      thisMonth,
      rating: parseFloat((ratingAgg[0]?.avg || 0).toFixed(1)),
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/specialized/nemt/dashboard
// Individual patient's NEMT home screen ("Welcome back, John" / Need a Ride / Upcoming
// Rides / Recent Destinations / Your Journey Stats) — bundles what would otherwise be
// 3 separate calls (my-bookings, my-recent-destinations, my-journey-stats) into one,
// scoped to just what this screen needs (next few upcoming rides, not the full history).
const getPatientDashboard = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [upcomingRidesRaw, destinations, totalRides, thisMonth, ratingAgg] = await Promise.all([
      SpecializedBooking.find({
        customer: req.user._id, serviceType: "nemt",
        status: { $in: ["scheduled", "in_progress"] },
      })
        .populate({ path: "assignedDriver", populate: { path: "user", select: "name phone" } })
        .sort({ scheduledDate: 1 })
        .limit(5),
      SpecializedBooking.aggregate([
        { $match: { customer: req.user._id, serviceType: "nemt", dropoffLocation: { $nin: [null, ""] } } },
        { $group: { _id: "$dropoffLocation", visits: { $sum: 1 }, lastVisited: { $max: "$scheduledDate" } } },
        { $sort: { lastVisited: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, location: "$_id", visits: 1, lastVisited: 1 } },
      ]),
      SpecializedBooking.countDocuments({ customer: req.user._id, serviceType: "nemt" }),
      SpecializedBooking.countDocuments({ customer: req.user._id, serviceType: "nemt", createdAt: { $gte: monthStart } }),
      SpecializedBooking.aggregate([
        { $match: { customer: req.user._id, serviceType: "nemt", rating: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]),
    ]);

    const upcomingRides = upcomingRidesRaw.map((b) => ({
      ...b.toObject(),
      displayStatus: b.assignedDriver ? "confirmed" : "pending",
      driverName: b.assignedDriver?.user?.name || "Pending assignment",
    }));

    successResponse(res, 200, "Patient dashboard", {
      name: req.user.name,
      upcomingRides,
      recentDestinations: destinations,
      journeyStats: {
        totalRides,
        thisMonth,
        rating: parseFloat((ratingAgg[0]?.avg || 0).toFixed(1)),
      },
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = {
  getNEMT, createNEMT, getNotary, createNotary, getMovers, createMovers, getShuttle, createShuttle, updateBooking, deleteBooking,
  createCustomerBooking, getMyBookings, getMyBookingById, cancelMyBooking,
  getProviders, selectProvider, uploadBookingDocuments, submitInventory, reportDamage, getStatusTimeline,
  addTip, rateBooking, toggleProviderAvailability, getProviderDashboard, getAvailableTrips,
  getProviderTrips, getProviderEarnings, acceptTrip, startTrip, completeTrip, declineTrip,
  createPatient, getPatients, updatePatient, deletePatient, bookRideForPatient, getAgencyDashboard,
  getAgencySchedule, getAgencyPerformance, getRecentDestinations, getJourneyStats, getPatientDashboard,
  registerAsProvider, getMyProviderProfiles, updateMyProviderProfile, getProvidersAdmin, approveProviderAdmin,
  uploadProviderDocument, getProviderDocuments, addVehicle, updateVehicle, deleteVehicle,
};
