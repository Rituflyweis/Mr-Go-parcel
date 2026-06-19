const express = require("express");
const router = express.Router();
const { applyToProgram, getProgramStatus, getProgramDashboard } = require("../controllers/womenProgramController");
const { protect, authorize } = require("../middleware/auth");

router.post("/apply", protect, authorize("driver"), applyToProgram);
router.get("/status", protect, getProgramStatus);
router.get("/dashboard", protect, authorize("driver"), getProgramDashboard);

module.exports = router;
