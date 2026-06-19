const express = require("express");
const router = express.Router();
const {
  registerMerchant, getMerchantProfile, updateMerchantProfile, getMerchantDashboard,
  createApiKey, getApiKeys, deleteApiKey, toggleApiKey,
  addDriverToFleet, getFleet, updateFleetDriver, removeDriverFromFleet, getFleetStats,
} = require("../controllers/merchantController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

// ── Merchant Profile ──────────────────────────────────────────────
router.post("/register", protect, upload.single("logo"), registerMerchant);
router.get("/profile", protect, getMerchantProfile);
router.put("/profile", protect, upload.single("logo"), updateMerchantProfile);
router.get("/dashboard", protect, getMerchantDashboard);

// ── API Keys ──────────────────────────────────────────────────────
router.post("/api-keys", protect, createApiKey);
router.get("/api-keys", protect, getApiKeys);
router.delete("/api-keys/:id", protect, deleteApiKey);
router.put("/api-keys/:id/toggle", protect, toggleApiKey);

// ── Fleet Management ──────────────────────────────────────────────
router.post("/fleet/add", protect, addDriverToFleet);
router.get("/fleet", protect, getFleet);
router.get("/fleet/stats", protect, getFleetStats);
router.put("/fleet/:id", protect, updateFleetDriver);
router.delete("/fleet/:id", protect, removeDriverFromFleet);

module.exports = router;
