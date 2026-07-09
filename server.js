require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Socket.IO for real-time tracking
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Driver joins their room to receive orders
  socket.on("join_driver", (driverId) => {
    socket.join(`driver_${driverId}`);
    console.log(`Driver ${driverId} joined room`);
  });

  // Customer joins their order tracking room
  socket.on("track_parcel", (parcelId) => {
    socket.join(`parcel_${parcelId}`);
    console.log(`Tracking parcel ${parcelId}`);
  });

  // Customer joins their own support chat room; admins join the shared inbox room
  socket.on("join_support_chat", (userId) => {
    socket.join(`support_${userId}`);
  });
  socket.on("join_support_admin", () => {
    socket.join("support_admin");
  });

  // Driver sends live location
  socket.on("driver_location", ({ parcelId, latitude, longitude }) => {
    io.to(`parcel_${parcelId}`).emit("location_update", { latitude, longitude });
  });

  // Broadcast new order to available drivers
  socket.on("new_order", (data) => {
    io.emit("order_available", data);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// Make io accessible globally
app.set("io", io);

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`✅ Go Parcel Server running on port ${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
  });
});
