# Production Deployment Guide

## Prerequisites
- Node.js 18+ installed
- MySQL database running
- Domain name (optional, for HTTPS)

## Step 1: Build the Frontend

Run this command in PowerShell with elevated permissions:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
npm run build
```

This will create a `dist` folder with the production build.

## Step 2: Configure Environment Variables

Create a `.env.production` file:
```env
# Database Configuration
DB_HOST=your_production_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=timesheet

# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Secret (generate a strong secret)
JWT_SECRET=your_very_long_random_secret_key_here

# CORS Origin (your frontend URL)
CORS_ORIGIN=https://10.53.14.50:3000
```

## Step 3: Update server.js for Production

The server needs to serve the built frontend files. Add this to `server.js`:

```javascript
// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}
```

## Step 4: Production Deployment Options

### Option A: Deploy on Current Server (10.53.14.50)

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Install PM2 for process management:
   ```bash
   npm install -g pm2
   ```

3. Start the server with PM2:
   ```bash
   pm2 start server.js --name timesheet-app
   pm2 save
   pm2 startup
   ```

4. Configure Nginx as reverse proxy (optional):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option B: Deploy to Cloud (Heroku, AWS, etc.)

See separate deployment guides for specific platforms.

## Step 5: Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT secret
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Update CORS settings for production domain
- [ ] Remove console.log statements
- [ ] Set secure cookie flags

## Step 6: Monitoring

- Set up error logging (e.g., Sentry)
- Monitor server health
- Set up database backups
- Configure alerts for downtime

## Troubleshooting

If you encounter PowerShell execution policy errors:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

If build fails, check:
- Node version (should be 18+)
- All dependencies installed
- No TypeScript errors
