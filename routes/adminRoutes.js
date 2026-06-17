const express = require("express");
const router = express.Router();
const {
  getDashboard,
  getAllUsers,
  blockUser,
  getAllDrivers,
  approveDriver,
  getAllOrders,
  assignDriver,
  createPromoCode,
  getAllPromoCodes,
  updatePromoCode,
  deletePromoCode,
  getRevenueReport,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");

const adminOnly = [protect, authorize("admin")];

router.get("/dashboard", ...adminOnly, getDashboard);
router.get("/revenue", ...adminOnly, getRevenueReport);

router.get("/users", ...adminOnly, getAllUsers);
router.put("/users/:id/block", ...adminOnly, blockUser);

router.get("/drivers", ...adminOnly, getAllDrivers);
router.put("/drivers/:id/approve", ...adminOnly, approveDriver);

router.get("/orders", ...adminOnly, getAllOrders);
router.put("/orders/:id/assign-driver", ...adminOnly, assignDriver);

router.post("/promo", ...adminOnly, createPromoCode);
router.get("/promo", ...adminOnly, getAllPromoCodes);
router.put("/promo/:id", ...adminOnly, updatePromoCode);
router.delete("/promo/:id", ...adminOnly, deletePromoCode);

module.exports = router;
