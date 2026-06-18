# Go Parcel — Production-Grade Scalable Architecture

---

## The Core Principle

> Build as a **Modular Monolith** today. Each module is isolated enough to extract into a microservice tomorrow — without rewriting the business logic.

This approach avoids premature complexity while keeping future scaling paths open.

---

## 1. System Overview

```
                         INTERNET
                            │
                            ▼
              ┌─────────────────────────┐
              │    Cloudflare (CDN)      │
              │  DDoS · SSL · WAF · Cache│
              └────────────┬────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │      Nginx (Gateway)     │
              │  Rate Limit · Routing    │
              │  Load Balance · Compress │
              └──────┬──────────┬────────┘
                     │          │
           ┌─────────▼──┐  ┌────▼──────────┐
           │  REST API   │  │  Socket.IO    │
           │  (Express)  │  │  (Real-time)  │
           │  PM2 Cluster│  │  PM2 Cluster  │
           └─────────────┘  └───────────────┘
                  │                │
                  └────────┬───────┘
                           │
           ┌───────────────▼───────────────┐
           │          Redis                │
           │  Cache · Queue · Pub/Sub      │
           │  Session · Rate Limit         │
           └───────────────┬───────────────┘
                           │
           ┌───────────────▼───────────────┐
           │       MongoDB Atlas            │
           │  Primary + 2 Secondaries      │
           │  Automatic Failover           │
           └───────────────────────────────┘
```

---

## 2. Application Architecture (Modular Monolith)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GO PARCEL API SERVER                            │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     API GATEWAY LAYER                           │   │
│  │  Nginx → Rate Limit → Auth Middleware → Request Validation      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                  │                                      │
│  ┌───────────┬──────────┬─────────┴──┬────────────┬────────────────┐    │
│  │           │          │            │            │                │    │
│  ▼           ▼          ▼            ▼            ▼                ▼    │
│ ┌─────┐  ┌──────┐  ┌────────┐  ┌─────────┐  ┌────────┐  ┌──────────┐  │
│ │Auth │  │Order │  │ Driver │  │ Payment │  │ Admin  │  │Notif-    │  │
│ │Svc  │  │ Svc  │  │  Svc   │  │   Svc   │  │  Svc   │  │ication   │  │
│ └──┬──┘  └──┬───┘  └────┬───┘  └────┬────┘  └────┬───┘  │  Svc     │  │
│    │        │           │           │             │      └────┬─────┘  │
│    └────────┴───────────┴───────────┴─────────────┴──────────┘         │
│                                  │                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     SHARED INFRASTRUCTURE                       │   │
│  │   Redis Client · Mongoose ODM · Logger · Queue Publisher        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Folder Structure

```
go-parcel-api/
│
├── src/
│   ├── modules/                    ← Each module = isolated service
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js     ← Business logic here
│   │   │   └── auth.validator.js
│   │   │
│   │   ├── order/
│   │   │   ├── order.routes.js
│   │   │   ├── order.controller.js
│   │   │   └── order.service.js
│   │   │
│   │   ├── driver/
│   │   ├── payment/
│   │   ├── admin/
│   │   └── notification/
│   │
│   ├── models/                     ← Mongoose schemas
│   │   ├── User.js
│   │   ├── Driver.js
│   │   ├── Parcel.js
│   │   ├── Payment.js
│   │   └── Notification.js
│   │
│   ├── middleware/
│   │   ├── auth.js                 ← JWT verify
│   │   ├── rateLimiter.js          ← Per-route limits via Redis
│   │   ├── validate.js             ← Input validation
│   │   └── errorHandler.js
│   │
│   ├── infrastructure/
│   │   ├── database.js             ← MongoDB connection pool
│   │   ├── redis.js                ← Redis client singleton
│   │   ├── queue.js                ← BullMQ setup
│   │   └── socket.js               ← Socket.IO + Redis Adapter
│   │
│   ├── workers/                    ← Background job processors
│   │   ├── email.worker.js
│   │   ├── notification.worker.js
│   │   └── sms.worker.js
│   │
│   └── utils/
│       ├── response.js
│       ├── logger.js               ← Winston structured logs
│       └── generateOTP.js
│
├── scripts/
│   ├── seedData.js
│   └── createAdmin.js
│
├── ecosystem.config.js             ← PM2 cluster config
├── nginx.conf                      ← Nginx reverse proxy config
├── Dockerfile
├── docker-compose.yml
├── app.js
└── server.js
```

---

## 4. Data Flow — Order Creation (End-to-End)

```
Customer App
     │
     │ POST /api/parcel/create
     ▼
Nginx (Rate Limit check)
     │
     ▼
Auth Middleware (JWT verify → attach user)
     │
     ▼
Validator (check required fields)
     │
     ▼
Order Controller
     │
     ├──▶ Order Service
     │         │
     │         ├──▶ Apply Promo Code (if any) → PromoCode model
     │         ├──▶ Calculate Price
     │         ├──▶ Save to MongoDB (Parcel collection)
     │         └──▶ Publish Event to Redis Queue
     │                   │
     │         ┌─────────┴─────────────────┐
     │         ▼                           ▼
     │   Email Worker               Notification Worker
     │   (Order confirmation)       (Push to customer FCM)
     │
     ▼
Response → { trackingId, pricing, status: "pending" }
     │
     ▼
Socket.IO broadcast → Admin dashboard gets new order ping
```

