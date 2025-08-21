#!/bin/bash

echo "🚀 Deploying GotTheVerbal to Production..."

# Set production project
gcloud config set project gottheverbal-prod

# Deploy to Cloud Run
gcloud run deploy gottheverbal \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production

# Get the service URL
SERVICE_URL=$(gcloud run services describe gottheverbal --region us-central1 --format="value(status.url)")

echo "✅ Production deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo "🔗 Next step: Map domain gottheverbal.com to this service"
