const express = require("express");
const router = express.Router();
const { applyPromoCode, getAvailablePromos } = require("../controllers/promoController");
const { protect } = require("../middleware/auth");

router.get("/available", protect, getAvailablePromos);
router.post("/apply", protect, applyPromoCode);

module.exports = router;
