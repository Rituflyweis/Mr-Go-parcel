require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const User = require("../models/User");
const connectDB = require("../config/db");

const seedAdmin = async () => {
  await connectDB();

  const existing = await User.findOne({ email: "admin@goparcel.com" });
  if (existing) {
    console.log("Admin already exists:", existing.email);
    process.exit(0);
  }

  const admin = await User.create({
    name: "Super Admin",
    email: "admin@goparcel.com",
    phone: "9999999999",
    password: "Admin@123",
    role: "admin",
    isVerified: true,
    referralCode: "ADMIN001",
  });

  console.log("✅ Admin created:", admin.email);
  console.log("📧 Email: admin@goparcel.com");
  console.log("🔑 Password: Admin@123");
  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
