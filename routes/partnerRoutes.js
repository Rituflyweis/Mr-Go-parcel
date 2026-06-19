const express = require("express");
const router = express.Router();
const { partnerSignup, getPartnerStatus, updatePartnerProfile, getPartnerDashboard } = require("../controllers/partnerController");
const { protect } = require("../middleware/auth");

router.post("/signup", protect, partnerSignup);
router.get("/status", protect, getPartnerStatus);
router.put("/profile", protect, updatePartnerProfile);
router.get("/dashboard", protect, getPartnerDashboard);

module.exports = router;
