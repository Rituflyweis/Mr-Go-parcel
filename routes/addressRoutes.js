const express = require("express");
const router = express.Router();
const { getAddresses, addAddress, updateAddress, deleteAddress } = require("../controllers/addressController");
const { protect } = require("../middleware/auth");

router.get("/", protect, getAddresses);
router.post("/", protect, addAddress);
router.put("/:id", protect, updateAddress);
router.delete("/:id", protect, deleteAddress);

module.exports = router;
