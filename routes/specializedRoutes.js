const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  createCustomerBooking, getMyBookings, getMyBookingById, cancelMyBooking,
  getProviders, selectProvider, uploadBookingDocuments, submitInventory, reportDamage, getStatusTimeline,
} = require("../controllers/specializedController");

router.get("/:serviceType/providers", protect, getProviders);
router.post("/:serviceType/book", protect, createCustomerBooking);
router.get("/my-bookings", protect, getMyBookings);
router.get("/my-bookings/:id", protect, getMyBookingById);
router.put("/my-bookings/:id/cancel", protect, cancelMyBooking);
router.put("/my-bookings/:id/provider", protect, selectProvider);
router.post("/my-bookings/:id/documents", protect, upload.array("documents", 10), uploadBookingDocuments);
router.put("/my-bookings/:id/inventory", protect, submitInventory);
router.post("/my-bookings/:id/damage-report", protect, upload.array("photos", 8), reportDamage);
router.get("/my-bookings/:id/status-timeline", protect, getStatusTimeline);

module.exports = router;
