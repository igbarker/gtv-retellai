# AI Receptionist MVP

A multi-tenant AI receptionist system for small businesses that handles inbound calls 24/7, collects customer information, and sends notifications via SMS (Retell AI) and Slack.

## Features

- 🤖 **AI-Powered Calls**: Real-time conversation with human-like response times
- 📞 **24/7 Availability**: Never miss a customer call
- 🏢 **Multi-tenant**: Isolated data and configurations per business
- 📱 **Smart Notifications**: SMS via Retell AI and Slack alerts with call details
- 🎯 **Information Collection**: Automated extraction of caller details
- ⚡ **Real-time Processing**: Multi-webhook handling for live call tracking
- 💰 **Cost Effective**: Under $100/month operational cost

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Google Cloud SDK (for deployment)
- Supabase account and project
- Retell AI account and API key

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd ai-receptionist
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your actual values
   ```

3. **Set up database:**
   - Run the SQL schema in Supabase SQL editor (see `database/schema.sql`)
   - Run the migration for call_summary field (see `database/add_call_summary.sql`)
   - Update your `.env` with Supabase credentials

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Test the system:**
   ```bash
   curl http://localhost:8080/health
   ```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Retell AI     │    │  Google Cloud   │    │   Supabase      │
│   - Voice AI    │◄──►│  - Node.js API  │◄──►│   - Database    │
│   - Phone Calls │    │  - Multi-Webhook│    │   - File Storage│
│   - SMS/SMS     │    │  - Real-time    │    │   - Backups     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  External APIs  │
                    │  - Slack        │
                    └─────────────────┘
```

## Webhook Events

### **Multi-Event Webhook System**
Your system now handles multiple Retell AI webhook events for comprehensive call tracking:

#### **1. Call Started (`call_started`)**
- **When**: Call begins, customer connects
- **Data**: Basic call info, no transcript yet
- **Action**: Creates initial call record, updates analytics
- **Response**: Fast acknowledgment

#### **2. Call Ended (`call_ended`)**
- **When**: Call disconnects
- **Data**: Call duration, final status
- **Action**: Updates call status to completed
- **Response**: Status update confirmation

#### **3. Call Analyzed (`call_analyzed`)**
- **When**: Transcript and analysis complete
- **Data**: Full transcript, extracted information
- **Action**: Processes transcript, sends notifications
- **Response**: Complete processing result

#### **4. Legacy Support**
- **When**: Old webhook format
- **Data**: Single webhook with call_status
- **Action**: Full processing in one step
- **Response**: Complete result

### **Performance Benefits**
- **Faster Response**: Phone number lookup instead of agent ID
- **Real-time Tracking**: Live call status updates
- **Better Analytics**: Granular call lifecycle data
- **Improved Reliability**: Handles webhook failures gracefully

## API Endpoints

### Webhooks
- `POST /webhook/retell` - Handle all Retell AI call events

### Business Management
- `POST /api/businesses` - Create new business
- `GET /api/businesses/:id/calls` - Get call history
- `PUT /api/businesses/:id/prompt` - Update AI instructions

### Health & Monitoring
- `GET /health` - System health check

## Business Onboarding

1. **Collect Information**: Business details, owner contact, preferred area code
2. **Technical Setup**: Create Retell AI agent, purchase phone number
3. **Testing**: Verify AI responses and notifications
4. **Go-Live**: Activate phone number and monitor calls

## Development

### Running Tests
```bash
npm test
```

### Code Structure
```
src/
├── config/          # Configuration files
├── controllers/     # Route handlers
├── middleware/      # Express middleware
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Helper functions
└── index.js         # Main application entry
```

### Deployment
```bash
npm run deploy
```

## Cost Analysis

**Monthly Costs (2 customers):**
- Retell AI: $14-24/month
- Infrastructure: ~$5/month
- **Total: $19-29/month**

## Support

For technical support or questions about the AI Receptionist system, please refer to the documentation or contact the development team.

## License

MIT License - see LICENSE file for details.
