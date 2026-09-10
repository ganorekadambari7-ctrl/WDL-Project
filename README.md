# WDL-Project

# Salary Pro

Full-stack salary management system built with React, Tailwind CSS, Express, and MongoDB.

## Quick start

1. Create environment values from `server/.env.example` in `server/.env`.
2. Install packages:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```
3. Start the API: `cd server && npm run dev`
4. Start the web app: `cd client && npm run dev`

The frontend runs at `http://localhost:5173` and calls the API at `http://localhost:5000/api` by default.

## Folder structure

```text
Salary Pro/
├── client/                 # React + Tailwind UI
│   └── src/
│       ├── components/     # Reusable UI and layout components
│       ├── context/        # Authentication state
│       ├── pages/          # Login, signup, dashboard views
│       └── services/       # API client
└── server/                 # Express + MongoDB API
    └── src/
        ├── config/         # Database connection
        ├── controllers/    # Route business logic
        ├── middleware/     # Authentication and errors
        ├── models/         # MongoDB/Mongoose models
        └── routes/         # REST endpoints
```