---

## 5. Real-Time Architecture (Driver Tracking)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REAL-TIME FLOW                                   │
│                                                                     │
│  [Driver App]                    [Customer App]                     │
│      │                                  ▲                          │
│      │ emit('location_update')          │ on('driver_location')    │
│      │ { lat, lng, orderId }            │ { lat, lng, eta }        │
│      ▼                                  │                          │
│  [Socket Server 1]  ←── Redis ──▶  [Socket Server 2]              │
│       Pub/Sub (driver:location channel)                             │
│                                                                     │
│  WHY Redis Pub/Sub?                                                 │
│  Without it: Customer on Server-1, Driver on Server-2              │
│              → location update NEVER reaches customer               │
│  With it:    Both servers share events → works always              │
│                                                                     │
│  Socket Events:                                                     │
│  ─────────────                                                      │
│  location_update       → driver sends GPS every 5 sec              │
│  order_status_change   → driver picks up / delivers                 │
│  new_order_request     → notify nearby available drivers            │
│  order_accepted        → customer notified, tracking starts         │
│  driver_arrived        → driver at pickup point                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Caching Strategy (Redis)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WHAT TO CACHE IN REDIS                         │
│                                                                     │
│  Key Pattern              │ TTL      │ Why                          │
│  ─────────────────────────┼──────────┼──────────────────────────── │
│  otp:{userId}             │ 10 min   │ OTP verification             │
│  session:{userId}         │ 7 days   │ JWT token validation         │
│  rate:{ip}:{route}        │ 15 min   │ Rate limiting per IP         │
│  driver:loc:{driverId}    │ 30 sec   │ Live driver location         │
│  price:{vehicleType}:{km} │ 5 min    │ Avoid recalculating          │
│  admin:dashboard          │ 1 hour   │ Heavy aggregation query      │
│  promo:{code}             │ 1 hour   │ Promo code validation        │
│                                                                     │
│  DO NOT cache:                                                      │
│  • Payment data (always fresh from DB)                              │
│  • Order status (real-time accuracy needed)                         │
│  • User profile during active session                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Queue Architecture (Background Jobs)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     JOB QUEUE (BullMQ + Redis)                     │
│                                                                     │
│  Producers (API handlers add jobs):                                 │
│                                                                     │
│  register()     ──▶ email-queue     ──▶ Email Worker               │
│                                         (Nodemailer / SendGrid)    │
│                                                                     │
│  createOrder()  ──▶ notif-queue     ──▶ Notification Worker        │
│                                         (Firebase FCM)             │
│                                                                     │
│  sendOTP()      ──▶ sms-queue       ──▶ SMS Worker                 │
│                                         (Twilio / MSG91)           │
│                                                                     │
│  BENEFITS:                                                          │
│  • API responds in <50ms (doesn't wait for email/SMS)              │
│  • Failed jobs auto-retry (3 attempts, exponential backoff)        │
│  • Job monitoring via Bull Board dashboard                          │
│  • Zero message loss — Redis persists queue                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Database Design Decisions

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MONGODB SCALING DECISIONS                        │
│                                                                     │
│  READ vs WRITE split:                                               │
│  ────────────────────                                               │
│  Writes  → Primary node only                                        │
│  Reads   → Secondary nodes (reports, listings, admin dashboard)    │
│                                                                     │
│  Indexes (critical for performance):                                │
│  ────────────────────────────────────                               │
│  User       → email (unique), phone (unique)                        │
│  Parcel     → customer, driver, status, trackingId, createdAt      │
│  Driver     → user, isApproved, isOnline, currentLocation(2dsphere)│
│  Payment    → customer, parcel, status                              │
│  Notif      → user, isRead, createdAt                               │
│                                                                     │
│  Compound indexes for common queries:                               │
│  ─────────────────────────────────────                              │
│  Parcel: { customer: 1, status: 1, createdAt: -1 }                 │
│  Parcel: { driver: 1, status: 1 }                                   │
│  Driver: { isApproved: 1, isOnline: 1, isAvailable: 1 }            │
│                                                                     │
│  Atlas Tier Recommendation:                                         │
│  ────────────────────────────                                       │
│  Development  →  M0 (free)                                          │
│  Staging      →  M10 ($57/mo)                                       │
│  Production   →  M30 ($210/mo) + 2 replicas                        │
│  High traffic →  M50 + Sharding by region                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Rate Limiting (Per Route)

```
Route                    Limit              Window     Store
─────────────────────────────────────────────────────────────
POST /auth/register      5 requests         15 min     Redis
POST /auth/login         10 requests        15 min     Redis
POST /auth/resend-otp    3 requests         10 min     Redis
POST /parcel/create      20 requests        1 hour     Redis
GET  /parcel/*           100 requests       15 min     Redis
POST /payment/*          10 requests        1 hour     Redis
GET  /admin/*            200 requests       15 min     Redis
ALL  /api/*              500 requests       15 min     Redis
```

---

## 10. Security Checklist

```
✅ HTTPS only — enforce via Nginx redirect
✅ Helmet.js — security headers on all responses
✅ CORS — whitelist specific domains, not *
✅ JWT — HS256, 7-day expiry, stored in HttpOnly cookie
✅ Passwords — bcrypt, 10 rounds
✅ OTP — 6-digit, expires in 10 min, Redis stored
✅ Rate limiting — per IP per route via Redis
✅ Input validation — express-validator on all POST/PUT
✅ MongoDB injection — Mongoose sanitizes by default
✅ Sensitive fields — select:false on password, otp
✅ File uploads — type check + size limit (5MB max)
✅ Env secrets — never in code, always in .env / Secrets Manager
✅ DB access — IP whitelist on MongoDB Atlas
```

---

## 11. Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────────────┐
│                        OBSERVABILITY STACK                         │
│                                                                     │
│  Logs      → Winston (JSON format) → CloudWatch / Papertrail       │
│  Metrics   → PM2 Monit → CPU, Memory, Request rate per worker      │
│  Errors    → Sentry.io (real-time error tracking + stack trace)    │
│  Uptime    → UptimeRobot (ping every 5 min, alert on down)         │
│  DB        → MongoDB Atlas built-in monitoring                      │
│  Queue     → Bull Board (visual job queue dashboard)               │
│                                                                     │
│  Alerts trigger when:                                               │
│  • Response time > 2 seconds                                        │
│  • Error rate > 1%                                                  │
│  • MongoDB connection pool > 80%                                    │
│  • Redis memory > 70%                                               │
│  • PM2 worker restarts > 3 times in 1 min                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 12. Deployment Pipeline

```
Developer → git push → GitHub
                          │
                          ▼
                   GitHub Actions CI
                    ├── npm install
                    ├── lint check
                    ├── run tests
                    └── build Docker image
                          │
                          ▼
                   Docker Registry
                   (ECR / Docker Hub)
                          │
                          ▼
              ┌───────────────────────┐
              │   Production Server   │
              │                       │
              │  docker pull image    │
              │  pm2 reload all       │
              │  Zero-downtime deploy │
              └───────────────────────┘
```

---

## 13. Scaling Triggers — When to Scale What

```
Traffic Level    Users/day    Action
─────────────────────────────────────────────────────────────────
Phase 1          < 1,000      Current setup (single server + PM2)
Phase 2          < 10,000     Add Redis cache + BullMQ queues
Phase 3          < 50,000     Add second EC2 + Nginx load balance
Phase 4          < 200,000    MongoDB M30 + read replica routing
Phase 5          < 1M         Microservices split (Auth, Order, Driver separate)
Phase 6          > 1M         Kubernetes + auto-scaling + Kafka
```

---

## 14. Tech Stack — Final Recommendation

```
Layer              Current           Recommended (Scale)
─────────────────────────────────────────────────────────
Runtime            Node.js           Node.js 20 LTS
Framework          Express.js        Express.js 5
Process Manager    —                 PM2 Cluster (max cores)
Reverse Proxy      —                 Nginx
Database           MongoDB Atlas M0  MongoDB Atlas M10+
Cache              —                 Redis (Upstash / ElastiCache)
Queue              —                 BullMQ + Redis
Real-time          Socket.IO         Socket.IO + Redis Adapter
Auth               JWT               JWT + Redis session
File Upload        Cloudinary        Cloudinary (direct upload)
Email              Nodemailer        SendGrid / Nodemailer via Queue
SMS                —                 MSG91 / Twilio (via Queue)
Push Notif         —                 Firebase FCM (via Queue)
Payment            Razorpay          Razorpay (+ Stripe fallback)
Logging            console.log       Winston → CloudWatch
Error Tracking     —                 Sentry.io
Uptime Monitor     —                 UptimeRobot
CDN                —                 Cloudflare
CI/CD              —                 GitHub Actions + Docker
Hosting            Local             AWS EC2 / Railway / Render
```

---

## 15. Immediate Action Items (Priority Order)

```
Priority 1 — Do Now (No extra cost)
  ✅ PM2 cluster mode (already have PM2)
  ✅ Proper error logging (Winston)
  ✅ Per-route rate limiting
  ✅ Input validation on all routes
  ✅ CORS whitelist (not *)

Priority 2 — Do Before Launch
  □ Redis for OTP + session (Upstash free tier available)
  □ BullMQ for email/SMS queue
  □ Firebase FCM push notifications
  □ Sentry.io error tracking (free tier)

Priority 3 — After 1000+ Users
  □ MongoDB Atlas upgrade M10
  □ Redis for caching (driver location, admin stats)
  □ Nginx load balancer with second server
  □ Socket.IO Redis Adapter

Priority 4 — At Scale (10,000+ users)
  □ Split into microservices
  □ Kubernetes orchestration
  □ Message broker (Kafka / RabbitMQ)
  □ Database read/write splitting
```

---

*Go Parcel Technologies — Scalable Architecture v2.0*
*"Build for today, design for tomorrow"*
