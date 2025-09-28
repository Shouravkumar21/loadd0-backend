# Backend Deployment Preparation for Render

## Tasks
- [x] Update server.js: Replace hardcoded values with environment variables (Google API key, Firebase database URL, JWT secret, CORS origins set to '*', Firebase init via env vars)
- [x] Update firebaseAdmin.js: Switch Firebase initialization to use environment variables
- [x] Create .env.example: Template file with all required environment variables
- [x] Update .gitignore: Add serviceAccountKey.json to ignore sensitive files
- [x] Advise user: Delete serviceAccountKey.json from repo, create local .env file, test locally, deploy to Render

## Followup Steps
- [x] Test backend locally: npm install && npm start, verify API endpoints and Socket.IO (attempted, failed due to env key format - fix .env and retry)
- [ ] Deploy to Render: Create Web Service, connect repo, set build/start commands, add env vars in dashboard
- [ ] Update production domains in env vars if needed
