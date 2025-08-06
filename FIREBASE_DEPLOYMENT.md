# VPS/Droplet Deployment Guide

## Deployment Options

### Option A: All-in-One (Recommended - Simpler)
Deploy both client and WebSocket server on the same droplet using Apache. This is what this guide covers.

### Option B: Hybrid (Advanced)
- WebSocket server on droplet
- Client on Firebase Hosting
- Requires CORS configuration and HTTPS setup

**We'll use Option A - it's simpler, faster, and easier to manage!**

## Quick Deployment Commands for New Droplet

### Step 1: Initial Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt install git -y

# Install PM2 for process management
sudo npm install -g pm2

# Install Apache2
sudo apt install apache2 -y

# Enable required Apache modules
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite
```

### Step 2: Clone and Setup Project
```bash
# Clone your project
git clone https://github.com/yourusername/ProjectCardGames.git /var/www/project-board-games
cd /var/www/project-board-games

# Set permissions
sudo chown -R $USER:$USER /var/www/project-board-games

# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### Step 3: Build Client for Production
```bash
cd client

# Fix PostCSS ES module error (rename .js to .cjs)
mv postcss.config.js postcss.config.cjs 2>/dev/null || true

# Create production environment file (empty = use same domain)
echo "VITE_WEBSOCKET_URL=" > .env.production

# Build for production
npm run build
cd ..
```

### Step 4: Start WebSocket Server with PM2
```bash
# Option A: Start server with PM2 (recommended)
pm2 start server/index.js --name "board-games-server"
pm2 startup
pm2 save

# Option B: Start server manually (simple)
# cd /var/www/project-board-games
# node server/index.js
# (Keep this terminal open)
```

### Step 5: Configure Apache2
```bash
# Create Apache virtual host
sudo tee /etc/apache2/sites-available/project-board-games.conf << 'EOF'
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/project-board-games/client/dist
    
    # Enable directory browsing and index files
    <Directory /var/www/project-board-games/client/dist>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Handle Vue.js routing
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Proxy WebSocket server
    ProxyPreserveHost On
    ProxyRequests Off
    
    # Handle WebSocket connections
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/socket.io/(.*)$ ws://localhost:3002/socket.io/$1 [P,L]
    
    # Proxy Socket.IO HTTP requests
    ProxyPass /socket.io/ http://localhost:3002/socket.io/
    ProxyPassReverse /socket.io/ http://localhost:3002/socket.io/
</VirtualHost>
EOF

# Enable site and disable default
sudo a2ensite project-board-games.conf
sudo a2dissite 000-default.conf

# Test Apache config and restart
sudo apache2ctl configtest
sudo systemctl restart apache2
```

### Step 6: Test Your Game
```bash
# Check if everything is working
curl -I http://localhost
curl -I http://localhost/socket.io/

# Check your public IP
echo "🎮 Your game is live at: http://$(curl -s ifconfig.me)"

# View logs if needed
pm2 logs board-games-server
```

### Step 7: SSL with Let's Encrypt (Optional)
```bash
# Install Certbot for Apache
sudo apt install certbot python3-certbot-apache -y

# Get SSL certificate
sudo certbot --apache -d your-domain.com

# Auto-renewal (already set up by certbot)
sudo certbot renew --dry-run
```

## One-Line Deploy Script

### Create deploy.sh
```bash
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying Project Board Games..."

# Pull latest changes
git pull origin main

# Install/update dependencies
npm install
cd client && npm install && cd ..

# Build client
cd client && npm run build && cd ..

# Restart server
pm2 restart board-games-server

echo "✅ Deployment complete!"
echo "🎮 Game available at: http://$(curl -s ifconfig.me)"
EOF

chmod +x deploy.sh
```

### Quick Deploy
```bash
./deploy.sh
```

## Environment Variables

### For Production Server
```bash
# Set environment variables for PM2
pm2 set project-board-games:NODE_ENV production
pm2 set project-board-games:PORT 3002

# Or create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'board-games-server',
    script: 'server/index.js',
    env: {
      NODE_ENV: 'development',
      PORT: 3002
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002
    }
  }]
}
EOF

# Start with ecosystem
pm2 start ecosystem.config.js --env production
```

## Useful Commands

### Check Status
```bash
# PM2 status
pm2 status
pm2 logs board-games-server

# Apache status
sudo systemctl status apache2
sudo apache2ctl configtest

# Check ports
sudo netstat -tlnp | grep :3002
sudo netstat -tlnp | grep :80
```

### Troubleshooting
```bash
# View logs
pm2 logs board-games-server --lines 50
sudo tail -f /var/log/apache2/error.log

# Restart services
pm2 restart board-games-server
sudo systemctl restart apache2

# Check if ports are accessible
curl -I http://localhost:3002
curl -I http://localhost/socket.io/
```

## Security (Production)

### Firewall Setup
```bash
# Enable UFW
sudo ufw enable

# Allow essential ports
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Check status
sudo ufw status
```

### Fail2Ban (Optional)
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

## Quick Access URLs

After deployment, your game will be available at:
- **HTTP**: `http://your-droplet-ip`
- **HTTPS**: `https://your-domain.com` (if SSL configured)
- **WebSocket**: Automatically handled by Apache proxy

## Replace Placeholders

Remember to replace:
- `your-domain.com` → your actual domain
- `your-droplet-ip` → your VPS IP address
- `yourusername` → your GitHub username
