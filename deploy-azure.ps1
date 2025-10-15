# Quick Azure Deployment Script for Weather Agent
# Run this script to deploy your weather agent to Azure Container Apps

Write-Host "🌤️ Weather Agent Azure Deployment Script" -ForegroundColor Blue
Write-Host "=======================================" -ForegroundColor Blue

# Check if Azure CLI is installed
try {
    az --version | Out-Null
    Write-Host "✅ Azure CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI not found. Please install Azure CLI first." -ForegroundColor Red
    Write-Host "Download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Yellow
    exit 1
}

# Check if logged in to Azure
$account = az account show 2>$null
if (-not $account) {
    Write-Host "🔐 Please login to Azure..." -ForegroundColor Yellow
    az login
}

# Set variables
$resourceGroup = "weather-agent-rg"
$location = "East US"
$appName = "weather-agent-" + (Get-Random -Maximum 9999)

Write-Host "📋 Deployment Configuration:" -ForegroundColor Cyan
Write-Host "  Resource Group: $resourceGroup" -ForegroundColor Gray
Write-Host "  Location: $location" -ForegroundColor Gray
Write-Host "  App Name: $appName" -ForegroundColor Gray

# Create resource group
Write-Host "🏗️ Creating resource group..." -ForegroundColor Yellow
az group create --name $resourceGroup --location $location

# Deploy using Bicep template
Write-Host "🚀 Deploying Weather Agent..." -ForegroundColor Yellow
$deployment = az deployment group create `
    --resource-group $resourceGroup `
    --template-file "infra/main.bicep" `
    --parameters containerAppName=$appName `
    --query "properties.outputs.containerAppUrl.value" `
    --output tsv

if ($deployment) {
    Write-Host "🎉 Deployment Successful!" -ForegroundColor Green
    Write-Host "🌐 Your Weather Agent is available at: $deployment" -ForegroundColor Green
    Write-Host "📊 Azure Portal: https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$resourceGroup" -ForegroundColor Cyan
    
    # Test the deployment
    Write-Host "🧪 Testing deployment..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$deployment/api/weather/london" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ API is working correctly!" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ API test failed, but deployment completed. It may take a few minutes to be fully ready." -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Deployment failed. Check the error messages above." -ForegroundColor Red
}

Write-Host "`n📖 For more deployment options, see DEPLOYMENT.md" -ForegroundColor Cyan