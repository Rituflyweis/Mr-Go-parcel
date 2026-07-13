const express = require("express");
const router = express.Router();
const { getEarningsDashboard, getEarningsHistory, getEarningTips } = require("../controllers/earningController");
const { protect, authorize } = require("../middleware/auth");

router.get("/dashboard", protect, authorize("driver"), getEarningsDashboard);
router.get("/history", protect, authorize("driver"), getEarningsHistory);
router.get("/tips", protect, getEarningTips);

module.exports = router;
