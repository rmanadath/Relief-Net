# Relief-Net 🌐

_A disaster relief web platform designed to connect people in need with volunteers who can offer help._

---

## 🌍 Overview

Relief-Net is a web application that bridges the gap between **aid seekers** and **volunteers**.  
Our mission is to make disaster relief faster, fairer, and more efficient through intelligent triage and route optimization.

---

## ✨ Features (Implemented)

### Sprint 1 - Core Functionality ✅
* ✅ User registration & login with Supabase Auth
* ✅ Post urgent aid requests (food, medicine, shelter)
* ✅ View and filter requests by type, priority, and status
* ✅ Real-time request submission and display
* ✅ Basic form validation
* ✅ Admin panel for request management

### Sprint 2 - Enhanced UI & Priority System ✅
* ✅ Tailwind CSS integration for modern styling
* ✅ Priority field for requests (High/Medium/Low)
* ✅ Enhanced form validation with inline error messages
* ✅ Colored status badges (Open/In-Progress/Fulfilled)
* ✅ Colored priority chips with visual indicators
* ✅ Improved dashboard navigation with better UX
* ✅ Priority and type filters in request list
* ✅ Responsive design and smooth transitions

### Sprint 3 - Route Optimization & Analytics ✅
* ✅ Route Optimizer with nearest neighbor algorithm
* ✅ Color-coded map markers by status/priority
* ✅ Volunteer assignment system
* ✅ Feedback submission for fulfilled requests
* ✅ Real-time analytics dashboard
* ✅ Polylines caching for performance
* ✅ Complete end-to-end workflow
* ✅ Final UI/UX refinement (padding, typography, theme consistency)

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

**⚠️ IMPORTANT:** Create a `.env.local` file in the root directory (same level as `package.json`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://jnsjakpcqoilbezhexce.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuc2pha3BjcW9pbGJlemhleGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzE1NjgsImV4cCI6MjA3NjY0NzU2OH0.kvWRxdr_0QctvUGPwaGdq016fYqNKaCfAk9smi0NcVQ
```

**Note:** The `.env.local` file is NOT in the repository (it's gitignored). You MUST create it manually! See `SETUP-GUIDE.md` for detailed instructions.

4. **Set up Supabase database:**

Run these SQL scripts in Supabase SQL Editor (in order):
1. `database-setup.sql` - Creates base tables and policies
2. `sprint3-database-updates.sql` - Adds Sprint 3 features (route_order, assigned_volunteer, feedback table)

5. **Run the application:**

```bash
npm run dev
```

The app will open at `http://localhost:3000`

**Troubleshooting:** If you get errors, see `SETUP-GUIDE.md` for common fixes.

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
├── app/                   # Next.js app directory
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   ├── login/            # Login page
│   └── post-request/     # Post request page
├── src/                   # React components and utilities
│   ├── components/       # Reusable React components
│   │   ├── RouteOptimizer.js      # Full volunteer route optimizer
│   │   ├── FeedbackForm.js        # Feedback submission form
│   │   ├── AnalyticsDashboard.js  # Analytics dashboard
│   │   └── RequestHeatmap.js      # Request heatmap visualization
│   ├── services/         # API and service layer
│   │   ├── routeService.js        # Route optimization services
│   │   ├── analyticsService.js     # Analytics data services
│   │   ├── errorLogger.js         # Error logging service
│   │   └── feedbackService.js     # Feedback service
│   ├── utils/            # Utility functions
│   │   ├── routeOptimizer.js      # Route optimization algorithms
│   │   └── triageScorer.js        # Triage scoring logic
│   ├── Dashboard.js      # Main dashboard component
│   ├── Auth.js           # Authentication component
│   ├── RequestForm.js    # Request posting form
│   ├── RequestList.js    # Request list view
│   ├── AdminPanel.js     # Admin panel
│   ├── AssignmentDashboard.js  # Volunteer assignment dashboard
│   ├── RouteOptimizer.js # Simple route optimizer (for admin)
│   └── supabase.js       # Supabase client configuration
├── database-setup.sql
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
