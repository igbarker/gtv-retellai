#!/bin/bash

# AI Receptionist MVP Deployment Script
echo "🚀 Deploying AI Receptionist MVP to Google Cloud..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK is not installed. Please install it first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with Google Cloud. Please run: gcloud auth login"
    exit 1
fi

# Check if project is set
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No Google Cloud project set. Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "✅ Using Google Cloud project: $PROJECT_ID"

# Check if required APIs are enabled
echo "🔧 Checking required APIs..."
APIS=("run.googleapis.com" "cloudbuild.googleapis.com" "containerregistry.googleapis.com")

for API in "${APIS[@]}"; do
    if ! gcloud services list --enabled --filter="name:$API" | grep -q "$API"; then
        echo "⚠️  Enabling API: $API"
        gcloud services enable "$API"
    else
        echo "✅ API enabled: $API"
    fi
done

# Build and deploy
echo "🏗️  Building and deploying application..."

# Use Cloud Build for deployment
if gcloud builds submit --tag gcr.io/$PROJECT_ID/ai-receptionist; then
    echo "✅ Build completed successfully"
    
    # Deploy to Cloud Run
    if gcloud run deploy ai-receptionist \
        --image gcr.io/$PROJECT_ID/ai-receptionist \
        --platform managed \
        --region us-central1 \
        --allow-unauthenticated \
        --set-env-vars NODE_ENV=production \
        --memory 512Mi \
        --cpu 1 \
        --max-instances 10 \
        --timeout 300s; then
        
        echo "🎉 Deployment completed successfully!"
        
        # Get the service URL
        SERVICE_URL=$(gcloud run services describe ai-receptionist --platform managed --region us-central1 --format="value(status.url)")
        echo "🌐 Service URL: $SERVICE_URL"
        echo "📊 Health check: $SERVICE_URL/health"
        echo "📚 API docs: $SERVICE_URL/"
        
    else
        echo "❌ Deployment failed"
        exit 1
    fi
    
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "🎯 Next steps:"
echo "1. Test the deployment: curl $SERVICE_URL/health"
echo "2. Update your Retell AI webhook URL to: $SERVICE_URL/webhook/retell"
echo "3. Monitor the service: gcloud run services describe ai-receptionist --platform managed --region us-central1"
echo "4. View logs: gcloud logs tail --service=ai-receptionist"
