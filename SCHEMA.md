# Crisis Aid Optimizer - Sprint 2 Enhanced Database Schema

## 📊 Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AUTH.USERS                               │
│  (Supabase Auth - Managed automatically)                        │
├─────────────────────────────────────────────────────────────────┤
│  id (UUID, PK)                                                  │
│  email (TEXT)                                                   │
│  encrypted_password (TEXT)                                      │
│  email_confirmed_at (TIMESTAMP)                                │
│  created_at (TIMESTAMP)                                        │
│  updated_at (TIMESTAMP)                                        │
└─────────────────────────────────────────────────────────────────┘
                                        │
                                        │ 1:1
                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PROFILES                                 │
├─────────────────────────────────────────────────────────────────┤
│  id (UUID, PK, FK → auth.users.id)                             │
│  role (TEXT) DEFAULT 'user'                                     │
│    CHECK: 'user', 'admin', 'volunteer'                        │
│  full_name (TEXT)                                               │
│  phone (TEXT)                                                   │
│  organization (TEXT)                                            │
│  created_at (TIMESTAMP) DEFAULT NOW()                          │
│  updated_at (TIMESTAMP) DEFAULT NOW()                           │
└─────────────────────────────────────────────────────────────────┘
                                        │
                                        │ 1:N
                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        REQUESTS                                 │
├─────────────────────────────────────────────────────────────────┤
│  id (SERIAL, PK)                                                │
│  user_id (UUID, FK → auth.users.id)                            │
│  name (TEXT, NOT NULL)                                          │
│  contact (TEXT, NOT NULL)                                       │
│  aid_type (TEXT, NOT NULL)                                      │
│  description (TEXT, NOT NULL)                                   │
│  location (TEXT, NOT NULL)                                      │
│  status (TEXT) DEFAULT 'pending'                                │
│    CHECK: 'pending', 'in-progress', 'resolved', 'cancelled'    │
│  priority (TEXT) DEFAULT 'medium'                                │
│    CHECK: 'low', 'medium', 'high', 'urgent'                    │
│  assigned_to (UUID, FK → auth.users.id)                        │
│  created_at (TIMESTAMP) DEFAULT NOW()                          │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Row Level Security (RLS) Policies

### Profiles Table
- **Users can view own profile**: `auth.uid() = id`
- **Users can update own profile**: `auth.uid() = id`
- **Admins can view all profiles**: Check if user role = 'admin'

### Requests Table
- **Anyone can view requests**: `true` (public visibility)
- **Users can insert own requests**: `auth.uid() = user_id`
- **Users can update own requests**: `auth.uid() = user_id`
- **Admins can update all requests**: Check if user role = 'admin'
- **Volunteers can update assigned requests**: `auth.uid() = assigned_to` OR role = 'volunteer'

## 📈 Indexes for Performance
- `idx_requests_status` - Filter by status
- `idx_requests_priority` - Filter by priority
- `idx_requests_assigned_to` - Find assigned requests
- `idx_requests_created_at` - Sort by date
- `idx_requests_aid_type` - Filter by aid type
- `idx_profiles_role` - Filter by user role

## 🔄 Triggers
- **Auto-create profile**: When new user signs up
- **Update timestamp**: When profile is modified

## 🎯 User Roles
1. **user** (default) - Can post requests, view all requests
2. **volunteer** - Can be assigned to requests, update assigned requests
3. **admin** - Full access to all data, can manage all requests and users
