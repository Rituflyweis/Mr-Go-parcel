# Go Parcel — Architecture & API Documentation

**Version:** 1.0.0  
**Stack:** Node.js · Express.js · MongoDB Atlas · Socket.IO  
**Base URL:** `http://your-server-ip:5000`

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                 │
│                                                                 │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│   │  Customer    │   │  Driver App  │   │  Admin Panel │       │
│   │  Mobile App  │   │  Mobile App  │   │  Web Panel   │       │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘       │
└──────────┼──────────────────┼──────────────────┼───────────────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              │  HTTPS / REST + WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXPRESS SERVER (Port 5000)                 │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   Helmet    │  │     CORS     │  │   Rate Limiter         │ │
│  │  (Security) │  │  (*)  open  │  │  100 req / 15 min      │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    MIDDLEWARE CHAIN                      │   │
│  │                                                          │   │
│  │  Request → Morgan Log → Body Parser → Auth (JWT)         │   │
│  │         → Role Check → Controller → Response             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                       ROUTES                             │   │
│  │                                                          │   │
│  │  /api/auth          /api/parcel      /api/payment        │   │
│  │  /api/driver        /api/admin       /api/address        │   │
│  │  /api/notifications                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   SOCKET.IO SERVER                       │   │
│  │         Real-time driver location tracking               │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  MongoDB     │  │  Cloudinary  │  │   Nodemailer │
│  Atlas       │  │  (Images)    │  │   (OTP Email)│
│  (Database)  │  └──────────────┘  └──────────────┘
└──────────────┘
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                        COLLECTIONS                              │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  USER                                                  │     │
│  │  _id · name · email · phone · password(hashed)         │     │
│  │  role(customer|driver|admin) · isVerified · isBlocked  │     │
│  │  otp · otpExpiry · wallet · referralCode · fcmToken    │     │
│  └──────────────────────┬─────────────────────────────────┘     │
│                         │ 1                                     │
│              ┌──────────┴──────────────────┐                    │
│              │ 1                           │ many               │
│  ┌───────────▼──────────┐    ┌─────────────▼──────────────┐     │
│  │  DRIVER              │    │  PARCEL                    │     │
│  │  user(ref)           │    │  trackingId · customer(ref)│     │
│  │  vehicleType         │    │  driver(ref) · parcelType  │     │
│  │  vehicleNumber       │    │  weight · dimensions       │     │
│  │  licenseNumber       │    │  pickupAddress             │     │
│  │  isApproved          │    │  deliveryAddress           │     │
│  │  isOnline            │    │  status · paymentStatus    │     │
│  │  currentLocation     │    │  paymentMethod · pricing   │     │
│  │  totalEarnings       │    │  trackingHistory[]         │     │
│  │  bankDetails         │    │  promoCode · isInsured     │     │
│  └───────────┬──────────┘    └─────────────┬──────────────┘     │
│              │                             │                    │
│              │              ┌──────────────┘                    │
│              │              │                                   │
│  ┌───────────▼──────────────▼──────────────────────────────┐    │
│  │  PAYMENT                                                │    │
│  │  parcel(ref) · customer(ref) · driver(ref)              │    │
│  │  amount · method(cash|online|wallet)                    │    │
│  │  gateway(razorpay|stripe|wallet|cash)                   │    │
│  │  gatewayOrderId · gatewayPaymentId · status             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  ADDRESS         │  │ NOTIFICATION │  │   PROMO CODE    │   │
│  │  user(ref)       │  │  user(ref)   │  │   code          │   │
│  │  label · name    │  │  title · msg │  │   discountType  │   │
│  │  address · city  │  │  type · read │  │   discountValue │   │
│  │  isDefault       │  └──────────────┘  │   validTill     │   │
│  └──────────────────┘                    └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Roles & Permissions

