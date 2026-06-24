const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

const errorHandler = require("./middleware/errorHandler");

// Routes
const authRoutes = require("./routes/authRoutes");
const parcelRoutes = require("./routes/parcelRoutes");
const driverRoutes = require("./routes/driverRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const addressRoutes = require("./routes/addressRoutes");
const rideRoutes = require("./routes/rideRoutes");
const promoRoutes = require("./routes/promoRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const merchantRoutes = require("./routes/merchantRoutes");
const adminExtendedRoutes = require("./routes/adminExtendedRoutes");
const partnerRoutes = require("./routes/partnerRoutes");
const trainingRoutes = require("./routes/trainingRoutes");
const womenProgramRoutes = require("./routes/womenProgramRoutes");
const earningRoutes = require("./routes/earningRoutes");

const app = express();

// Security & logging
app.use(helmet());
app.use(morgan("dev"));
app.use(cors({ origin: "*", credentials: false }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use("/api", limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/", (req, res) => res.json({ success: true, message: "Go Parcel API is running 🚀" }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/parcel", parcelRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/promo", promoRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/merchant", merchantRoutes);
app.use("/api/admin", adminExtendedRoutes);
app.use("/api/partner", partnerRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/women-program", womenProgramRoutes);
app.use("/api/earnings", earningRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// Global error handler
app.use(errorHandler);

module.exports = app;
