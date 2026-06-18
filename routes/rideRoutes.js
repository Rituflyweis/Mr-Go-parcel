const express = require("express");
const router = express.Router();
const {
  getFareEstimate,
  bookRide,
  getMyRides,
  getRideById,
  cancelRide,
  rateRide,
  getAvailableRides,
  acceptRide,
  updateRideStatus,
  getDriverRides,
} = require("../controllers/rideController");
const { protect, authorize } = require("../middleware/auth");

// ── Customer routes ──────────────────────────────────────────────
router.post("/estimate", protect, getFareEstimate);
router.post("/book", protect, bookRide);
router.get("/my-rides", protect, getMyRides);
router.get("/:id", protect, getRideById);
router.put("/:id/cancel", protect, cancelRide);
router.post("/:id/rate", protect, rateRide);

// ── Driver routes ─────────────────────────────────────────────────
router.get("/driver/available-rides", protect, authorize("driver"), getAvailableRides);
router.get("/driver/my-rides", protect, authorize("driver"), getDriverRides);
router.put("/:id/accept", protect, authorize("driver"), acceptRide);
router.put("/:id/update-status", protect, authorize("driver"), updateRideStatus);

module.exports = router;
