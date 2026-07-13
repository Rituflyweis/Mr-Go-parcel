const Notification = require("../models/Notification");
const { successResponse, errorResponse } = require("../utils/response");

// @route GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
    successResponse(res, 200, "Notifications", { notifications, unreadCount });
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/notifications/mark-read
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    successResponse(res, 200, "All notifications marked as read");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route PUT /api/notifications/:id/read
const markOneRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    successResponse(res, 200, "Notification marked as read");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

// @route DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    successResponse(res, 200, "Notification deleted");
  } catch (error) {
    errorResponse(res, 500, error.message);
  }
};

module.exports = { getNotifications, markAllRead, markOneRead, deleteNotification };
