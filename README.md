# SmartStock Pro

SmartStock Pro — A minimal inventory management system built for the BNSP assignment.

Features included in this workspace:
- Session-based authentication with hashed passwords
- CSRF protection and secure session handling
- Dashboard UI (vanilla JS) with real-time SSE hooks
- Background job queue and PDF export endpoints

Quick start

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Open http://localhost:3000 and login with demo credentials:

- Admin: `admin` / `Admin@123`
- Manager: `manager1` / `Manager@123`

Repository contents

- `index.js` - Express app entry
- `public/` - Frontend static assets
- `routes/` - Express API routes
- `database/` - DB init and helper

Notes

This repository was prepared for the BNSP assignment and includes a small commit history created locally. To publish to GitHub, create a new remote repo and push following the instructions below.

GitHub push (example):

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```
