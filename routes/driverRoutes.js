const express = require("express");
const router = express.Router();
const {
  registerDriver,
  updateLocation,
  toggleOnline,
  getDriverOrders,
  acceptOrder,
  updateOrderStatus,
  getEarnings,
  updateBankDetails,
} = require("../controllers/driverController");
const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");

const driverUpload = upload.fields([
  { name: "licenseImage", maxCount: 1 },
  { name: "vehicleImage", maxCount: 1 },
  { name: "aadharImage", maxCount: 1 },
  { name: "panImage", maxCount: 1 },
]);

router.post("/register", protect, driverUpload, registerDriver);
router.put("/location", protect, authorize("driver"), updateLocation);
router.put("/toggle-online", protect, authorize("driver"), toggleOnline);
router.get("/my-orders", protect, authorize("driver"), getDriverOrders);
router.put("/order/:parcelId/accept", protect, authorize("driver"), acceptOrder);
router.put("/order/:parcelId/update-status", protect, authorize("driver"), updateOrderStatus);
router.get("/earnings", protect, authorize("driver"), getEarnings);
router.put("/bank-details", protect, authorize("driver"), updateBankDetails);

module.exports = router;
