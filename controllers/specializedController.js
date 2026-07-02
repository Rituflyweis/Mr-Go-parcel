const SpecializedBooking = require("../models/SpecializedBooking");
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
    const booking = await SpecializedBooking.findOne({ _id: req.params.id, customer: req.user._id }).populate("assignedDriver");
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

module.exports = {
  getNEMT, createNEMT, getNotary, createNotary, getMovers, createMovers, getShuttle, createShuttle, updateBooking, deleteBooking,
  createCustomerBooking, getMyBookings, getMyBookingById, cancelMyBooking,
};