```
┌──────────────────────────────────────────────────────────┐
│  customer  →  Register → Verify OTP → Login              │
│               Create Parcel · Track · Pay · Rate         │
│                                                          │
│  driver    →  Register → Verify OTP → Login              │
│               Submit Docs → Admin Approve                │
│               Accept Orders · Update Status · Earnings   │
│                                                          │
│  admin     →  Seeded via script (no public register)     │
│               Manage Users · Drivers · Orders · Promos   │
└──────────────────────────────────────────────────────────┘
```

---

## Auth Flow

```
REGISTER:
  POST /api/auth/register → OTP sent to email → userId returned
        ↓
  POST /api/auth/verify-otp (otp or default "1234") → JWT Token
        ↓
  POST /api/auth/login → JWT Token (on subsequent logins)


FORGOT PASSWORD:
  POST /api/auth/send-otp / resend-otp → OTP on email
        ↓
  POST /api/auth/reset-password (userId + otp + newPassword)


ADMIN:
  Seeded automatically on server start
  Email: admin@goparcel.com  |  Password: Admin@123
```

---

## Order Lifecycle

```
  [Customer]          [Admin]           [Driver]
     │                  │                  │
     ▼                  │                  │
  Create Parcel         │                  │
  (status: pending)     │                  │
     │                  │                  │
     │         Assign Driver ◄─────────────┤
     │         (driver_assigned)           │
     │                  │                  │
     │                  │          Accept Order
     │                  │          (accepted)
     │                  │                  │
     │                  │          Pick Up Parcel
     │                  │          (picked_up)
     │                  │                  │
     │                  │          In Transit
     │                  │          (in_transit)
     │                  │                  │
     │                  │          Out for Delivery
     │                  │          (out_for_delivery)
     │                  │                  │
     ▼                  │                  ▼
  Rate Delivery ◄───────────────── Delivered
```

---

## Payment Flow

```
  ONLINE (Razorpay):
    POST /payment/create-order → razorpay order_id
         ↓ (frontend opens Razorpay SDK)
    POST /payment/verify → signature check → payment marked paid

  WALLET:
    POST /payment/wallet/add → add balance to user.wallet
    POST /payment/wallet/pay → deduct from wallet on order

  CASH:
    No API call needed — marked paid on delivery by driver
```

---

## API Reference

### 🔐 Auth  `BASE_URL/api/auth`

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/register` | ❌ | `name, email, phone, password, role` |
| POST | `/verify-otp` | ❌ | `userId, otp` (default: **1234**) |
| POST | `/resend-otp` | ❌ | `email` or `phone` |
| POST | `/login` | ❌ | `email/phone, password` |
| POST | `/send-otp` | ❌ | `email` or `phone` |
| POST | `/reset-password` | ❌ | `userId, otp, newPassword` |
| GET | `/me` | ✅ | — |
| PUT | `/update-profile` | ✅ | `name, address, fcmToken, profileImage(file)` |
| PUT | `/change-password` | ✅ | `currentPassword, newPassword` |

---

### 📦 Parcel  `BASE_URL/api/parcel`

| Method | Endpoint | Auth | Body / Params |
|--------|----------|------|---------------|
| GET | `/track/:trackingId` | ❌ | — |
| POST | `/price-estimate` | ✅ | `vehicleType, weight, distance` |
| POST | `/create` | ✅ | `parcelType, weight, pickupAddress, deliveryAddress, vehicleType, paymentMethod, distance, parcelImage(file)` |
| GET | `/my-orders` | ✅ | query: `status, page, limit` |
| GET | `/:id` | ✅ | — |
| PUT | `/:id/cancel` | ✅ | `reason` |
| POST | `/:id/rate` | ✅ | `rating, review` |

**vehicleType:** `bike` · `auto` · `mini_truck` · `tempo` · `truck`  
**parcelType:** `document` · `small_package` · `medium_package` · `large_package` · `fragile` · `electronics`  
**status:** `pending` · `driver_assigned` · `picked_up` · `in_transit` · `out_for_delivery` · `delivered` · `cancelled` · `failed`

---

### 💳 Payment  `BASE_URL/api/payment`

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/create-order` | ✅ | `parcelId` |
| POST | `/verify` | ✅ | `razorpay_order_id, razorpay_payment_id, razorpay_signature, parcelId` |
| POST | `/wallet/add` | ✅ | `amount` |
| POST | `/wallet/pay` | ✅ | `parcelId` |
| GET | `/history` | ✅ | — |

