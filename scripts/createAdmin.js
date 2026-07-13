const User = require("../models/User");

const seedAdmin = async () => {
  const existing = await User.findOne({ email: "admin@goparcel.com" });
  if (existing) return;

  await User.create({
    name: "Super Admin",
    email: "admin@goparcel.com",
    phone: "9999999999",
    password: "Admin@123",
    role: "admin",
    isVerified: true,
    referralCode: "ADMIN00001",
  });

  console.log("Admin created — Email: admin@goparcel.com | Password: Admin@123");
};

module.exports = seedAdmin;
