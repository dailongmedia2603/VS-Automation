#!/bin/bash

# Configuration
SERVER_IP="45.252.250.6"
SERVER_USER="oaigixrw"
SERVER_PORT="2210"
SSH_KEY="$HOME/.ssh/id_rsa_content"
REMOTE_DIR="/home/oaigixrw/content.dailongmedia.io.vn"

echo "🚀 Starting Deployment to $SERVER_IP..."

# 1. Build Frontend
echo "📦 Building Frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed."
    exit 1
fi

# 2. Archive Files
echo "🗜️ Archiving files..."
tar -czf frontend.tar.gz -C dist .
tar --exclude='node_modules' --exclude='vendor' --exclude='.env' --exclude='.git' --exclude='bootstrap/cache' -czf backend.tar.gz -C vs-automation-api .

# 3. Upload to Server
echo "Rg Uploading to server..."
scp -P $SERVER_PORT -i $SSH_KEY -o StrictHostKeyChecking=no frontend.tar.gz $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
scp -P $SERVER_PORT -i $SSH_KEY -o StrictHostKeyChecking=no backend.tar.gz $SERVER_USER@$SERVER_IP:$REMOTE_DIR/backend/

# 4. Deploy on Server
echo "🛠️ Executing server commands..."
ssh -p $SERVER_PORT -i $SSH_KEY -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << EOF
    cd $REMOTE_DIR
    
    # Deploy Frontend
    echo "   - Extracting Frontend..."
    tar -xzf frontend.tar.gz
    rm frontend.tar.gz
    
    # Deploy Backend
    echo "   - Extracting Backend..."
    cd backend
    tar -xzf backend.tar.gz
    rm backend.tar.gz
    
    # Run Laravel Commands (Check for PHP version first)
    if command -v php82 &> /dev/null; then
        PHP_BIN="php82"
    elif command -v php8.2 &> /dev/null; then
        PHP_BIN="php8.2"
    elif /usr/local/bin/php -v | grep -q "PHP 8.3"; then
        PHP_BIN="/usr/local/bin/php"
    elif [ -f "/opt/cpanel/ea-php82/root/usr/bin/php" ]; then
        PHP_BIN="/opt/cpanel/ea-php82/root/usr/bin/php"
    else
        echo "⚠️  WARNING: PHP 8.2 not found. Using default php."
        PHP_BIN="php"
    fi
    
    echo "   - Using PHP: \$PHP_BIN"
    \$PHP_BIN artisan migrate --force
    \$PHP_BIN artisan optimize:clear
    \$PHP_BIN artisan config:cache
    \$PHP_BIN artisan route:cache
EOF

# 5. Cleanup
echo "🧹 Cleaning up local archives..."
rm frontend.tar.gz backend.tar.gz

echo "✅ Deployment Completed!"
