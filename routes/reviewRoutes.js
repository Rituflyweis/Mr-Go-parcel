const express = require("express");
const router = express.Router();
const { reviewParcel, reviewRide, getDriverReviews, getMyReviews } = require("../controllers/reviewController");
const { protect } = require("../middleware/auth");

router.post("/parcel/:parcelId", protect, reviewParcel);
router.post("/ride/:rideId", protect, reviewRide);
router.get("/driver/:driverId", protect, getDriverReviews);
router.get("/my-reviews", protect, getMyReviews);

module.exports = router;
