const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { createCustomerBooking, getMyBookings, getMyBookingById, cancelMyBooking } = require("../controllers/specializedController");

router.post("/:serviceType/book", protect, createCustomerBooking);
router.get("/my-bookings", protect, getMyBookings);
router.get("/my-bookings/:id", protect, getMyBookingById);
router.put("/my-bookings/:id/cancel", protect, cancelMyBooking);

module.exports = router;
