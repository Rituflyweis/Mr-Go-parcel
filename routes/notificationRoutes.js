const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAllRead,
  markOneRead,
  deleteNotification,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

router.get("/", protect, getNotifications);
router.put("/mark-read", protect, markAllRead);
router.put("/:id/read", protect, markOneRead);
router.delete("/:id", protect, deleteNotification);

module.exports = router;
