const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  createCustomerBooking, getMyBookings, getMyBookingById, cancelMyBooking,
  getProviders, selectProvider, uploadBookingDocuments, submitInventory, reportDamage, getStatusTimeline,
  addTip, rateBooking, toggleProviderAvailability, getProviderDashboard, getAvailableTrips, acceptTrip, declineTrip,
  createPatient, getPatients, updatePatient, deletePatient, bookRideForPatient, getAgencyDashboard,
  getAgencySchedule, getAgencyPerformance, getRecentDestinations, getJourneyStats, getPatientDashboard,
  registerAsProvider, getMyProviderProfiles, updateMyProviderProfile,
} = require("../controllers/specializedController");
const {
  getAgencyAlerts, getBillingSummary, getInvoices, getClaims, submitClaim, resubmitClaim,
  getReportsOverview, exportBillingData,
} = require("../controllers/agencyBillingController");

router.get("/nemt/dashboard", protect, getPatientDashboard);

// Partner Portal — "Join as a professional mover/notary/etc." self-registration
router.post("/providers/register", protect, registerAsProvider);
router.get("/providers/me", protect, getMyProviderProfiles);
router.put("/providers/me/:id", protect, updateMyProviderProfile);

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
router.put("/my-bookings/:id/tip", protect, addTip);
router.put("/my-bookings/:id/rate", protect, rateBooking);

// NEMT home screen — recent destinations, journey stats
router.get("/my-recent-destinations", protect, getRecentDestinations);
router.get("/my-journey-stats", protect, getJourneyStats);

// Provider (NEMT partner / agency driver) — accept/decline trips, dashboard
router.put("/provider/availability", protect, toggleProviderAvailability);
router.get("/provider/dashboard", protect, getProviderDashboard);
router.get("/provider/trips/available", protect, getAvailableTrips);
router.put("/provider/trips/:id/accept", protect, acceptTrip);
router.put("/provider/trips/:id/decline", protect, declineTrip);

// Agency / Hospital portal — manage patients, book rides on their behalf
router.post("/agency/patients", protect, createPatient);
router.get("/agency/patients", protect, getPatients);
router.put("/agency/patients/:id", protect, updatePatient);
router.delete("/agency/patients/:id", protect, deletePatient);
router.post("/agency/patients/:id/book-ride", protect, bookRideForPatient);
router.get("/agency/dashboard", protect, getAgencyDashboard);
router.get("/agency/schedule", protect, getAgencySchedule);
router.get("/agency/performance", protect, getAgencyPerformance);
router.get("/agency/alerts", protect, getAgencyAlerts);

// Agency billing / claims / reports
router.get("/agency/billing/summary", protect, getBillingSummary);
router.get("/agency/billing/invoices", protect, getInvoices);
router.get("/agency/billing/claims", protect, getClaims);
router.post("/agency/billing/claims", protect, submitClaim);
router.put("/agency/billing/claims/:id/resubmit", protect, resubmitClaim);
router.get("/agency/billing/export", protect, exportBillingData);
router.get("/agency/reports/overview", protect, getReportsOverview);

module.exports = router;
