# Simple Deployment Guide - Apache2

## Simple Setup

### 1. Install Dependencies
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Deploy App
```bash
# Clone and setup
sudo git clone https://github.com/yourusername/ProjectCardGames.git /var/www/project-board-games
cd /var/www/project-board-games
sudo chown -R $USER:$USER /var/www/project-board-games

# Install dependencies
npm run install-all
```

### 3. Create systemd service for WebSocket server
```bash
# Create service file
sudo tee /etc/systemd/system/project-board-games.service << 'EOF'
[Unit]
Description=Project Board Games WebSocket Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/project-board-games
ExecStart=/usr/bin/npm run server
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable project-board-games.service
sudo systemctl start project-board-games.service
```

### 4. Configure Apache2
```bash
# Enable required modules
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite

# Create virtual host
sudo tee /etc/apache2/sites-available/project-board-games.conf << 'EOF'
<VirtualHost *:80>
    ServerName your-domain.com
    
    # Proxy everything to the dev server
    ProxyPreserveHost On
    ProxyRequests Off
    
    # Handle WebSocket connections
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/(.*)$ ws://localhost:5173/$1 [P,L]
    
    # Proxy all other requests to Vite dev server
    ProxyPass / http://localhost:5173/
    ProxyPassReverse / http://localhost:5173/
    
    # Proxy WebSocket server
    ProxyPass /socket.io/ http://localhost:3001/socket.io/
    ProxyPassReverse /socket.io/ http://localhost:3001/socket.io/
</VirtualHost>
EOF

# Enable site
sudo a2ensite project-board-games.conf
sudo a2dissite 000-default.conf
sudo systemctl restart apache2
```

### 5. Run dev server
```bash
# Start the client dev server (keeps it running)
cd /var/www/project-board-games
nohup npm run dev > dev.log 2>&1 &
```

### 6. SSL (Optional)
```bash
sudo apt install certbot python3-certbot-apache -y
sudo certbot --apache -d your-domain.com
```

## Quick Commands
```bash
# Check status
sudo systemctl status project-board-games.service
sudo systemctl status apache2
ps aux | grep "npm run dev"

# View logs
sudo journalctl -u project-board-games.service -f
tail -f /var/www/project-board-games/dev.log
sudo tail -f /var/log/apache2/error.log

# Restart services
sudo systemctl restart project-board-games.service
sudo systemctl restart apache2

# Update app
cd /var/www/project-board-games
git pull origin main
npm install
sudo systemctl restart project-board-games.service
# Kill and restart dev server
pkill -f "npm run dev"
nohup npm run dev > dev.log 2>&1 &
```

## Alternative: Even Simpler with screen/tmux
Instead of systemd, you can use screen:
```bash
# Start WebSocket server in screen
screen -dmS ws-server bash -c 'cd /var/www/project-board-games && npm run server'

# Start dev server in screen  
screen -dmS dev-server bash -c 'cd /var/www/project-board-games && npm run dev'

# View running screens
screen -ls

# Attach to a screen
screen -r ws-server
# Press Ctrl+A then D to detach
```

Done! Your game is available at `http://your-domain.com` or `http://your-server-ip`.

**Benefits of this approach:**
- No build step needed
- Hot reload works for development
- Simple to update and restart
- Easy to debug with real-time logs


