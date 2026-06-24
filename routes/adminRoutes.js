const express = require("express");
const router = express.Router();
const {
  getDashboard, getDashboardStats, getRevenueTrend, getHourlyOrders,
  getTopDrivers, getRecentActivity, getRegionalPerformance,
  getAllUsers, blockUser, getAllDrivers, approveDriver,
  getAllOrders, assignDriver,
  createPromoCode, getAllPromoCodes, updatePromoCode, deletePromoCode,
  getRevenueReport,
  globalSearch,
  exportOrders, exportUsers, exportDrivers,
  getAllNotifications, broadcastNotification,
} = require("../controllers/adminController");
const { getAllMerchants, approveMerchant } = require("../controllers/merchantController");
const { getAllPartners, reviewPartner } = require("../controllers/partnerController");
const { createTraining, updateTraining } = require("../controllers/trainingController");
const { getAllApplications, reviewApplication } = require("../controllers/womenProgramController");
const { protect, authorize } = require("../middleware/auth");

const adminOnly = [protect, authorize("admin")];

// Dashboard — full + section-wise
router.get("/dashboard", ...adminOnly, getDashboard);
router.get("/dashboard/stats", ...adminOnly, getDashboardStats);
router.get("/dashboard/revenue-trend", ...adminOnly, getRevenueTrend);
router.get("/dashboard/hourly-orders", ...adminOnly, getHourlyOrders);
router.get("/dashboard/top-drivers", ...adminOnly, getTopDrivers);
router.get("/dashboard/recent-activity", ...adminOnly, getRecentActivity);
router.get("/dashboard/regional-performance", ...adminOnly, getRegionalPerformance);
router.get("/revenue", ...adminOnly, getRevenueReport);

router.get("/users", ...adminOnly, getAllUsers);
router.put("/users/:id/block", ...adminOnly, blockUser);

router.get("/drivers", ...adminOnly, getAllDrivers);
router.put("/drivers/:id/approve", ...adminOnly, approveDriver);

router.get("/orders", ...adminOnly, getAllOrders);
router.put("/orders/:id/assign-driver", ...adminOnly, assignDriver);

// Global Search
router.get("/search", ...adminOnly, globalSearch);

// Export APIs
router.get("/export/orders", ...adminOnly, exportOrders);
router.get("/export/users", ...adminOnly, exportUsers);
router.get("/export/drivers", ...adminOnly, exportDrivers);

// Notifications
router.get("/notifications/all", ...adminOnly, getAllNotifications);
router.post("/notifications/broadcast", ...adminOnly, broadcastNotification);

router.get("/merchants", ...adminOnly, getAllMerchants);
router.put("/merchants/:id/approve", ...adminOnly, approveMerchant);

router.get("/partners", ...adminOnly, getAllPartners);
router.put("/partners/:id/review", ...adminOnly, reviewPartner);

router.post("/training", ...adminOnly, createTraining);
router.put("/training/:id", ...adminOnly, updateTraining);

router.get("/women-program", ...adminOnly, getAllApplications);
router.put("/women-program/:id/review", ...adminOnly, reviewApplication);

router.post("/promo", ...adminOnly, createPromoCode);
router.get("/promo", ...adminOnly, getAllPromoCodes);
router.put("/promo/:id", ...adminOnly, updatePromoCode);
router.delete("/promo/:id", ...adminOnly, deletePromoCode);

module.exports = router;