---

### 🚗 Driver  `BASE_URL/api/driver`

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/register` | ✅ | `vehicleType, vehicleNumber, vehicleModel, licenseNumber, aadharNumber, panNumber` + files: `licenseImage, vehicleImage, aadharImage, panImage` |
| PUT | `/location` | ✅ Driver | `latitude, longitude` |
| PUT | `/toggle-online` | ✅ Driver | — |
| GET | `/my-orders` | ✅ Driver | query: `status, page, limit` |
| PUT | `/order/:parcelId/accept` | ✅ Driver | — |
| PUT | `/order/:parcelId/update-status` | ✅ Driver | `status, message, location` |
| GET | `/earnings` | ✅ Driver | query: `period` (today · week · month · all) |
| PUT | `/bank-details` | ✅ Driver | `accountNumber, ifscCode, bankName, accountHolderName` |

---

### 🛡️ Admin  `BASE_URL/api/admin`

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| GET | `/dashboard` | ✅ Admin | — |
| GET | `/revenue` | ✅ Admin | query: `period` (day · week · month) |
| GET | `/users` | ✅ Admin | query: `role, search, page, limit` |
| PUT | `/users/:id/block` | ✅ Admin | `isBlocked: true/false` |
| GET | `/drivers` | ✅ Admin | query: `isApproved, page, limit` |
| PUT | `/drivers/:id/approve` | ✅ Admin | `isApproved: true/false` |
| GET | `/orders` | ✅ Admin | query: `status, search, page, limit` |
| PUT | `/orders/:id/assign-driver` | ✅ Admin | `driverId` |
| POST | `/promo` | ✅ Admin | `code, discountType(flat·percentage), discountValue, maxDiscount, minOrderAmount, validFrom, validTill` |
| GET | `/promo` | ✅ Admin | — |
| PUT | `/promo/:id` | ✅ Admin | any promo fields |
| DELETE | `/promo/:id` | ✅ Admin | — |

---

### 📍 Address  `BASE_URL/api/address`

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| GET | `/` | ✅ | — |
| POST | `/` | ✅ | `label(home·office·other), name, phone, address, city, state, pincode, lat, lng, isDefault` |
| PUT | `/:id` | ✅ | any address fields |
| DELETE | `/:id` | ✅ | — |

---

### 🔔 Notifications  `BASE_URL/api/notifications`

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/` | ✅ |
| PUT | `/mark-read` | ✅ |
| PUT | `/:id/read` | ✅ |
| DELETE | `/:id` | ✅ |

---

## Request Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json           (for JSON body)
Content-Type: multipart/form-data        (for file uploads)
```

## Standard Response Format

```json
// Success
{
  "success": true,
  "message": "...",
  "data": { ... }
}

// Error
{
  "success": false,
  "message": "error reason"
}
```

## Environment Variables

| Key | Description |
|-----|-------------|
| `PORT` | Server port (default 5000) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRE` | Token expiry (e.g. `7d`) |
| `EMAIL_HOST` | SMTP host (smtp.gmail.com) |
| `EMAIL_PORT` | SMTP port (587) |
| `EMAIL_USER` | Sender email address |
| `EMAIL_PASS` | Gmail App Password (16-digit) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `RAZORPAY_KEY_ID` | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret |
| `CLIENT_URL` | Frontend URL for CORS |

---

*Go Parcel Technologies — Internal API Documentation*
