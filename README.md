# Relief-Net 🌐

_A disaster relief web platform designed to connect people in need with volunteers who can offer help._

---

## 🌍 Overview

Relief-Net is a web application that bridges the gap between **aid seekers** and **volunteers**.  
Our mission is to make disaster relief faster, fairer, and more efficient through intelligent triage and route optimization.

---

## ✨ Features (Implemented)

* ✅ User registration & login with Supabase Auth
* ✅ Post urgent aid requests (food, medicine, shelter)
* ✅ View and filter requests by type, priority, and status
* ✅ Real-time request submission and display
* ✅ Admin panel for managing requests
* ✅ Route optimization for volunteers
* ✅ Triage scoring system
* ✅ Feedback system
* ✅ Analytics and metrics

---

## 🛠️ Tech Stack

* **Frontend:** React with Next.js
* **Database & Auth:** Supabase (PostgreSQL + Auth)
* **Styling:** Tailwind CSS
* **Deployment:** Vercel (frontend), Supabase (backend)
* **Version Control:** Git & GitHub

---

## 🚀 Getting Started

### Prerequisites

* Node.js v18+
* Supabase account
* Git

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/rmanadath/Relief-Net.git
cd Relief-Net
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:**

Create a `.env` file in the root directory:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Set up Supabase database:**

Run the SQL scripts in Supabase SQL Editor:
- `sprint2-database-enhancements.sql` - For Sprint 2 features
- `sprint3-database-enhancements.sql` - For Sprint 3 route optimization
- `sprint4-database-enhancements.sql` - For Sprint 4 analytics and feedback

5. **Run the application:**

```bash
npm start
```

The app will open at `http://localhost:3000`

---

## 📋 User Stories Implemented

### Sprint 1: Basic Request System
* ✅ Users can create requests with name, contact, aid type, description, and location
* ✅ Requests are stored in Supabase database
* ✅ Users can view their submitted requests

### Sprint 2: Database Enhancements
* ✅ Request status tracking (pending, in-progress, resolved, fulfilled)
* ✅ Priority system (low, medium, high)
* ✅ Admin role management
* ✅ Request assignment to volunteers

### Sprint 3: Route Optimization
* ✅ Geolocation support (latitude, longitude, address)
* ✅ Route optimization algorithms (Nearest Neighbor, OpenRouteService, Google Maps)
* ✅ Volunteer location tracking
* ✅ Optimized route visualization
* ✅ Triage scoring system

### Sprint 4: Analytics & Feedback
* ✅ Automatic status transition tracking
* ✅ Delivery completion timestamps
* ✅ Feedback system (ratings and comments)
* ✅ Analytics and metrics
* ✅ Error logging

---

## 📁 Project Structure

```
Relief-Net/
├── src/
│   ├── components/        # React components
│   │   └── RouteOptimizer.js
│   ├── services/          # API services
│   │   ├── routeService.js
│   │   ├── analyticsService.js
│   │   ├── errorLogger.js
│   │   └── feedbackService.js
│   ├── utils/            # Utility functions
│   │   ├── routeOptimizer.js
│   │   └── triageScorer.js
│   ├── App.js            # Main app component
│   ├── Dashboard.js      # Dashboard component
│   ├── Auth.js           # Authentication
│   ├── RequestForm.js    # Request posting form
│   ├── RequestList.js   # Request list view
│   ├── AdminPanel.js     # Admin panel
│   └── AssignmentDashboard.js  # Volunteer assignment
├── sprint2-database-enhancements.sql
├── sprint3-database-enhancements.sql
├── sprint4-database-enhancements.sql
└── README.md
```

---

## 🔐 Database Schema

### Main Tables
- `requests` - Aid requests with status, priority, location
- `profiles` - User profiles with roles (user, admin, volunteer)
- `feedback` - Volunteer feedback on completed requests
- `delivery_logs` - Status change tracking for analytics
- `error_logs` - Error tracking for debugging
- `optimized_routes` - Stored optimized routes

---

## 🤝 Contributing

This is a class project. For contributions, please contact the project maintainers.

---

## 📝 License

This project is for educational purposes.

---

## 👥 Team

- **Haroon** - Backend/Automation
- **Rida** - Frontend/Dashboard
- **Obaidullah** - Admin Controls/Triage
- **Abbad** - UI/QA
- **Rayhaan** - DevOps/Deployment
