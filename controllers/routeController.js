const Route = require("../models/Route");
const RouteRun = require("../models/RouteRun");
const RouteBooking = require("../models/RouteBooking");
const SpecializedProvider = require("../models/SpecializedProvider");
const { successResponse, errorResponse } = require("../utils/response");

const todayBounds = (dateStr) => {
  const base = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const end = new Date(start.getTime() + 86400000);
  return { start, end };
};

// Looks up a vehicle inside a provider's fleet (SpecializedProvider.vehicles) and
// returns the denormalized {provider, vehicleId, label} to store on a Route, plus
// the vehicle's own passengerCapacity so "Quick Create Route" can auto-fill capacity.
const resolveAssignedVehicle = async (providerId, vehicleId) => {
  if (!providerId || !vehicleId) return null;
  const provider = await SpecializedProvider.findById(providerId);
  const vehicle = provider && provider.vehicles.id(vehicleId);
  if (!vehicle) return { error: "Assigned vehicle not found in that provider's fleet" };
  return { assignedVehicle: { provider: providerId, vehicleId, label: vehicle.name }, passengerCapacity: vehicle.passengerCapacity };
};

// ── RIDER ("Choose Your Route", QR boarding pass) ──────────────────────────────

// @route GET /api/routes?category=campus|corporate&status=active
const getRoutes = async (req, res) => {
  try {
    const { category, status = "active" } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const routes = await Route.find(filter).sort({ name: 1 });
    const { start, end } = todayBounds();

    const routesWithNextRun = await Promise.all(
      routes.map(async (route) => {
        const nextRun = await RouteRun.findOne({
          route: route._id,
          runDate: { $gte: start, $lt: end },
          status: { $in: ["scheduled", "idle", "running"] },
        }).sort({ departureTime: 1 });

        return { ...route.toObject(), nextRun };
      })
    );

    successResponse(res, 200, "Routes fetched", { routes: routesWithNextRun });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/routes/:id
const getRouteById = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) return errorResponse(res, 404, "Route not found");

    const { start, end } = todayBounds(req.query.date);
    const runs = await RouteRun.find({ route: route._id, runDate: { $gte: start, $lt: end } }).sort({ departureTime: 1 });

    successResponse(res, 200, "Route details", { route, runs });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/routes/:id/book
// "Reserve a booking" — seats are capped against route.capacity by counting
// reserved+boarded bookings on that run, not just live QR-scanned occupancy.
const bookRoute = async (req, res) => {
  try {
    const route = await Route.findOne({ _id: req.params.id, status: "active" });
    if (!route) return errorResponse(res, 404, "Route not found or inactive");

    const { runId, boardStop, riderReferenceId } = req.body;
    if (!runId) return errorResponse(res, 422, "runId is required");

    const run = await RouteRun.findOne({ _id: runId, route: route._id, status: { $in: ["scheduled", "idle", "running"] } });
    if (!run) return errorResponse(res, 404, "Scheduled run not found or no longer available");

    const reservedCount = await RouteBooking.countDocuments({ routeRun: run._id, status: { $in: ["reserved", "boarded"] } });
    if (reservedCount >= route.capacity) return errorResponse(res, 409, "This run is fully booked");

    const booking = await RouteBooking.create({ route: route._id, routeRun: run._id, rider: req.user._id, boardStop, riderReferenceId });
    successResponse(res, 201, "Seat reserved — show this boarding pass QR to the driver", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/routes/my-bookings
const getMyRouteBookings = async (req, res) => {
  try {
    const bookings = await RouteBooking.find({ rider: req.user._id })
      .populate("route", "name category")
      .populate("routeRun", "runDate departureTime status")
      .sort({ createdAt: -1 });
    successResponse(res, 200, "My route bookings", { bookings });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/routes/bookings/:id/cancel
const cancelRouteBooking = async (req, res) => {
  try {
    const booking = await RouteBooking.findOne({ _id: req.params.id, rider: req.user._id });
    if (!booking) return errorResponse(res, 404, "Booking not found");
    if (!["reserved"].includes(booking.status)) return errorResponse(res, 400, `Cannot cancel a ${booking.status} booking`);

    booking.status = "cancelled";
    await booking.save();
    successResponse(res, 200, "Booking cancelled", { booking });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── DRIVER ("Run Route", QR scanner, capacity monitoring) ──────────────────────

// @route GET /api/routes/driver/runs?date=
const getMyRuns = async (req, res) => {
  try {
    const { start, end } = todayBounds(req.query.date);
    const runs = await RouteRun.find({ driver: req.user._id, runDate: { $gte: start, $lt: end } })
      .populate("route", "name category capacity stops")
      .sort({ departureTime: 1 });
    successResponse(res, 200, "My runs", { runs });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/routes/driver/runs/:id/start
const startRun = async (req, res) => {
  try {
    const run = await RouteRun.findOne({ _id: req.params.id, driver: req.user._id, status: { $in: ["scheduled", "idle"] } });
    if (!run) return errorResponse(res, 404, "Run not found or not in a startable state");

    run.status = "running";
    run.startedAt = new Date();
    await run.save();
    successResponse(res, 200, "Route started", { run });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/routes/driver/runs/:id/complete
const completeRun = async (req, res) => {
  try {
    const run = await RouteRun.findOne({ _id: req.params.id, driver: req.user._id, status: "running" });
    if (!run) return errorResponse(res, 404, "Run not found or not in progress");

    run.status = "completed";
    run.completedAt = new Date();
    await run.save();
    await RouteBooking.updateMany({ routeRun: run._id, status: "reserved" }, { status: "no_show" });
    successResponse(res, 200, "Route completed", { run });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/routes/driver/runs/:id/scan
// QR scanner — boards a rider and bumps the live "23/40" occupancy counter.
const scanBoardingPass = async (req, res) => {
  try {
    const { bookingCode } = req.body;
    if (!bookingCode) return errorResponse(res, 422, "bookingCode is required");

    const run = await RouteRun.findOne({ _id: req.params.id, driver: req.user._id });
    if (!run) return errorResponse(res, 404, "Run not found");

    const booking = await RouteBooking.findOne({ bookingCode, routeRun: run._id, status: "reserved" });
    if (!booking) return errorResponse(res, 404, "Boarding pass not found, already used, or not for this run");

    const route = await Route.findById(run.route);
    if (run.currentOccupancy >= route.capacity) return errorResponse(res, 409, "Route is at full capacity");

    booking.status = "boarded";
    booking.boardedAt = new Date();
    await booking.save();

    run.currentOccupancy += 1;
    await run.save();

    successResponse(res, 200, "Rider boarded", { booking, currentOccupancy: run.currentOccupancy, capacity: route.capacity });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/routes/driver/runs/:id/stops/:stopIndex/reached
// Driver marks a stop as reached — feeds the "2/3 stops" progress bar and the
// per-stop arrival timestamps on the rider's live route timeline.
const markStopReached = async (req, res) => {
  try {
    const run = await RouteRun.findOne({ _id: req.params.id, driver: req.user._id, status: "running" });
    if (!run) return errorResponse(res, 404, "Run not found or not in progress");

    const stopIndex = Number(req.params.stopIndex);
    if (run.stopProgress.some((s) => s.stopIndex === stopIndex)) {
      return errorResponse(res, 409, "This stop was already marked as reached");
    }

    run.stopProgress.push({ stopIndex, reachedAt: new Date() });
    await run.save();
    successResponse(res, 200, "Stop marked as reached", { run });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/routes/driver/runs/:id/manifest
const getRunManifest = async (req, res) => {
  try {
    const run = await RouteRun.findOne({ _id: req.params.id, driver: req.user._id });
    if (!run) return errorResponse(res, 404, "Run not found");

    const bookings = await RouteBooking.find({ routeRun: run._id, status: { $ne: "cancelled" } })
      .populate("rider", "name phone")
      .sort({ createdAt: 1 });

    successResponse(res, 200, "Run manifest", { run, bookings });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// ── ADMIN (Route management, Fleet & scheduling, Analytics) ────────────────────

// @route POST /api/routes/admin
const createRoute = async (req, res) => {
  try {
    const {
      name, category, organization, stops, capacity, estimatedDurationMinutes, frequencyMinutes, scheduleTimes, provider,
      assignedVehicleProvider, assignedVehicleId,
    } = req.body;
    if (!name || !category) return errorResponse(res, 422, "name and category are required");

    let assignedVehicle;
    if (assignedVehicleProvider && assignedVehicleId) {
      const resolved = await resolveAssignedVehicle(assignedVehicleProvider, assignedVehicleId);
      if (resolved?.error) return errorResponse(res, 404, resolved.error);
      assignedVehicle = resolved?.assignedVehicle;
    }

    const route = await Route.create({
      name, category, organization, stops: stops || [], capacity,
      estimatedDurationMinutes, frequencyMinutes, scheduleTimes: scheduleTimes || [], provider, assignedVehicle,
    });
    successResponse(res, 201, "Route created", { route });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/routes/admin/quick-create
// "Quick Create Route" — just a name + an operator's fleet vehicle; capacity is
// auto-filled from the vehicle's passengerCapacity so the admin doesn't have to
// re-enter it, and stops/schedule can be filled in later via Update Route.
const quickCreateRoute = async (req, res) => {
  try {
    const { name, category, assignedVehicleProvider, assignedVehicleId } = req.body;
    if (!name || !category) return errorResponse(res, 422, "name and category are required");
    if (!assignedVehicleProvider || !assignedVehicleId) return errorResponse(res, 422, "assignedVehicleProvider and assignedVehicleId are required");

    const resolved = await resolveAssignedVehicle(assignedVehicleProvider, assignedVehicleId);
    if (resolved?.error) return errorResponse(res, 404, resolved.error);

    const route = await Route.create({
      name, category,
      assignedVehicle: resolved.assignedVehicle,
      capacity: resolved.passengerCapacity || undefined,
      provider: assignedVehicleProvider,
    });
    successResponse(res, 201, "Route created", { route });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

const ROUTE_ALLOWED_FIELDS = ["name", "category", "organization", "status", "stops", "capacity", "estimatedDurationMinutes", "frequencyMinutes", "scheduleTimes", "provider"];

// @route PUT /api/routes/admin/:id
const updateRoute = async (req, res) => {
  try {
    const updates = {};
    ROUTE_ALLOWED_FIELDS.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    const { assignedVehicleProvider, assignedVehicleId } = req.body;
    if (assignedVehicleProvider && assignedVehicleId) {
      const resolved = await resolveAssignedVehicle(assignedVehicleProvider, assignedVehicleId);
      if (resolved?.error) return errorResponse(res, 404, resolved.error);
      updates.assignedVehicle = resolved.assignedVehicle;
    }

    const route = await Route.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!route) return errorResponse(res, 404, "Route not found");
    successResponse(res, 200, "Route updated", { route });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route DELETE /api/routes/admin/:id
// Soft-delete — routes accumulate run/booking history, so deactivate rather than remove.
const deactivateRoute = async (req, res) => {
  try {
    const route = await Route.findByIdAndUpdate(req.params.id, { status: "inactive" }, { new: true });
    if (!route) return errorResponse(res, 404, "Route not found");
    successResponse(res, 200, "Route deactivated", { route });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/routes/admin
const getRoutesAdmin = async (req, res) => {
  try {
    const { category, status } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const routes = await Route.find(filter).populate("provider", "name phone").sort({ createdAt: -1 });
    successResponse(res, 200, "Routes fetched", { routes, total: routes.length });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route POST /api/routes/admin/:id/runs
// Fleet & Scheduling — schedule one departure (date + time + assigned driver) for a route.
const createRun = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) return errorResponse(res, 404, "Route not found");

    const { runDate, departureTime, driver } = req.body;
    if (!runDate || !departureTime) return errorResponse(res, 422, "runDate and departureTime are required");

    const run = await RouteRun.create({ route: route._id, runDate, departureTime, driver, status: driver ? "idle" : "scheduled" });
    successResponse(res, 201, "Run scheduled", { run });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/routes/admin/runs/:id/assign-driver
const assignDriverToRun = async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return errorResponse(res, 422, "driverId is required");

    const run = await RouteRun.findByIdAndUpdate(req.params.id, { driver: driverId, status: "idle" }, { new: true });
    if (!run) return errorResponse(res, 404, "Run not found");
    successResponse(res, 200, "Driver assigned", { run });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route GET /api/routes/admin/analytics?from=&to=
// Admin Control dashboard — active routes, riders served, completed runs, utilization rate.
const getRouteAnalytics = async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 86400000);
    const to = req.query.to ? new Date(req.query.to) : new Date();

    const [activeRoutes, totalRiders, completedRuns, utilizationAgg] = await Promise.all([
      Route.countDocuments({ status: "active" }),
      RouteBooking.countDocuments({ status: { $in: ["boarded", "completed"] }, createdAt: { $gte: from, $lte: to } }),
      RouteRun.countDocuments({ status: "completed", runDate: { $gte: from, $lte: to } }),
      RouteRun.aggregate([
        { $match: { status: "completed", runDate: { $gte: from, $lte: to } } },
        { $lookup: { from: "routes", localField: "route", foreignField: "_id", as: "routeInfo" } },
        { $unwind: "$routeInfo" },
        { $project: { occupancyRate: { $divide: ["$currentOccupancy", "$routeInfo.capacity"] } } },
        { $group: { _id: null, avgUtilization: { $avg: "$occupancyRate" } } },
      ]),
    ]);

    successResponse(res, 200, "Route analytics", {
      activeRoutes,
      totalRiders,
      completedRuns,
      utilizationRate: Math.round((utilizationAgg[0]?.avgUtilization || 0) * 100),
    });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = {
  getRoutes, getRouteById, bookRoute, getMyRouteBookings, cancelRouteBooking,
  getMyRuns, startRun, completeRun, scanBoardingPass, getRunManifest, markStopReached,
  createRoute, quickCreateRoute, updateRoute, deactivateRoute, getRoutesAdmin, createRun, assignDriverToRun, getRouteAnalytics,
};
