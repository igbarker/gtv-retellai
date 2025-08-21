#!/bin/bash

echo "🧪 Deploying GotTheVerbal to Sandbox..."

# Set sandbox project
gcloud config set project gottheverbal-sandbox

# Deploy to Cloud Run
gcloud run deploy gottheverbal-sandbox \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=sandbox

# Get the service URL
SERVICE_URL=$(gcloud run services describe gottheverbal-sandbox --region us-central1 --format="value(status.url)")

echo "✅ Sandbox deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo "🔗 Use this URL for testing before production"
