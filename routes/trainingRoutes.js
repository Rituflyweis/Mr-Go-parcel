const express = require("express");
const router = express.Router();
const { getAllTrainings, getTrainingById, enrollTraining, updateProgress, getMyEnrollments, getMyCertificates } = require("../controllers/trainingController");
const { protect } = require("../middleware/auth");

router.get("/", protect, getAllTrainings);
router.get("/my-enrollments", protect, getMyEnrollments);
router.get("/certificates", protect, getMyCertificates);
router.get("/:id", protect, getTrainingById);
router.post("/:id/enroll", protect, enrollTraining);
router.put("/:id/progress", protect, updateProgress);

module.exports = router;
