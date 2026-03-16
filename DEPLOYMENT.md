# Deployment Guide for Weather Agent 🌤️

This guide provides multiple deployment options for your AI Weather Agent.

## 📋 Prerequisites

- Azure CLI installed and configured
- Docker installed (for container deployment)
- Azure subscription

## 🚀 Deployment Options

### Option 1: Azure Container Apps (Recommended)

1. **Install Azure Developer CLI**
   ```bash
   # Windows (PowerShell)
   winget install microsoft.azd
   ```

2. **Login to Azure**
   ```bash
   azd auth login
   az login
   ```

3. **Initialize and Deploy**
   ```bash
   azd init
   azd up
   ```

### Option 2: Manual Azure Container Apps Deployment

1. **Build and Push Docker Image**
   ```bash
   # Build Docker image
   docker build -t weather-agent .
   
   # Test locally
   docker run -p 3000:3000 weather-agent
   
   # Create Azure Container Registry
   az acr create --resource-group myResourceGroup --name myweatheragent --sku Basic
   
   # Login to ACR
   az acr login --name myweatheragent
   
   # Tag and push image
   docker tag weather-agent myweatheragent.azurecr.io/weather-agent:latest
   docker push myweatheragent.azurecr.io/weather-agent:latest
   ```

2. **Deploy using Bicep**
   ```bash
   # Create resource group
   az group create --name weather-agent-rg --location "East US"
   
   # Deploy infrastructure
   az deployment group create \
     --resource-group weather-agent-rg \
     --template-file infra/main.bicep \
     --parameters containerImage=myweatheragent.azurecr.io/weather-agent:latest
   ```

### Option 3: Azure App Service

1. **Create App Service**
   ```bash
   # Create App Service Plan
   az appservice plan create --name weather-agent-plan --resource-group weather-agent-rg --sku F1 --is-linux
   
   # Create Web App
   az webapp create --resource-group weather-agent-rg --plan weather-agent-plan --name my-weather-agent --runtime "NODE|18-lts"
   
   # Deploy code
   az webapp deployment source config-zip --resource-group weather-agent-rg --name my-weather-agent --src weather-agent.zip
   ```

### Option 4: Heroku (Free Alternative)

1. **Install Heroku CLI**
2. **Deploy to Heroku**
   ```bash
   # Login to Heroku
   heroku login
   
   # Create Heroku app
   heroku create my-weather-agent
   
   # Deploy
   git add .
   git commit -m "Deploy weather agent"
   git push heroku main
   ```

### Option 5: Railway (Simple Deployment)

1. Go to [Railway.app](https://railway.app)
2. Connect your GitHub repository
3. Deploy automatically

### Option 6: Render (Free Tier)

1. Go to [Render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`

### Option 7: Firebase Hosting + Cloud Functions

This repository is now pre-configured for Firebase deployment using:
- `firebase.json`
- `.firebaserc`
- Exported function `api` from `server.js`

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login and Select Project**
   ```bash
   firebase login
   firebase use --add
   ```

3. **Set your project id**
   - Update `.firebaserc` and replace `your-firebase-project-id`.

4. **Deploy**
   ```bash
   npm run deploy:firebase
   ```

5. **What gets deployed**
   - Cloud Function: `api` (Node.js 20)
   - Hosting rewrite: all routes to `api`
   - Frontend: built from `client/dist`

## 🔧 Environment Configuration

For production deployments, create environment variables:

```bash
# Optional: Set custom port
PORT=3000

# For enhanced features (optional)
NODE_ENV=production
```

## 📊 Monitoring and Scaling

### Azure Container Apps
- Auto-scaling based on HTTP requests
- Built-in monitoring with Application Insights
- Zero-downtime deployments

### Health Checks
The application includes health check endpoint for load balancers:
- Endpoint: `GET /api/weather/london`
- Returns 200 for healthy service

## 💰 Cost Optimization

1. **Azure Container Apps**: Pay-per-use, scales to zero
2. **App Service**: F1 tier is free (limited)
3. **Heroku**: Free tier available
4. **Railway**: $5/month after free credits
5. **Render**: Free tier with limitations

## 🔐 Security Best Practices

- Uses non-root user in Docker container
- HTTPS enforced in production
- No sensitive data in code
- Regular security updates

## 🌍 Global Deployment

For multiple regions:
1. Deploy to multiple Azure regions
2. Use Azure Traffic Manager for load balancing
3. Consider CDN for static assets

## 🛰️ Hybrid Deployment (Firebase + Render)

This is the recommended way to get a stable, free backend and global frontend.

### 1. Backend (Render)
1. Go to [Render.com](https://render.com) and create a **Web Service**.
2. Connect your repository.
3. Configure:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:api`
   - **Environment Variables**:
     - `API_ONLY`: `true`
     - `PORT`: `10000`
4. Copy your Render URL (e.g., `https://weather-agent.onrender.com`).

### 2. Frontend (Firebase)
1. In your local terminal, run the special hybrid build:
   ```bash
   # Replace with your actual Render URL
   set VITE_API_BASE_URL=https://your-render-url.onrender.com
   cd client
   npm install
   npm run build
   cd ..
   ```
2. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

---

Choose the deployment option that best fits your needs and budget! 🚀