require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");
const Driver = require("../models/Driver");
const Parcel = require("../models/Parcel");
const Payment = require("../models/Payment");
const Address = require("../models/Address");
const Notification = require("../models/Notification");
const PromoCode = require("../models/PromoCode");
const Ride = require("../models/Ride");
const Merchant = require("../models/Merchant");
const ApiKey = require("../models/ApiKey");
const Fleet = require("../models/Fleet");
const Partner = require("../models/Partner");
const { Training, Enrollment } = require("../models/Training");
const WomenProgram = require("../models/WomenProgram");

const hash = (pw) => bcrypt.hash(pw, 10);
const tid = () => "GP" + Date.now().toString().slice(-8) + Math.random().toString(36).slice(2, 5).toUpperCase();
const rid = () => "RD" + Date.now().toString().slice(-8) + Math.random().toString(36).slice(2, 4).toUpperCase();

// Upsert user — create only if email doesn't exist
const upsertUser = async (data) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) return existing;
  return User.create(data);
};

// Upsert by filter — create only if not found
const upsertOne = async (Model, filter, data) => {
  const existing = await Model.findOne(filter);
  if (existing) return existing;
  return Model.create(data);
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB Atlas — mr_go_parcel");
  console.log("Mode: UPSERT — existing data will NOT be deleted\n");

  // Drop old broken geo indexes silently
  try {
    const parcelCol = mongoose.connection.collection("parcels");
    await parcelCol.dropIndex("pickupAddress_2dsphere").catch(() => {});
    await parcelCol.dropIndex("deliveryAddress_2dsphere").catch(() => {});
    await parcelCol.dropIndex("pickupAddress.location_2dsphere").catch(() => {});
    await parcelCol.dropIndex("deliveryAddress.location_2dsphere").catch(() => {});
  } catch (e) {}

  // ── USERS ──────────────────────────────────────────────────────────
  const admin       = await upsertUser({ name: "Super Admin",   email: "admin@goparcel.com",   phone: "9999999999", password: await hash("Admin@123"),  role: "admin",    isVerified: true, referralCode: "ADMIN00001", wallet: 0 });
  const customer1   = await upsertUser({ name: "Rahul Sharma",  email: "rahul@test.com",        phone: "9876543201", password: await hash("Test@1234"),   role: "customer", isVerified: true, referralCode: "RAH12345",   wallet: 500,  profileImage: "https://randomuser.me/api/portraits/men/1.jpg" });
  const customer2   = await upsertUser({ name: "Priya Singh",   email: "priya@test.com",        phone: "9876543202", password: await hash("Test@1234"),   role: "customer", isVerified: true, referralCode: "PRI23456",   wallet: 250,  profileImage: "https://randomuser.me/api/portraits/women/2.jpg" });
  const customer3   = await upsertUser({ name: "Amit Verma",    email: "amit@test.com",         phone: "9876543203", password: await hash("Test@1234"),   role: "customer", isVerified: true, referralCode: "AMI34567",   wallet: 100,  profileImage: "https://randomuser.me/api/portraits/men/3.jpg" });
  const driverUser1 = await upsertUser({ name: "Raju Yadav",    email: "driver1@test.com",      phone: "9876543211", password: await hash("Test@1234"),   role: "driver",   isVerified: true, referralCode: "RAJ11111",   wallet: 1200, profileImage: "https://randomuser.me/api/portraits/men/10.jpg" });
  const driverUser2 = await upsertUser({ name: "Suresh Kumar",  email: "driver2@test.com",      phone: "9876543212", password: await hash("Test@1234"),   role: "driver",   isVerified: true, referralCode: "SUR22222",   wallet: 800,  profileImage: "https://randomuser.me/api/portraits/men/11.jpg" });
  const driverUser3 = await upsertUser({ name: "Manoj Tiwari",  email: "driver3@test.com",      phone: "9876543213", password: await hash("Test@1234"),   role: "driver",   isVerified: true, referralCode: "MAN33333",   wallet: 0,    profileImage: "https://randomuser.me/api/portraits/men/12.jpg" });
  const merchantU1  = await upsertUser({ name: "Flipkart Seller", email: "merchant1@test.com",  phone: "9888800001", password: await hash("Test@1234"),   role: "customer", isVerified: true, referralCode: "MER11111",   wallet: 5000 });
  const merchantU2  = await upsertUser({ name: "Local Pharmacy",  email: "merchant2@test.com",  phone: "9888800002", password: await hash("Test@1234"),   role: "customer", isVerified: true, referralCode: "MER22222",   wallet: 2000 });
  const partnerU1   = await upsertUser({ name: "Delhivery Corp",  email: "partner1@test.com",   phone: "9777700001", password: await hash("Test@1234"),   role: "customer", isVerified: true, referralCode: "PAR11111",   wallet: 0 });
  const partnerU2   = await upsertUser({ name: "Shyam Logistics", email: "partner2@test.com",   phone: "9777700002", password: await hash("Test@1234"),   role: "customer", isVerified: true, referralCode: "PAR22222",   wallet: 0 });
  const partnerU3   = await upsertUser({ name: "Priya Courier",   email: "partner3@test.com",   phone: "9777700003", password: await hash("Test@1234"),   role: "customer", isVerified: true, referralCode: "PAR33333",   wallet: 0 });
  const womenU      = await upsertUser({ name: "Sunita Devi",     email: "sunita@test.com",      phone: "9855500001", password: await hash("Test@1234"),   role: "driver",   isVerified: true, referralCode: "SUN55501",   wallet: 800,  profileImage: "https://randomuser.me/api/portraits/women/20.jpg" });
  console.log("✅ Users upserted (skipped existing)");

  // ── DRIVERS ────────────────────────────────────────────────────────
  const driver1 = await upsertOne(Driver, { user: driverUser1._id }, {
    user: driverUser1._id, vehicleType: "bike", vehicleNumber: "MH01AB1234", vehicleModel: "Honda Activa 6G",
    licenseNumber: "MH0120210001234", aadharNumber: "123456789012", panNumber: "ABCDE1234F",
    isApproved: true, isOnline: true, isAvailable: true,
    currentLocation: { type: "Point", coordinates: [72.8777, 19.076] },
    totalEarnings: 12500, totalDeliveries: 48, rating: 4.7, totalRatings: 40,
    bankDetails: { accountNumber: "1234567890", ifscCode: "HDFC0001234", bankName: "HDFC Bank", accountHolderName: "Raju Yadav" },
  });
  const driver2 = await upsertOne(Driver, { user: driverUser2._id }, {
    user: driverUser2._id, vehicleType: "auto", vehicleNumber: "DL05CD5678", vehicleModel: "Bajaj RE",
    licenseNumber: "DL0520190005678", aadharNumber: "234567890123", panNumber: "BCDEF2345G",
    isApproved: true, isOnline: false, isAvailable: false,
    currentLocation: { type: "Point", coordinates: [77.209, 28.6139] },
    totalEarnings: 8200, totalDeliveries: 31, rating: 4.3, totalRatings: 28,
    bankDetails: { accountNumber: "9876543210", ifscCode: "SBI0005678", bankName: "SBI", accountHolderName: "Suresh Kumar" },
  });
  await upsertOne(Driver, { user: driverUser3._id }, {
    user: driverUser3._id, vehicleType: "mini_truck", vehicleNumber: "KA03EF9012", vehicleModel: "Tata Ace",
    licenseNumber: "KA0320220009012", aadharNumber: "345678901234", panNumber: "CDEFG3456H",
    isApproved: false, isOnline: false, isAvailable: false,
    currentLocation: { type: "Point", coordinates: [77.5946, 12.9716] },
    totalEarnings: 0, totalDeliveries: 0, rating: 0, totalRatings: 0,
  });
  const womenDriver = await upsertOne(Driver, { user: womenU._id }, {
    user: womenU._id, vehicleType: "bike", vehicleNumber: "MH02WW5001", vehicleModel: "Honda Activa",
    licenseNumber: "MH0220220055001", aadharNumber: "555566667777", panNumber: "SNDVW1234X",
    isApproved: true, isOnline: true, isAvailable: true,
    currentLocation: { type: "Point", coordinates: [72.8777, 19.076] },
    totalEarnings: 18500, totalDeliveries: 92, rating: 4.9, totalRatings: 85,
    bankDetails: { accountNumber: "5555566666", ifscCode: "ICIC0005555", bankName: "ICICI Bank", accountHolderName: "Sunita Devi" },
  });
  console.log("✅ Drivers upserted");

  // ── ADDRESSES ──────────────────────────────────────────────────────
  const addrCount = await Address.countDocuments({ user: customer1._id });
  if (addrCount === 0) {
    await Address.insertMany([
      { user: customer1._id, label: "home",   name: "Rahul Sharma", phone: "9876543201", address: "123, Green Park Colony", landmark: "Near Metro Station", city: "Mumbai", state: "Maharashtra", pincode: "400001", isDefault: true },
      { user: customer1._id, label: "office", name: "Rahul Sharma", phone: "9876543201", address: "456, BKC Tower, Floor 5", landmark: "Near HDFC Bank",    city: "Mumbai", state: "Maharashtra", pincode: "400051", isDefault: false },
      { user: customer2._id, label: "home",   name: "Priya Singh",  phone: "9876543202", address: "789, Lajpat Nagar",      landmark: "Near Ring Road",     city: "Delhi",  state: "Delhi",        pincode: "110024", isDefault: true },
    ]);
    console.log("✅ Addresses created");
  } else {
    console.log("⏭️  Addresses already exist — skipped");
  }

  // ── PROMO CODES ────────────────────────────────────────────────────
  await upsertOne(PromoCode, { code: "SAVE20" },    { code: "SAVE20",    description: "Get 20% off on your order",    discountType: "percentage", discountValue: 20, maxDiscount: 100, minOrderAmount: 100, usageLimit: 100, usedCount: 1,  validFrom: new Date("2026-01-01"), validTill: new Date("2026-12-31"), isActive: true });
  await upsertOne(PromoCode, { code: "FLAT50" },    { code: "FLAT50",    description: "Flat ₹50 off on first order",  discountType: "flat",       discountValue: 50,                  minOrderAmount: 200, usageLimit: 500, usedCount: 12, validFrom: new Date("2026-01-01"), validTill: new Date("2026-12-31"), isActive: true, forNewUsers: true });
  await upsertOne(PromoCode, { code: "WELCOME10" }, { code: "WELCOME10", description: "Welcome offer 10% off",        discountType: "percentage", discountValue: 10, maxDiscount: 50,  minOrderAmount: 50,  usageLimit: 1000,usedCount: 45, validFrom: new Date("2026-01-01"), validTill: new Date("2026-06-30"), isActive: false });
  console.log("✅ Promo codes upserted");

  // ── PARCELS (only if none exist for test users) ─────────────────
  const parcelCount = await Parcel.countDocuments({ customer: customer1._id });
  let parcel1, parcel2, parcel3, parcel4;
  if (parcelCount === 0) {
    const now = new Date();
    const yesterday = new Date(now - 86400000);
    const twoDaysAgo = new Date(now - 2 * 86400000);
    [parcel1, parcel2, parcel3, parcel4] = await Parcel.insertMany([
      {
        trackingId: tid(), customer: customer1._id, driver: driver1._id,
        parcelType: "document", weight: 0.5, dimensions: { length: 30, width: 20, height: 2 },
        description: "Legal documents - Handle with care",
        pickupAddress:   { name: "Rahul Sharma", phone: "9876543201", address: "123, Green Park Colony", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
        deliveryAddress: { name: "Ankit Joshi",  phone: "9876500001", address: "456, Andheri West",      city: "Mumbai", state: "Maharashtra", pincode: "400058" },
        vehicleType: "bike", status: "delivered", paymentStatus: "paid", paymentMethod: "online",
        pricing: { basePrice: 50, distanceCharge: 30, weightCharge: 10, tax: 9, discount: 0, total: 99 },
        distance: 15, estimatedDeliveryTime: "45 mins", pickedUpAt: twoDaysAgo, deliveredAt: yesterday,
        customerRating: 5, customerReview: "Super fast delivery!",
        trackingHistory: [
          { status: "pending",         message: "Order placed",         timestamp: twoDaysAgo },
          { status: "driver_assigned", message: "Driver assigned",       timestamp: new Date(twoDaysAgo.getTime() + 600000) },
          { status: "picked_up",       message: "Parcel picked up",      timestamp: new Date(twoDaysAgo.getTime() + 1800000) },
          { status: "in_transit",      message: "On the way",            timestamp: new Date(twoDaysAgo.getTime() + 3600000) },
          { status: "delivered",       message: "Delivered successfully", timestamp: yesterday },
        ],
      },
      {
        trackingId: tid(), customer: customer2._id, driver: driver1._id,
        parcelType: "small_package", weight: 2, dimensions: { length: 25, width: 20, height: 15 },
        description: "Fragile - Glass items inside",
        pickupAddress:   { name: "Priya Singh", phone: "9876543202", address: "789, Lajpat Nagar",    city: "Delhi", state: "Delhi", pincode: "110024" },
        deliveryAddress: { name: "Neha Gupta",  phone: "9876500002", address: "12, Connaught Place",  city: "Delhi", state: "Delhi", pincode: "110001" },
        vehicleType: "auto", status: "in_transit", paymentStatus: "paid", paymentMethod: "wallet",
        pricing: { basePrice: 80, distanceCharge: 50, weightCharge: 20, tax: 15, discount: 20, total: 145 },
        distance: 12, estimatedDeliveryTime: "30 mins", promoCode: "SAVE20", promoDiscount: 20, pickedUpAt: yesterday,
        trackingHistory: [
          { status: "pending",         message: "Order placed",              timestamp: yesterday },
          { status: "driver_assigned", message: "Driver Raju assigned",       timestamp: new Date(yesterday.getTime() + 600000) },
          { status: "picked_up",       message: "Parcel picked up",           timestamp: new Date(yesterday.getTime() + 1800000) },
          { status: "in_transit",      message: "On the way to destination",  timestamp: new Date(yesterday.getTime() + 3600000) },
        ],
      },
      {
        trackingId: tid(), customer: customer3._id,
        parcelType: "electronics", weight: 3.5, dimensions: { length: 40, width: 30, height: 20 },
        description: "Laptop - Extremely fragile",
        pickupAddress:   { name: "Amit Verma", phone: "9876543203", address: "55, MG Road",    city: "Bengaluru", state: "Karnataka", pincode: "560001" },
        deliveryAddress: { name: "Rohit Nair", phone: "9876500003", address: "88, Indiranagar", city: "Bengaluru", state: "Karnataka", pincode: "560038" },
        vehicleType: "mini_truck", status: "pending", paymentStatus: "pending", paymentMethod: "cash",
        pricing: { basePrice: 150, distanceCharge: 80, weightCharge: 35, tax: 26.5, discount: 0, total: 291.5 },
        distance: 8, estimatedDeliveryTime: "1 hr",
        trackingHistory: [{ status: "pending", message: "Order placed — waiting for driver", timestamp: new Date() }],
      },
      {
        trackingId: tid(), customer: customer1._id, driver: driver2._id,
        parcelType: "medium_package", weight: 5, dimensions: { length: 50, width: 40, height: 30 },
        description: "Clothing items",
        pickupAddress:   { name: "Rahul Sharma", phone: "9876543201", address: "456, BKC Tower", city: "Mumbai", state: "Maharashtra", pincode: "400051" },
        deliveryAddress: { name: "Kavita Mehta", phone: "9876500004", address: "22, Dadar West", city: "Mumbai", state: "Maharashtra", pincode: "400028" },
        vehicleType: "auto", status: "cancelled", paymentStatus: "refunded", paymentMethod: "online",
        pricing: { basePrice: 100, distanceCharge: 60, weightCharge: 50, tax: 21, discount: 0, total: 231 },
        distance: 10, cancelReason: "Customer not available at pickup", cancelledBy: customer1._id,
        trackingHistory: [
          { status: "pending",   message: "Order placed",                       timestamp: new Date(Date.now() - 2 * 86400000) },
          { status: "cancelled", message: "Cancelled: Customer not available",  timestamp: new Date(Date.now() - 86400000) },
        ],
      },
    ]);
    console.log("✅ Parcels created");
  } else {
    [parcel1, parcel2, parcel3, parcel4] = await Parcel.find({ customer: { $in: [customer1._id, customer2._id, customer3._id] } }).limit(4);
    console.log("⏭️  Parcels already exist — skipped");
  }

  // ── PAYMENTS ──────────────────────────────────────────────────────
  const paymentCount = await Payment.countDocuments({ customer: customer1._id });
  if (paymentCount === 0 && parcel1) {
    await Payment.insertMany([
      { parcel: parcel1._id, customer: customer1._id, driver: driver1._id, amount: 99,  currency: "INR", method: "online", gateway: "razorpay", gatewayOrderId: "order_test_001", gatewayPaymentId: "pay_test_001", gatewaySignature: "sig_test_001", status: "success",  paidAt: new Date(Date.now() - 86400000) },
      { parcel: parcel2._id, customer: customer2._id, driver: driver1._id, amount: 145, currency: "INR", method: "wallet", gateway: "wallet",   status: "success",  paidAt: new Date(Date.now() - 86400000) },
      { parcel: parcel4._id, customer: customer1._id,                      amount: 231, currency: "INR", method: "online", gateway: "razorpay", gatewayOrderId: "order_test_002", gatewayPaymentId: "pay_test_002", status: "refunded", refundAmount: 231, refundedAt: new Date() },
    ]);
    console.log("✅ Payments created");
  } else {
    console.log("⏭️  Payments already exist — skipped");
  }

  // ── RIDES ─────────────────────────────────────────────────────────
  const rideCount = await Ride.countDocuments({ customer: customer1._id });
  if (rideCount === 0) {
    const now = new Date();
    const yesterday = new Date(now - 86400000);
    const twoDaysAgo = new Date(now - 2 * 86400000);
    await Ride.insertMany([
      { rideId: rid(), customer: customer1._id, driver: driver1._id, rideType: "on_demand",        pickupLocation: { address: "123, Green Park Colony, Mumbai",              city: "Mumbai",    lat: 19.076,  lng: 72.8777 }, dropLocation: { address: "456, Andheri West, Mumbai",                        city: "Mumbai",    lat: 19.1197, lng: 72.8296 }, vehicleCategory: "sedan", passengers: 1, paymentMethod: "online", paymentStatus: "paid",    distance: 12, duration: 25, estimatedFare: 215, fare: { baseFare: 50, distanceCharge: 120, timeCharge: 50,  surgeMultiplier: 1.0, discount: 0, total: 215 }, status: "completed", otp: "4521", rating: 5, review: "Very smooth ride!",                  startedAt: twoDaysAgo, completedAt: new Date(twoDaysAgo.getTime() + 1800000) },
      { rideId: rid(), customer: customer2._id, driver: driver1._id, rideType: "herdrive",         pickupLocation: { address: "789, Lajpat Nagar, Delhi",                    city: "Delhi",     lat: 28.5672, lng: 77.2399 }, dropLocation: { address: "12, Connaught Place, Delhi",                       city: "Delhi",     lat: 28.6315, lng: 77.2195 }, vehicleCategory: "sedan", passengers: 1, paymentMethod: "wallet", paymentStatus: "paid",    distance: 8,  duration: 20, estimatedFare: 176, fare: { baseFare: 50, distanceCharge: 96,  timeCharge: 40,  surgeMultiplier: 1.1, discount: 0, total: 176 }, status: "completed", otp: "7832", rating: 4, review: "Safe HerDrive experience.",         startedAt: yesterday,   completedAt: new Date(yesterday.getTime() + 1500000) },
      { rideId: rid(), customer: customer1._id, driver: driver2._id, rideType: "airport_transfer", pickupLocation: { address: "456, BKC Tower, Mumbai",                      city: "Mumbai",    lat: 19.0595, lng: 72.8656 }, dropLocation: { address: "Chhatrapati Shivaji International Airport",        city: "Mumbai",    lat: 19.0896, lng: 72.8656 }, vehicleCategory: "suv",   passengers: 2, paymentMethod: "online", paymentStatus: "paid",    distance: 18, duration: 40, estimatedFare: 598, fare: { baseFare: 80, distanceCharge: 288, timeCharge: 100, surgeMultiplier: 1.3, discount: 0, total: 598 }, status: "completed", otp: "3391", rating: 5, review: "On time, great for airports!",      startedAt: twoDaysAgo, completedAt: new Date(twoDaysAgo.getTime() + 2400000) },
      { rideId: rid(), customer: customer2._id,                       rideType: "carpool",         pickupLocation: { address: "789, Lajpat Nagar, Delhi",                    city: "Delhi",     lat: 28.5672, lng: 77.2399 }, dropLocation: { address: "Cyber City, Gurugram",                             city: "Gurugram",  lat: 28.4949, lng: 77.089  }, vehicleCategory: "sedan", passengers: 3, paymentMethod: "cash",   paymentStatus: "pending", distance: 20, duration: 45, estimatedFare: 168, fare: { baseFare: 50, distanceCharge: 168, timeCharge: 67,  surgeMultiplier: 0.7, discount: 0, total: 168 }, status: "searching",  otp: "5512" },
      { rideId: rid(), customer: customer3._id,                       rideType: "night_safe",      pickupLocation: { address: "55, MG Road, Bengaluru",                      city: "Bengaluru", lat: 12.9716, lng: 77.5946 }, dropLocation: { address: "88, Indiranagar, Bengaluru",                       city: "Bengaluru", lat: 12.9784, lng: 77.6412 }, vehicleCategory: "sedan", passengers: 1, paymentMethod: "wallet", paymentStatus: "pending", distance: 6,  duration: 18, estimatedFare: 156, fare: { baseFare: 50, distanceCharge: 72,  timeCharge: 36,  surgeMultiplier: 1.2, discount: 0, total: 156 }, status: "cancelled",  otp: "9921", cancelReason: "No driver available", cancelledBy: customer3._id },
    ]);
    console.log("✅ Rides created");
  } else {
    console.log("⏭️  Rides already exist — skipped");
  }

  // ── NOTIFICATIONS ─────────────────────────────────────────────────
  const notifCount = await Notification.countDocuments({ user: customer1._id });
  if (notifCount === 0) {
    await Notification.insertMany([
      { user: customer1._id,  title: "Order Delivered!",      message: "Your parcel has been delivered successfully.",           type: "order",   isRead: true  },
      { user: customer1._id,  title: "Order Cancelled",       message: "Your parcel has been cancelled. Refund initiated.",      type: "order",   isRead: false },
      { user: customer2._id,  title: "Driver Assigned",       message: "Raju Yadav is on the way to pick up your parcel.",       type: "driver",  isRead: false },
      { user: customer3._id,  title: "Order Placed",          message: "Your parcel is placed. Waiting for driver.",            type: "order",   isRead: false },
      { user: driverUser1._id,title: "New Order!",            message: "New delivery request near Mumbai. Accept now.",          type: "order",   isRead: true  },
      { user: customer1._id,  title: "Special Offer!",        message: "Use code FLAT50 and get ₹50 off on your next order!",   type: "promo",   isRead: false },
      { user: customer2._id,  title: "Payment Successful",    message: "₹145 paid via wallet for your order.",                  type: "payment", isRead: true  },
    ]);
    console.log("✅ Notifications created");
  } else {
    console.log("⏭️  Notifications already exist — skipped");
  }

  // ── MERCHANTS ─────────────────────────────────────────────────────
  const merchant1 = await upsertOne(Merchant, { user: merchantU1._id }, {
    user: merchantU1._id, businessName: "Flipkart Quick Commerce", businessType: "ecommerce",
    gstin: "27AAPFU0939F1ZV", businessAddress: { street: "Embassy Tech Village", city: "Bengaluru", state: "Karnataka", pincode: "560103" },
    contactPerson: "Rahul Bansal", contactPhone: "9888800001", website: "https://flipkart.com",
    isApproved: true, totalOrders: 1240, totalSpend: 185000, walletBalance: 5000, commissionRate: 8,
    bankDetails: { accountNumber: "1234567890123", ifscCode: "HDFC0001234", bankName: "HDFC Bank", accountHolderName: "Flipkart Quick Commerce" },
  });
  await upsertOne(Merchant, { user: merchantU2._id }, {
    user: merchantU2._id, businessName: "MedPlus Pharmacy", businessType: "pharmacy",
    gstin: "29AABCM1234D1Z5", businessAddress: { street: "MG Road", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
    contactPerson: "Sanjay Mehta", contactPhone: "9888800002", website: "https://medplus.in",
    isApproved: false, totalOrders: 0, totalSpend: 0, walletBalance: 0, commissionRate: 10,
  });
  console.log("✅ Merchants upserted");

  // ── API KEYS ──────────────────────────────────────────────────────
  const keyCount = await ApiKey.countDocuments({ merchant: merchant1._id });
  if (keyCount === 0) {
    const [ak1, ak2] = await ApiKey.insertMany([
      { merchant: merchant1._id, name: "Production Key", key: "gp_production_" + crypto.randomBytes(20).toString("hex"), secret: "gps_" + crypto.randomBytes(32).toString("hex"), environment: "production", permissions: ["orders:read","orders:write","tracking:read","webhooks:write"], isActive: true, requestCount: 4821, webhookUrl: "https://flipkart.com/webhooks/goparcel", lastUsedAt: new Date() },
      { merchant: merchant1._id, name: "Test Key",       key: "gp_test_"       + crypto.randomBytes(20).toString("hex"), secret: "gps_" + crypto.randomBytes(32).toString("hex"), environment: "test",       permissions: ["orders:read","tracking:read"],                              isActive: true, requestCount: 132,  lastUsedAt: new Date(Date.now() - 86400000) },
    ]);
    console.log("✅ API Keys created");
  } else {
    console.log("⏭️  API Keys already exist — skipped");
  }

  // ── FLEET ─────────────────────────────────────────────────────────
  await upsertOne(Fleet, { merchant: merchant1._id, driver: driver1._id }, { merchant: merchant1._id, driver: driver1._id, status: "active", assignedZone: "Mumbai North", shift: "morning",   shiftStart: "09:00", shiftEnd: "18:00", totalDeliveries: 320, totalEarnings: 48000, joinedAt: new Date(Date.now() - 30 * 86400000) });
  await upsertOne(Fleet, { merchant: merchant1._id, driver: driver2._id }, { merchant: merchant1._id, driver: driver2._id, status: "active", assignedZone: "Mumbai South", shift: "afternoon", shiftStart: "13:00", shiftEnd: "22:00", totalDeliveries: 210, totalEarnings: 31500, joinedAt: new Date(Date.now() - 15 * 86400000) });
  console.log("✅ Fleet upserted");

  // ── PARTNERS ──────────────────────────────────────────────────────
  await upsertOne(Partner, { user: partnerU1._id }, { user: partnerU1._id, partnerType: "corporate", companyName: "Delhivery Corp",   contactPerson: "Amit Agarwal", contactPhone: "9777700001", contactEmail: "partner1@test.com", city: "Delhi",     state: "Delhi",        serviceAreas: ["Delhi","Noida","Gurugram","Faridabad"], expectedMonthlyOrders: 5000, hasOwnVehicles: true,  vehicleCount: 25, experience: "8 years in logistics",          status: "approved",     approvedAt: new Date(Date.now() - 15 * 86400000), commissionRate: 7,  totalEarnings: 285000, totalOrders: 3420 });
  await upsertOne(Partner, { user: partnerU2._id }, { user: partnerU2._id, partnerType: "agency",    companyName: "Shyam Logistics",  contactPerson: "Shyam Verma",  contactPhone: "9777700002", contactEmail: "partner2@test.com", city: "Mumbai",    state: "Maharashtra",  serviceAreas: ["Mumbai","Thane","Navi Mumbai"],         expectedMonthlyOrders: 800,  hasOwnVehicles: true,  vehicleCount: 8,  experience: "3 years in last-mile delivery", status: "under_review", commissionRate: 10 });
  await upsertOne(Partner, { user: partnerU3._id }, { user: partnerU3._id, partnerType: "individual",companyName: "",                 contactPerson: "Priya Sharma", contactPhone: "9777700003", contactEmail: "partner3@test.com", city: "Bengaluru", state: "Karnataka",    serviceAreas: ["Bengaluru"],                            expectedMonthlyOrders: 150,  hasOwnVehicles: false, vehicleCount: 0,  experience: "1 year freelance delivery",     status: "pending",      commissionRate: 12 });
  console.log("✅ Partners upserted");

  // ── TRAININGS ─────────────────────────────────────────────────────
  const t1 = await upsertOne(Training, { title: "Delivery Basics for New Drivers" }, {
    title: "Delivery Basics for New Drivers", description: "Complete guide for new delivery partners", category: "delivery_basics", targetRole: "driver", level: "beginner", totalDuration: 90, certificateAwarded: true, certificateName: "Certified Go Parcel Delivery Partner", enrolledCount: 245, completedCount: 198, isActive: true, thumbnailUrl: "https://via.placeholder.com/400x200?text=Delivery+Basics",
    modules: [
      { title: "Welcome to Go Parcel",      description: "Platform overview",               duration: 10, order: 1 },
      { title: "Using the Driver App",       description: "Step by step app walkthrough",   duration: 20, order: 2 },
      { title: "Picking Up a Parcel",        description: "Best practices for pickup",       duration: 15, order: 3 },
      { title: "Safe Delivery Tips",         description: "How to deliver safely",           duration: 20, order: 4 },
      { title: "Handling Customer Issues",   description: "What to do when things go wrong", duration: 15, order: 5 },
      { title: "Quiz & Certification",       description: "Final assessment",               duration: 10, order: 6 },
    ],
  });
  const t2 = await upsertOne(Training, { title: "Road Safety & Traffic Rules" }, {
    title: "Road Safety & Traffic Rules", description: "Essential safety training for drivers", category: "safety", targetRole: "driver", level: "beginner", totalDuration: 60, certificateAwarded: true, certificateName: "Go Parcel Safety Certified Driver", enrolledCount: 189, completedCount: 156, isActive: true, thumbnailUrl: "https://via.placeholder.com/400x200?text=Road+Safety",
    modules: [
      { title: "Traffic Rules Refresher", description: "Key traffic rules", duration: 20, order: 1 },
      { title: "Defensive Driving",       description: "Stay safe in traffic", duration: 20, order: 2 },
      { title: "Emergency Situations",    description: "Accidents & breakdowns", duration: 20, order: 3 },
    ],
  });
  const t3 = await upsertOne(Training, { title: "5-Star Customer Service" }, {
    title: "5-Star Customer Service", description: "Maintain 4.5+ rating and provide excellent experience", category: "customer_service", targetRole: "driver", level: "intermediate", totalDuration: 45, certificateAwarded: true, certificateName: "Go Parcel Customer Excellence Badge", enrolledCount: 312, completedCount: 278, isActive: true, thumbnailUrl: "https://via.placeholder.com/400x200?text=Customer+Service",
    modules: [
      { title: "Communication Skills", description: "Talk to customers professionally", duration: 15, order: 1 },
      { title: "Handling Complaints",  description: "Turn bad experience into good",    duration: 15, order: 2 },
      { title: "Building Your Rating", description: "Tips to maintain 4.5+ rating",     duration: 15, order: 3 },
    ],
  });
  await upsertOne(Training, { title: "HerDrive — Women Empowerment Training" }, {
    title: "HerDrive — Women Empowerment Training", description: "Special training for women drivers", category: "women_empowerment", targetRole: "driver", level: "beginner", totalDuration: 120, certificateAwarded: true, certificateName: "HerDrive Certified Driver", enrolledCount: 87, completedCount: 64, isActive: true, thumbnailUrl: "https://via.placeholder.com/400x200?text=HerDrive",
    modules: [
      { title: "Welcome to HerDrive",      description: "What is HerDrive",             duration: 15, order: 1 },
      { title: "Personal Safety on Road",  description: "Safety tips for women drivers", duration: 25, order: 2 },
      { title: "Using SOS & Safety Tools", description: "App safety features",           duration: 20, order: 3 },
      { title: "Maximizing Earnings",      description: "Peak hours, bonuses",           duration: 20, order: 4 },
      { title: "Self Defense Basics",      description: "Basic self defense awareness",  duration: 25, order: 5 },
      { title: "Certification Test",       description: "Final assessment",              duration: 15, order: 6 },
    ],
  });
  await upsertOne(Training, { title: "Partner Onboarding & Fleet Management" }, {
    title: "Partner Onboarding & Fleet Management", description: "For new Go Parcel partners", category: "delivery_basics", targetRole: "partner", level: "intermediate", totalDuration: 75, certificateAwarded: true, certificateName: "Go Parcel Certified Partner", enrolledCount: 42, completedCount: 35, isActive: true, thumbnailUrl: "https://via.placeholder.com/400x200?text=Partner+Training",
    modules: [
      { title: "Partner Dashboard Overview", description: "Use your merchant dashboard",    duration: 15, order: 1 },
      { title: "Managing Your Fleet",        description: "Add drivers, assign zones",      duration: 20, order: 2 },
      { title: "API Integration Guide",      description: "Connect to GoParcel API",        duration: 25, order: 3 },
      { title: "Revenue & Commissions",      description: "Understanding your earnings",    duration: 15, order: 4 },
    ],
  });
  console.log("✅ Trainings upserted");

  // ── ENROLLMENTS ───────────────────────────────────────────────────
  await upsertOne(Enrollment, { user: driverUser1._id, training: t1._id }, { user: driverUser1._id, training: t1._id, status: "completed",   progress: 100, completedModules: t1.modules.map(m => m._id), startedAt: new Date(Date.now() - 20 * 86400000), completedAt: new Date(Date.now() - 18 * 86400000), certificateUrl: "https://certificates.goparcel.com/cert_raju_basics.pdf", score: 92 });
  await upsertOne(Enrollment, { user: driverUser1._id, training: t2._id }, { user: driverUser1._id, training: t2._id, status: "in_progress", progress: 66,  completedModules: [t2.modules[0]._id, t2.modules[1]._id], startedAt: new Date(Date.now() - 5 * 86400000) });
  await upsertOne(Enrollment, { user: driverUser2._id, training: t1._id }, { user: driverUser2._id, training: t1._id, status: "completed",   progress: 100, completedModules: t1.modules.map(m => m._id), startedAt: new Date(Date.now() - 10 * 86400000), completedAt: new Date(Date.now() - 8 * 86400000), certificateUrl: "https://certificates.goparcel.com/cert_suresh_basics.pdf", score: 85 });
  await upsertOne(Enrollment, { user: driverUser2._id, training: t3._id }, { user: driverUser2._id, training: t3._id, status: "enrolled",    progress: 0,   startedAt: new Date() });
  console.log("✅ Enrollments upserted");

  // ── WOMEN PROGRAM ─────────────────────────────────────────────────
  await upsertOne(WomenProgram, { user: womenU._id }, {
    driver: womenDriver._id, user: womenU._id, programType: "herdrive", status: "active",
    workPreference: "day_only", emergencyContact: "9855500099",
    benefits: { higherEarnings: true, priorityOrders: true, safetyKit: true, freeTraining: true, insuranceCover: true },
    safetyFeatures: { sosEnabled: true, liveTracking: true, tripSharing: true },
    totalHerDriveRides: 68, totalEarningsFromProgram: 12400, rating: 4.9,
    joinedAt: new Date(Date.now() - 45 * 86400000),
  });
  console.log("✅ Women Program upserted");

  // ── SUMMARY ───────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════");
  console.log("         SEED COMPLETE — ALL TEST CREDENTIALS");
  console.log("══════════════════════════════════════════════════");
  console.log("\n🔑 ADMIN");
  console.log("   admin@goparcel.com       | Admin@123");
  console.log("\n👤 CUSTOMERS");
  console.log("   rahul@test.com           | Test@1234 | Wallet ₹500");
  console.log("   priya@test.com           | Test@1234 | Wallet ₹250");
  console.log("   amit@test.com            | Test@1234 | Wallet ₹100");
  console.log("\n🚗 DRIVERS");
  console.log("   driver1@test.com         | Test@1234 | Bike  | Approved ✅ | Online");
  console.log("   driver2@test.com         | Test@1234 | Auto  | Approved ✅ | Offline");
  console.log("   driver3@test.com         | Test@1234 | Truck | Pending  ⏳");
  console.log("   sunita@test.com          | Test@1234 | Bike  | HerDrive ✅ | Rating 4.9");
  console.log("\n🏢 MERCHANTS");
  console.log("   merchant1@test.com       | Test@1234 | Flipkart Quick Commerce | Approved ✅");
  console.log("   merchant2@test.com       | Test@1234 | MedPlus Pharmacy        | Pending  ⏳");
  console.log("\n🤝 PARTNERS");
  console.log("   partner1@test.com        | Test@1234 | Delhivery Corp   | Approved ✅");
  console.log("   partner2@test.com        | Test@1234 | Shyam Logistics  | Under Review 🔍");
  console.log("   partner3@test.com        | Test@1234 | Priya Courier    | Pending  ⏳");
  console.log("\n📚 TRAININGS: 5 courses seeded");
  console.log("🎟️  PROMOS:    SAVE20 | FLAT50 | WELCOME10(expired)");
  console.log("══════════════════════════════════════════════════\n");

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
