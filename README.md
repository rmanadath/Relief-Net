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
* ✅ View and filter requests by type
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

* **Frontend:** Next.js 16 with React 19
* **Database & Auth:** Supabase (PostgreSQL + Auth)
* **Styling:** Tailwind CSS
* **Forms:** React Hook Form
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

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Set up Supabase database:**

Create a table called `requests` with the following schema:

```sql
CREATE TABLE requests (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  aid_type TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

5. **Run the application:**

```bash
npm run dev
```

The app will open at `http://localhost:3000`

---

## 📋 User Stories Implemented

### 1. Post a Request (Person in Need)

* ✅ Users can create requests with name, contact, aid type, description, and location
* ✅ Requests are stored in Supabase database
* ✅ Confirmation message appears after submission
* ✅ Form validation with React Hook Form
* ✅ Modern UI with Tailwind CSS

### 2. View Requests (Volunteer)

* ✅ Volunteers can view a list of all open requests
* ✅ Requests display key details (type, location, contact, description)
* ✅ Volunteers can filter by category (food, medicine, shelter, etc.)
* ✅ Real-time updates when new requests are posted

---

## 🏗️ Project Structure

```
app/
├── layout.tsx           # Root layout with metadata
├── page.tsx            # Home page
├── post-request/
│   └── page.tsx        # Request posting form
├── globals.css         # Global styles
└── favicon.ico         # App icon

```

---

## 🎯 Next Steps (Sprint 2)

* Implement Fair Triage Scorer algorithm
* Add route optimization for volunteers
* Integrate Google Maps API
* Add request status management
* Implement volunteer assignment system
* Add authentication system
* Create volunteer dashboard

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

* Built with [Next.js](https://nextjs.org/)
* Database powered by [Supabase](https://supabase.com/)
* Styled with [Tailwind CSS](https://tailwindcss.com/)
* Forms handled by [React Hook Form](https://react-hook-form.com/)