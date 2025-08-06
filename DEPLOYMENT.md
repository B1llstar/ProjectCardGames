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
Environment=PORT=3002

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable project-board-games.service
sudo systemctl start project-board-games.service
```

### 3.1. Fix PostCSS config for ES modules
```bash
# Rename PostCSS config to .cjs for compatibility
cd /var/www/project-board-games/client
mv postcss.config.js postcss.config.cjs

# Or recreate it properly
cat > postcss.config.cjs << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
}
EOF
```

### 3.2. Check for port conflicts
```bash
# Check what's using port 3002
sudo lsof -i :3002
# Kill any process using port 3002 if needed
# sudo kill -9 <PID>

# Check what's using port 3001  
sudo lsof -i :3001
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
    RewriteRule ^/(.*)$ ws://localhost:5175/$1 [P,L]
    
    # Proxy all other requests to Vite dev server
    ProxyPass / http://localhost:5175/
    ProxyPassReverse / http://localhost:5175/
      # Proxy WebSocket server (server runs on port 3002 by default)
    ProxyPass /socket.io/ http://localhost:3002/socket.io/
    ProxyPassReverse /socket.io/ http://localhost:3002/socket.io/
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

## Quick Fixes for Common Issues

### Port conflict (EADDRINUSE)
```bash
# Check what's using the ports
sudo lsof -i :3001
sudo lsof -i :3002
sudo lsof -i :5173
sudo lsof -i :5174

# Kill ALL processes using these ports
sudo pkill -f "node server/index.js"
sudo pkill -f "npm run server" 
sudo pkill -f "npm run dev"
sudo pkill -f "npm run client"
sudo pkill -9 -f "concurrently"

# Make sure systemd service uses port 3001
sudo systemctl stop project-board-games.service

# Check server/index.js uses PORT from environment (should be 3001)
cd /var/www/project-board-games
grep -n "PORT.*3002" server/index.js || echo "Port looks good"

# Restart services with correct ports
sudo systemctl start project-board-games.service
cd /var/www/project-board-games && nohup npm run client > dev.log 2>&1 &

# Check what port Vite actually used and update Apache config
tail -f dev.log
```

### Update Apache config for actual Vite port
```bash
# Check what port Vite is actually using
ps aux | grep vite
# OR check the terminal output where you started Vite

# If Vite is running on port 5175 (as mentioned), update Apache config:
sudo sed -i 's/localhost:5173/localhost:5175/g' /etc/apache2/sites-available/project-board-games.conf

# Alternatively, you can manually edit the config:
sudo nano /etc/apache2/sites-available/project-board-games.conf
# Change all instances of 5173 to 5175

# Restart Apache to apply changes
sudo systemctl restart apache2

# Verify the configuration
sudo apache2ctl configtest
```

### Fix WebSocket server port mismatch
```bash
# Check which port your WebSocket server is actually using
sudo lsof -i :3001
sudo lsof -i :3002

# Method 1: Update systemd service to change the port
sudo nano /etc/systemd/system/project-board-games.service
# Change the line: Environment=PORT=3002 to Environment=PORT=3001
# Then reload and restart:
sudo systemctl daemon-reload
sudo systemctl restart project-board-games.service

# Method 2: Set environment variable when running manually
cd /var/www/project-board-games
PORT=3001 npm run server

# Method 3: Create a .env file (if your server supports it)
echo "PORT=3001" > /var/www/project-board-games/.env

# Method 4: Update Apache config to match current port (3002)
sudo sed -i 's/localhost:3001/localhost:3002/g' /etc/apache2/sites-available/project-board-games.conf
sudo systemctl restart apache2

# Verify which port is actually being used
sudo systemctl status project-board-games.service
sudo journalctl -u project-board-games.service -f
```

### PostCSS ES module error
```bash
cd /var/www/project-board-games/client

# Remove the old .js file that's causing the error
rm postcss.config.js 2>/dev/null || true

# Create the correct .cjs file
cat > postcss.config.cjs << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
}
EOF

# Restart dev server to pick up the change
cd /var/www/project-board-games
pkill -f "npm run dev"
nohup npm run dev > dev.log 2>&1 &
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

## How to Access Your Game

### Option 1: Using your domain name
If you configured a domain in the Apache virtual host:
```
http://your-domain.com
```

### Option 2: Using your server's IP address
Replace `your-server-ip` with your actual server IP:
```
http://143.244.154.209
http://your-actual-server-ip
```

### Option 3: Direct access (for testing)
If Apache isn't working, you can access directly:
```
http://143.244.154.209:5175
http://your-server-ip:5175
```

### Troubleshooting Access Issues
```bash
# Check if services are running
sudo systemctl status apache2
sudo systemctl status project-board-games.service
ps aux | grep "npm run dev"

# Check if ports are accessible
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :3002
sudo netstat -tlnp | grep :5175

# Test Apache config
sudo apache2ctl configtest

# Check Apache logs if there are issues
sudo tail -f /var/log/apache2/error.log
sudo tail -f /var/log/apache2/access.log
```

**Benefits of this approach:**
- No build step needed
- Hot reload works for development
- Simple to update and restart
- Easy to debug with real-time logs


