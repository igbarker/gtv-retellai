#!/bin/bash

# AI Receptionist MVP Setup Script
echo "🚀 Setting up AI Receptionist MVP..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your actual configuration values"
else
    echo "✅ .env file already exists"
fi

# Create database setup instructions
echo "🗄️  Database setup instructions:"
echo "1. Go to your Supabase project dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Run the contents of database/schema.sql"
echo "4. Update your .env file with Supabase credentials"

# Create Retell AI setup instructions
echo "🤖 Retell AI setup instructions:"
echo "1. Create a Retell AI account at https://retellai.com"
echo "2. Create an agent with the custom prompt from promptTemplateService.js"
echo "3. Purchase a phone number in your desired area code"
echo "4. Configure webhook URL: https://your-domain.com/webhook/retell"
echo "5. Update your .env file with Retell AI API key"

# Create Twilio setup instructions
echo "📱 Twilio setup instructions:"
echo "1. Create a Twilio account at https://twilio.com"
echo "2. Get your Account SID and Auth Token"
echo "3. Update your .env file with Twilio credentials"

# Create Slack setup instructions
echo "💬 Slack setup instructions:"
echo "1. Create a Slack app in your workspace"
echo "2. Add incoming webhook integration"
echo "3. Copy the webhook URL to your business configuration"

echo ""
echo "🎉 Setup complete! Next steps:"
echo "1. Edit .env file with your credentials"
echo "2. Set up your database using database/schema.sql"
echo "3. Configure Retell AI agent and webhook"
echo "4. Test the system with: npm run dev"
echo "5. Deploy to production with: npm run deploy"
