require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Driver = require("../models/Driver");
const Parcel = require("../models/Parcel");
const Payment = require("../models/Payment");
const Address = require("../models/Address");
const Notification = require("../models/Notification");
const PromoCode = require("../models/PromoCode");
const Ride = require("../models/Ride");

const hash = (pw) => bcrypt.hash(pw, 10);
const tid = () => "GP" + Date.now().toString().slice(-8) + Math.random().toString(36).slice(2, 5).toUpperCase();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB Atlas — mr_go_parcel");

  await Promise.all([
    User.deleteMany({ email: { $in: ["admin@goparcel.com", "rahul@test.com", "priya@test.com", "amit@test.com", "driver1@test.com", "driver2@test.com", "driver3@test.com"] } }),
    Driver.deleteMany({}),
    Parcel.deleteMany({}),
    Payment.deleteMany({}),
    Address.deleteMany({}),
    Notification.deleteMany({}),
    PromoCode.deleteMany({}),
    Ride.deleteMany({}),
  ]);

  // Drop old geo indexes on Parcel if they exist
  try {
    const parcelCol = mongoose.connection.collection("parcels");
    await parcelCol.dropIndex("pickupAddress_2dsphere").catch(() => {});
    await parcelCol.dropIndex("deliveryAddress_2dsphere").catch(() => {});
    await parcelCol.dropIndex("pickupAddress.location_2dsphere").catch(() => {});
    await parcelCol.dropIndex("deliveryAddress.location_2dsphere").catch(() => {});
  } catch (e) {}

  console.log("Old seed data cleared");

  // ── USERS ──────────────────────────────────────────────────────────
  const [admin, customer1, customer2, customer3, driverUser1, driverUser2, driverUser3] = await User.insertMany([
    { name: "Super Admin", email: "admin@goparcel.com", phone: "9999999999", password: await hash("Admin@123"), role: "admin", isVerified: true, referralCode: "ADMIN00001", wallet: 0 },
    { name: "Rahul Sharma", email: "rahul@test.com", phone: "9876543201", password: await hash("Test@1234"), role: "customer", isVerified: true, referralCode: "RAH12345", wallet: 500, profileImage: "https://randomuser.me/api/portraits/men/1.jpg" },
    { name: "Priya Singh", email: "priya@test.com", phone: "9876543202", password: await hash("Test@1234"), role: "customer", isVerified: true, referralCode: "PRI23456", wallet: 250, profileImage: "https://randomuser.me/api/portraits/women/2.jpg" },
    { name: "Amit Verma", email: "amit@test.com", phone: "9876543203", password: await hash("Test@1234"), role: "customer", isVerified: true, referralCode: "AMI34567", wallet: 100, profileImage: "https://randomuser.me/api/portraits/men/3.jpg" },
    { name: "Raju Yadav", email: "driver1@test.com", phone: "9876543211", password: await hash("Test@1234"), role: "driver", isVerified: true, referralCode: "RAJ11111", wallet: 1200, profileImage: "https://randomuser.me/api/portraits/men/10.jpg" },
    { name: "Suresh Kumar", email: "driver2@test.com", phone: "9876543212", password: await hash("Test@1234"), role: "driver", isVerified: true, referralCode: "SUR22222", wallet: 800, profileImage: "https://randomuser.me/api/portraits/men/11.jpg" },
    { name: "Manoj Tiwari", email: "driver3@test.com", phone: "9876543213", password: await hash("Test@1234"), role: "driver", isVerified: true, referralCode: "MAN33333", wallet: 0, profileImage: "https://randomuser.me/api/portraits/men/12.jpg" },
  ]);
  console.log("✅ Users created");

  // ── DRIVERS ────────────────────────────────────────────────────────
  const [driver1, driver2] = await Driver.insertMany([
    {
      user: driverUser1._id,
      vehicleType: "bike", vehicleNumber: "MH01AB1234", vehicleModel: "Honda Activa 6G",
      licenseNumber: "MH0120210001234", aadharNumber: "123456789012", panNumber: "ABCDE1234F",
      isApproved: true, isOnline: true, isAvailable: true,
      currentLocation: { type: "Point", coordinates: [72.8777, 19.076] },
      totalEarnings: 12500, totalDeliveries: 48, rating: 4.7, totalRatings: 40,
      bankDetails: { accountNumber: "1234567890", ifscCode: "HDFC0001234", bankName: "HDFC Bank", accountHolderName: "Raju Yadav" },
    },
    {
      user: driverUser2._id,
      vehicleType: "auto", vehicleNumber: "DL05CD5678", vehicleModel: "Bajaj RE",
      licenseNumber: "DL0520190005678", aadharNumber: "234567890123", panNumber: "BCDEF2345G",
      isApproved: true, isOnline: false, isAvailable: false,
      currentLocation: { type: "Point", coordinates: [77.209, 28.6139] },
      totalEarnings: 8200, totalDeliveries: 31, rating: 4.3, totalRatings: 28,
      bankDetails: { accountNumber: "9876543210", ifscCode: "SBI0005678", bankName: "SBI", accountHolderName: "Suresh Kumar" },
    },
    {
      user: driverUser3._id,
      vehicleType: "mini_truck", vehicleNumber: "KA03EF9012", vehicleModel: "Tata Ace",
      licenseNumber: "KA0320220009012", aadharNumber: "345678901234", panNumber: "CDEFG3456H",
      isApproved: false, isOnline: false, isAvailable: false,
      currentLocation: { type: "Point", coordinates: [77.5946, 12.9716] },
      totalEarnings: 0, totalDeliveries: 0, rating: 0, totalRatings: 0,
    },
  ]);
  console.log("✅ Drivers created");

  // ── ADDRESSES ──────────────────────────────────────────────────────
  await Address.insertMany([
    { user: customer1._id, label: "home", name: "Rahul Sharma", phone: "9876543201", address: "123, Green Park Colony", landmark: "Near Metro Station", city: "Mumbai", state: "Maharashtra", pincode: "400001", location: { type: "Point", coordinates: [72.8777, 19.076] }, isDefault: true },
    { user: customer1._id, label: "office", name: "Rahul Sharma", phone: "9876543201", address: "456, BKC Tower, Floor 5", landmark: "Near HDFC Bank", city: "Mumbai", state: "Maharashtra", pincode: "400051", location: { type: "Point", coordinates: [72.8656, 19.0595] }, isDefault: false },
    { user: customer2._id, label: "home", name: "Priya Singh", phone: "9876543202", address: "789, Lajpat Nagar", landmark: "Near Ring Road", city: "Delhi", state: "Delhi", pincode: "110024", location: { type: "Point", coordinates: [77.2399, 28.5672] }, isDefault: true },
  ]);
  console.log("✅ Addresses created");

  // ── PARCELS ────────────────────────────────────────────────────────
  const now = new Date();
  const yesterday = new Date(now - 86400000);
  const twoDaysAgo = new Date(now - 2 * 86400000);

  const [parcel1, parcel2, parcel3, parcel4] = await Parcel.insertMany([
    {
      trackingId: tid(),
      customer: customer1._id, driver: driver1._id,
      parcelType: "document", weight: 0.5, dimensions: { length: 30, width: 20, height: 2 },
      description: "Legal documents - Handle with care",
      pickupAddress: { name: "Rahul Sharma", phone: "9876543201", address: "123, Green Park Colony", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
      deliveryAddress: { name: "Ankit Joshi", phone: "9876500001", address: "456, Andheri West", city: "Mumbai", state: "Maharashtra", pincode: "400058" },
      vehicleType: "bike", status: "delivered", paymentStatus: "paid", paymentMethod: "online",
      pricing: { basePrice: 50, distanceCharge: 30, weightCharge: 10, tax: 9, discount: 0, total: 99 },
      distance: 15, estimatedDeliveryTime: "45 mins", pickedUpAt: twoDaysAgo, deliveredAt: yesterday,
      customerRating: 5, customerReview: "Super fast delivery! Very happy.",
      trackingHistory: [
        { status: "pending", message: "Order placed", timestamp: twoDaysAgo },
        { status: "driver_assigned", message: "Driver assigned", timestamp: new Date(twoDaysAgo.getTime() + 600000) },
        { status: "picked_up", message: "Parcel picked up", timestamp: new Date(twoDaysAgo.getTime() + 1800000) },
        { status: "in_transit", message: "On the way", timestamp: new Date(twoDaysAgo.getTime() + 3600000) },
        { status: "delivered", message: "Delivered successfully", timestamp: yesterday },
      ],
    },
    {
      trackingId: tid(),
      customer: customer2._id, driver: driver1._id,
      parcelType: "small_package", weight: 2, dimensions: { length: 25, width: 20, height: 15 },
      description: "Fragile - Glass items inside",
      pickupAddress: { name: "Priya Singh", phone: "9876543202", address: "789, Lajpat Nagar", city: "Delhi", state: "Delhi", pincode: "110024" },
      deliveryAddress: { name: "Neha Gupta", phone: "9876500002", address: "12, Connaught Place", city: "Delhi", state: "Delhi", pincode: "110001" },
      vehicleType: "auto", status: "in_transit", paymentStatus: "paid", paymentMethod: "wallet",
      pricing: { basePrice: 80, distanceCharge: 50, weightCharge: 20, tax: 15, discount: 20, total: 145 },
      distance: 12, estimatedDeliveryTime: "30 mins", promoCode: "SAVE20", promoDiscount: 20, pickedUpAt: yesterday,
      trackingHistory: [
        { status: "pending", message: "Order placed", timestamp: yesterday },
        { status: "driver_assigned", message: "Driver Raju assigned", timestamp: new Date(yesterday.getTime() + 600000) },
        { status: "picked_up", message: "Parcel picked up from Lajpat Nagar", timestamp: new Date(yesterday.getTime() + 1800000) },
        { status: "in_transit", message: "On the way to Connaught Place", timestamp: new Date(yesterday.getTime() + 3600000) },
      ],
    },
    {
      trackingId: tid(),
      customer: customer3._id,
      parcelType: "electronics", weight: 3.5, dimensions: { length: 40, width: 30, height: 20 },
      description: "Laptop - Extremely fragile",
      pickupAddress: { name: "Amit Verma", phone: "9876543203", address: "55, MG Road", city: "Bengaluru", state: "Karnataka", pincode: "560001" },
      deliveryAddress: { name: "Rohit Nair", phone: "9876500003", address: "88, Indiranagar", city: "Bengaluru", state: "Karnataka", pincode: "560038" },
      vehicleType: "mini_truck", status: "pending", paymentStatus: "pending", paymentMethod: "cash",
      pricing: { basePrice: 150, distanceCharge: 80, weightCharge: 35, tax: 26.5, discount: 0, total: 291.5 },
      distance: 8, estimatedDeliveryTime: "1 hr",
      trackingHistory: [{ status: "pending", message: "Order placed — waiting for driver", timestamp: now }],
    },
    {
      trackingId: tid(),
      customer: customer1._id, driver: driver2._id,
      parcelType: "medium_package", weight: 5, dimensions: { length: 50, width: 40, height: 30 },
      description: "Clothing items",
      pickupAddress: { name: "Rahul Sharma", phone: "9876543201", address: "456, BKC Tower", city: "Mumbai", state: "Maharashtra", pincode: "400051" },
      deliveryAddress: { name: "Kavita Mehta", phone: "9876500004", address: "22, Dadar West", city: "Mumbai", state: "Maharashtra", pincode: "400028" },
      vehicleType: "auto", status: "cancelled", paymentStatus: "refunded", paymentMethod: "online",
      pricing: { basePrice: 100, distanceCharge: 60, weightCharge: 50, tax: 21, discount: 0, total: 231 },
      distance: 10, cancelReason: "Customer not available at pickup", cancelledBy: customer1._id,
      trackingHistory: [
        { status: "pending", message: "Order placed", timestamp: twoDaysAgo },
        { status: "cancelled", message: "Cancelled: Customer not available", timestamp: yesterday },
      ],
    },
  ]);
  console.log("✅ Parcels created (delivered, in_transit, pending, cancelled)");

  // ── PAYMENTS ───────────────────────────────────────────────────────
  await Payment.insertMany([
    { parcel: parcel1._id, customer: customer1._id, driver: driver1._id, amount: 99, currency: "INR", method: "online", gateway: "razorpay", gatewayOrderId: "order_test_001", gatewayPaymentId: "pay_test_001", gatewaySignature: "sig_test_001", status: "success", paidAt: yesterday },
    { parcel: parcel2._id, customer: customer2._id, driver: driver1._id, amount: 145, currency: "INR", method: "wallet", gateway: "wallet", status: "success", paidAt: yesterday },
    { parcel: parcel4._id, customer: customer1._id, amount: 231, currency: "INR", method: "online", gateway: "razorpay", gatewayOrderId: "order_test_002", gatewayPaymentId: "pay_test_002", status: "refunded", refundAmount: 231, refundedAt: now },
  ]);
  console.log("✅ Payments created");

  // ── PROMO CODES ────────────────────────────────────────────────────
  await PromoCode.insertMany([
    { code: "SAVE20", description: "Get 20% off on your order", discountType: "percentage", discountValue: 20, maxDiscount: 100, minOrderAmount: 100, usageLimit: 100, usedCount: 1, validFrom: new Date("2026-01-01"), validTill: new Date("2026-12-31"), isActive: true },
    { code: "FLAT50", description: "Flat ₹50 off on first order", discountType: "flat", discountValue: 50, minOrderAmount: 200, usageLimit: 500, usedCount: 12, validFrom: new Date("2026-01-01"), validTill: new Date("2026-12-31"), isActive: true, forNewUsers: true },
    { code: "WELCOME10", description: "Welcome offer 10% off", discountType: "percentage", discountValue: 10, maxDiscount: 50, minOrderAmount: 50, usageLimit: 1000, usedCount: 45, validFrom: new Date("2026-01-01"), validTill: new Date("2026-06-30"), isActive: false },
  ]);
  console.log("✅ Promo Codes created");

  // ── NOTIFICATIONS ──────────────────────────────────────────────────
  await Notification.insertMany([
    { user: customer1._id, title: "Order Delivered!", message: `Your parcel #${parcel1.trackingId} has been delivered successfully.`, type: "order", isRead: true },
    { user: customer1._id, title: "Order Cancelled", message: `Your parcel #${parcel4.trackingId} has been cancelled. Refund initiated.`, type: "order", isRead: false },
    { user: customer2._id, title: "Driver Assigned", message: "Raju Yadav is on the way to pick up your parcel.", type: "driver", isRead: false },
    { user: customer3._id, title: "Order Placed", message: `Your parcel #${parcel3.trackingId} is placed. Waiting for driver.`, type: "order", isRead: false },
    { user: driverUser1._id, title: "New Order!", message: "New delivery request near Mumbai. Accept now.", type: "order", isRead: true },
    { user: customer1._id, title: "Special Offer!", message: "Use code FLAT50 and get ₹50 off on your next order!", type: "promo", isRead: false },
    { user: customer2._id, title: "Payment Successful", message: `₹145 paid via wallet for order #${parcel2.trackingId}`, type: "payment", isRead: true },
  ]);
  console.log("✅ Notifications created");

  // ── RIDES ──────────────────────────────────────────────────────────
  const rid = () => "RD" + Date.now().toString().slice(-8) + Math.random().toString(36).slice(2, 4).toUpperCase();

  const [ride1, ride2, ride3, ride4, ride5] = await Ride.insertMany([
    {
      rideId: rid(),
      customer: customer1._id,
      driver: driver1._id,
      rideType: "on_demand",
      pickupLocation: { address: "123, Green Park Colony, Mumbai", city: "Mumbai", lat: 19.076, lng: 72.8777 },
      dropLocation: { address: "456, Andheri West, Mumbai", city: "Mumbai", lat: 19.1197, lng: 72.8296 },
      vehicleCategory: "sedan",
      passengers: 1,
      paymentMethod: "online",
      paymentStatus: "paid",
      distance: 12,
      duration: 25,
      estimatedFare: 215,
      fare: { baseFare: 50, distanceCharge: 120, timeCharge: 50, surgeMultiplier: 1, discount: 0, total: 215 },
      status: "completed",
      otp: "4521",
      rating: 5,
      review: "Very smooth ride, driver was polite!",
      startedAt: twoDaysAgo,
      completedAt: new Date(twoDaysAgo.getTime() + 1800000),
    },
    {
      rideId: rid(),
      customer: customer2._id,
      driver: driver1._id,
      rideType: "herdrive",
      pickupLocation: { address: "789, Lajpat Nagar, Delhi", city: "Delhi", lat: 28.5672, lng: 77.2399 },
      dropLocation: { address: "12, Connaught Place, Delhi", city: "Delhi", lat: 28.6315, lng: 77.2195 },
      vehicleCategory: "sedan",
      passengers: 1,
      paymentMethod: "wallet",
      paymentStatus: "paid",
      distance: 8,
      duration: 20,
      estimatedFare: 176,
      fare: { baseFare: 50, distanceCharge: 96, timeCharge: 40, surgeMultiplier: 1.1, discount: 0, total: 176 },
      status: "completed",
      otp: "7832",
      rating: 4,
      review: "Safe and comfortable HerDrive experience.",
      startedAt: yesterday,
      completedAt: new Date(yesterday.getTime() + 1500000),
    },
    {
      rideId: rid(),
      customer: customer1._id,
      driver: driver2._id,
      rideType: "airport_transfer",
      pickupLocation: { address: "456, BKC Tower, Mumbai", city: "Mumbai", lat: 19.0595, lng: 72.8656 },
      dropLocation: { address: "Chhatrapati Shivaji International Airport, Mumbai", city: "Mumbai", lat: 19.0896, lng: 72.8656 },
      vehicleCategory: "suv",
      passengers: 2,
      paymentMethod: "online",
      paymentStatus: "paid",
      distance: 18,
      duration: 40,
      estimatedFare: 598,
      fare: { baseFare: 80, distanceCharge: 288, timeCharge: 100, surgeMultiplier: 1.3, discount: 0, total: 598 },
      status: "completed",
      otp: "3391",
      rating: 5,
      review: "On time, great for airport trips!",
      startedAt: twoDaysAgo,
      completedAt: new Date(twoDaysAgo.getTime() + 2400000),
    },
    {
      rideId: rid(),
      customer: customer2._id,
      rideType: "carpool",
      pickupLocation: { address: "789, Lajpat Nagar, Delhi", city: "Delhi", lat: 28.5672, lng: 77.2399 },
      dropLocation: { address: "Cyber City, Gurugram", city: "Gurugram", lat: 28.4949, lng: 77.0890 },
      vehicleCategory: "sedan",
      passengers: 3,
      paymentMethod: "cash",
      paymentStatus: "pending",
      distance: 20,
      duration: 45,
      estimatedFare: 168,
      fare: { baseFare: 50, distanceCharge: 168, timeCharge: 67.5, surgeMultiplier: 0.7, discount: 0, total: 168 },
      status: "searching",
      otp: "5512",
    },
    {
      rideId: rid(),
      customer: customer3._id,
      rideType: "night_safe",
      pickupLocation: { address: "55, MG Road, Bengaluru", city: "Bengaluru", lat: 12.9716, lng: 77.5946 },
      dropLocation: { address: "88, Indiranagar, Bengaluru", city: "Bengaluru", lat: 12.9784, lng: 77.6412 },
      vehicleCategory: "sedan",
      passengers: 1,
      paymentMethod: "wallet",
      paymentStatus: "pending",
      distance: 6,
      duration: 18,
      estimatedFare: 156,
      fare: { baseFare: 50, distanceCharge: 72, timeCharge: 36, surgeMultiplier: 1.2, discount: 0, total: 156 },
      status: "cancelled",
      otp: "9921",
      cancelReason: "No driver available",
      cancelledBy: customer3._id,
    },
  ]);
  console.log("✅ Rides created (on_demand, herdrive, airport_transfer, carpool, night_safe)");

  console.log("\n══════════════════════════════════════════");
  console.log("      SEED COMPLETE — TEST CREDENTIALS");
  console.log("══════════════════════════════════════════");
  console.log("\n🔑 ADMIN");
  console.log("   Email   : admin@goparcel.com");
  console.log("   Password: Admin@123");
  console.log("\n👤 CUSTOMERS");
  console.log("   rahul@test.com  | Test@1234 | Wallet: ₹500");
  console.log("   priya@test.com  | Test@1234 | Wallet: ₹250");
  console.log("   amit@test.com   | Test@1234 | Wallet: ₹100");
  console.log("\n🚗 DRIVERS");
  console.log("   driver1@test.com | Test@1234 | Bike  | Approved ✅ | Online");
  console.log("   driver2@test.com | Test@1234 | Auto  | Approved ✅ | Offline");
  console.log("   driver3@test.com | Test@1234 | Truck | Pending  ⏳");
  console.log("\n📦 PARCELS");
  console.log("   " + parcel1.trackingId + " — Delivered   (Rahul → Raju)");
  console.log("   " + parcel2.trackingId + " — In Transit  (Priya → Raju)");
  console.log("   " + parcel3.trackingId + " — Pending     (Amit  → no driver)");
  console.log("   " + parcel4.trackingId + " — Cancelled   (Rahul → refunded)");
  console.log("\n🎟️  PROMO CODES: SAVE20 | FLAT50 | WELCOME10(expired)");
  console.log("\n🚖 RIDES");
  console.log("   " + ride1.rideId + " — Completed   | On-Demand  | Rahul  → Raju  | ₹215");
  console.log("   " + ride2.rideId + " — Completed   | HerDrive   | Priya  → Raju  | ₹176");
  console.log("   " + ride3.rideId + " — Completed   | Airport    | Rahul  → Suresh| ₹598");
  console.log("   " + ride4.rideId + " — Searching   | Carpool    | Priya  → none  | ₹168");
  console.log("   " + ride5.rideId + " — Cancelled   | Night-Safe | Amit   → none  | ₹156");
  console.log("══════════════════════════════════════════\n");

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
