const express = require("express");
const router = express.Router();
const {
  getPriceEstimate,
  createParcel,
  getMyOrders,
  getParcelById,
  trackParcel,
  cancelParcel,
  rateDelivery,
} = require("../controllers/parcelController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Public
router.get("/track/:trackingId", trackParcel);

// Protected
router.post("/price-estimate", protect, getPriceEstimate);
router.post("/create", protect, upload.single("parcelImage"), createParcel);
router.get("/my-orders", protect, getMyOrders);
router.get("/:id", protect, getParcelById);
router.put("/:id/cancel", protect, cancelParcel);
router.post("/:id/rate", protect, rateDelivery);

module.exports = router;
