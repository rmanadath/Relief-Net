# Relief-Net Backend API

Express.js backend server for Relief-Net disaster relief platform.

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
Copy `env.example` to `.env` and fill in your values:
```bash
cp env.example .env
```

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)
- `PORT` - Server port (default: 8080)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)

3. **Run the server:**
```bash
npm run dev
```

The API will be available at `http://localhost:8080`

## API Endpoints

### Health Check
- `GET /health` - Server health check

### Routes (Route Optimization)
- `POST /api/routes/optimize` - Optimize a delivery route (requires auth)
- `GET /api/routes/nearby` - Get nearby requests (requires auth)
- `GET /api/routes/my-routes` - Get volunteer's saved routes (requires auth)

### Requests
- `GET /api/requests` - Get all requests (optional auth)
- `POST /api/requests` - Create a new request (requires auth)
- `PUT /api/requests/:id` - Update a request (requires auth, owner or admin)

### Analytics
- `GET /api/analytics` - Get delivery analytics (requires admin auth)

### Feedback
- `POST /api/feedback` - Submit feedback (requires auth)
- `GET /api/feedback/:requestId` - Get feedback for a request

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <supabase_jwt_token>
```

The token is validated using Supabase Auth.

## Architecture

- **Express.js** - Web framework
- **Supabase** - Database and authentication
- **Route Optimization** - Nearest Neighbor algorithm (with optional OpenRouteService/Google Maps)

## Development

The backend uses ES modules. Make sure your Node.js version supports ES modules (Node 14+).

