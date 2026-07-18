const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  getRoutes, getRouteById, bookRoute, getMyRouteBookings, cancelRouteBooking,
  getMyRuns, startRun, completeRun, scanBoardingPass, getRunManifest, markStopReached,
  createRoute, quickCreateRoute, updateRoute, deactivateRoute, getRoutesAdmin, createRun, assignDriverToRun, getRouteAnalytics,
} = require("../controllers/routeController");

const adminOnly = [protect, authorize("admin")];

// ── Rider — "Choose Your Route" / QR boarding pass ──────────────────────────────
router.get("/my-bookings", protect, getMyRouteBookings);
router.put("/bookings/:id/cancel", protect, cancelRouteBooking);

// ── Driver — "Run Route" / QR scanner / capacity monitoring ─────────────────────
router.get("/driver/runs", protect, getMyRuns);
router.put("/driver/runs/:id/start", protect, startRun);
router.put("/driver/runs/:id/complete", protect, completeRun);
router.post("/driver/runs/:id/scan", protect, scanBoardingPass);
router.put("/driver/runs/:id/stops/:stopIndex/reached", protect, markStopReached);
router.get("/driver/runs/:id/manifest", protect, getRunManifest);

// ── Admin — Route management / Fleet & scheduling / Analytics ───────────────────
router.get("/admin", ...adminOnly, getRoutesAdmin);
router.post("/admin", ...adminOnly, createRoute);
router.post("/admin/quick-create", ...adminOnly, quickCreateRoute);
router.put("/admin/:id", ...adminOnly, updateRoute);
router.delete("/admin/:id", ...adminOnly, deactivateRoute);
router.post("/admin/:id/runs", ...adminOnly, createRun);
router.put("/admin/runs/:id/assign-driver", ...adminOnly, assignDriverToRun);
router.get("/admin/analytics", ...adminOnly, getRouteAnalytics);

// ── Rider — plain "/:id" routes go last so they don't shadow the fixed paths above ──
router.get("/", protect, getRoutes);
router.get("/:id", protect, getRouteById);
router.post("/:id/book", protect, bookRoute);

module.exports = router;
