const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");

const { getParcelStats, getAllParcels, getActiveParcels, getScheduledParcels, getFailedParcels, getLiveTrackingStats } = require("../controllers/parcelAdminController");
const { getRideStats, getAllRides, getActiveTrips, getRideHistory, getPricingRules, createPricingRule, updatePricingRule, deletePricingRule, togglePricingRule, calculateFare } = require("../controllers/rideAdminController");
const { getNEMT, createNEMT, getNotary, createNotary, getMovers, createMovers, getShuttle, createShuttle, updateBooking, deleteBooking, getProvidersAdmin, approveProviderAdmin } = require("../controllers/specializedController");
const { getTransactions, getPayouts, createPayout, updatePayout, processBatchPayout, getRefunds, createRefund, updateRefund } = require("../controllers/financeController");
const { getVerifications, createVerification, updateVerification, getIncidents, createIncident, updateIncident, getAudits, createAudit, updateAudit } = require("../controllers/complianceController");
const { getSettings, updateSettings, getAdminUsers, createAdminUser, getCustomers, getAnalytics, getDriverManagement, getOnboarding, getPerformanceAnalytics } = require("../controllers/systemController");
const { getSupportChatThreads, getSupportChatThreadMessages, sendSupportChatMessage } = require("../controllers/supportController");

const adminOnly = [protect, authorize("admin")];

// ── SEND A PARCEL ──────────────────────────────────────────────────────────────
router.get("/parcels/stats",     ...adminOnly, getParcelStats);
router.get("/parcels/all",       ...adminOnly, getAllParcels);
router.get("/parcels/active",    ...adminOnly, getActiveParcels);
router.get("/parcels/scheduled", ...adminOnly, getScheduledParcels);
router.get("/parcels/failed",    ...adminOnly, getFailedParcels);
router.get("/parcels/tracking",  ...adminOnly, getLiveTrackingStats);

// ── BOOK A RIDE ───────────────────────────────────────────────────────────────
router.get("/rides/stats",          ...adminOnly, getRideStats);
router.get("/rides/all",            ...adminOnly, getAllRides);
router.get("/rides/active",         ...adminOnly, getActiveTrips);
router.get("/rides/history",        ...adminOnly, getRideHistory);
router.get("/rides/pricing",        ...adminOnly, getPricingRules);
router.post("/rides/pricing",       ...adminOnly, createPricingRule);
router.post("/rides/pricing/calculate", ...adminOnly, calculateFare);
router.put("/rides/pricing/:id",    ...adminOnly, updatePricingRule);
router.put("/rides/pricing/:id/toggle", ...adminOnly, togglePricingRule);
router.delete("/rides/pricing/:id", ...adminOnly, deletePricingRule);

// ── SPECIALIZED SERVICES ──────────────────────────────────────────────────────
router.get("/specialized/nemt",    ...adminOnly, getNEMT);
router.post("/specialized/nemt",   ...adminOnly, createNEMT);
router.get("/specialized/notary",  ...adminOnly, getNotary);
router.post("/specialized/notary", ...adminOnly, createNotary);
router.get("/specialized/movers",  ...adminOnly, getMovers);
router.post("/specialized/movers", ...adminOnly, createMovers);
router.get("/specialized/shuttle", ...adminOnly, getShuttle);
router.post("/specialized/shuttle",...adminOnly, createShuttle);
router.put("/specialized/:id",     ...adminOnly, updateBooking);
router.delete("/specialized/:id",  ...adminOnly, deleteBooking);
router.get("/specialized/providers",           ...adminOnly, getProvidersAdmin);
router.put("/specialized/providers/:id/approve", ...adminOnly, approveProviderAdmin);

// ── PAYMENTS & FINANCE ────────────────────────────────────────────────────────
router.get("/finance/transactions",       ...adminOnly, getTransactions);
router.get("/finance/payouts",            ...adminOnly, getPayouts);
router.post("/finance/payouts",           ...adminOnly, createPayout);
router.post("/finance/payouts/batch",     ...adminOnly, processBatchPayout);
router.put("/finance/payouts/:id",        ...adminOnly, updatePayout);
router.get("/finance/refunds",            ...adminOnly, getRefunds);
router.post("/finance/refunds",           ...adminOnly, createRefund);
router.put("/finance/refunds/:id",        ...adminOnly, updateRefund);

// ── COMPLIANCE & SAFETY ───────────────────────────────────────────────────────
router.get("/compliance/verifications",      ...adminOnly, getVerifications);
router.post("/compliance/verifications",     ...adminOnly, createVerification);
router.put("/compliance/verifications/:id",  ...adminOnly, updateVerification);
router.get("/compliance/incidents",          ...adminOnly, getIncidents);
router.post("/compliance/incidents",         ...adminOnly, createIncident);
router.put("/compliance/incidents/:id",      ...adminOnly, updateIncident);
router.get("/compliance/audits",             ...adminOnly, getAudits);
router.post("/compliance/audits",            ...adminOnly, createAudit);
router.put("/compliance/audits/:id",         ...adminOnly, updateAudit);

// ── USERS & ROLES ─────────────────────────────────────────────────────────────
router.get("/system/admins",     ...adminOnly, getAdminUsers);
router.post("/system/admins",    ...adminOnly, createAdminUser);
router.get("/system/customers",  ...adminOnly, getCustomers);

// ── PARTNERS & DRIVERS ────────────────────────────────────────────────────────
router.get("/system/drivers",    ...adminOnly, getDriverManagement);
router.get("/system/onboarding", ...adminOnly, getOnboarding);
router.get("/system/performance",...adminOnly, getPerformanceAnalytics);

// ── REPORTS & ANALYTICS ───────────────────────────────────────────────────────
router.get("/system/analytics",  ...adminOnly, getAnalytics);

// ── SYSTEM SETTINGS ───────────────────────────────────────────────────────────
router.get("/system/settings",   ...adminOnly, getSettings);
router.put("/system/settings",   ...adminOnly, updateSettings);

// ── SUPPORT CHAT ──────────────────────────────────────────────────────────────
router.get("/support/chats",                    ...adminOnly, getSupportChatThreads);
router.get("/support/chats/:userId/messages",   ...adminOnly, getSupportChatThreadMessages);
router.post("/support/chats/:userId/send",      ...adminOnly, sendSupportChatMessage);

module.exports = router;
