# 🔧 StyleDecor – Backend API

Smart Home & Ceremony Decoration Booking System

## 🌐 Live API URL

https://style-home-decor-server.vercel.app/

> This is the backend server for the **StyleDecor** platform, responsible for handling authentication, bookings, services, decorators, payments, and role-based access control.

---

## 📌 Project Overview

StyleDecor Backend is a RESTful API built to support a real-world decoration booking system.  
It manages users, decorators, services, bookings, payments, and project workflow statuses.

The backend is designed with **security, scalability, and role-based authorization** in mind and is deployed on **Vercel**.

---

## 🎯 Core Functionalities

### 🔐 Authentication & Authorization

- JWT-based authentication
- Secure token verification middleware
- Role-based access control:
  - Admin
  - User
  - Decorator

---

### 👤 User Management

- User registration (handled via Firebase on client)
- JWT token generation
- Role update (Admin can make a user Decorator)
- User role verification

---

### 🎨 Decorator Management

- Admin can:
  - View all decorators
  - Approve / disable decorator accounts
- Decorators can:
  - View assigned projects
  - Update service workflow status
  - Track completed projects & earnings

---

### 🛠 Service Management

- Create decoration services (Admin only)
- Update services
- Delete services
- Fetch all services
- Fetch single service by ID
- Category-based service handling

---

### 📅 Booking Management

- Create booking (User)
- View bookings (role-based)
- Cancel booking (before payment/assignment)
- Assign decorator (Admin only)
- Update booking workflow status (Decorator)
- Booking lifecycle maintained as per assignment:
  - Assigned
  - Planning Phase
  - Materials Prepared
  - On the Way to Venue
  - Setup in Progress
  - Completed

---

### 💳 Payment System

- Stripe payment integration
- Create payment intent
- Store transaction history
- Track payment status
- Revenue calculation

---

### 📊 Analytics Support

- Total bookings
- Completed projects
- Revenue data
- Service demand overview (API-ready)

---

## 🧱 Technology Stack

- Node.js
- Express.js
- MongoDB (Atlas)
- JSON Web Token (JWT)
- Stripe
- dotenv
- CORS

---

## 📦 NPM Packages Used

- express
- mongodb
- cors
- jsonwebtoken
- dotenv
- stripe

---

## 🔐 Environment Variables

Create a `.env` file in the root directory and add:

```env
PORT=5000
DB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```
