// Azure Weather Agent Deployment
// This Bicep template deploys the Weather Agent application to Azure Container Apps

@description('Location for all resources')
param location string = resourceGroup().location

@description('Name of the Container App')
param containerAppName string = 'weather-agent-app'

@description('Name of the Container Apps Environment')
param containerAppsEnvironmentName string = 'weather-agent-env'

@description('Name of the Log Analytics workspace')
param logAnalyticsWorkspaceName string = 'weather-agent-logs'

@description('Container image to deploy')
param containerImage string = 'node:18-alpine'

@description('CPU and memory resources')
param resources object = {
  cpu: '0.25'
  memory: '0.5Gi'
}

// Log Analytics Workspace for Container Apps logging
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsWorkspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Container Apps Environment
resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppsEnvironmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
  }
}

// Container App for Weather Agent
resource weatherAgentApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        allowInsecure: false
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      registries: []
    }
    template: {
      containers: [
        {
          image: containerImage
          name: 'weather-agent'
          resources: {
            cpu: json(resources.cpu)
            memory: resources.memory
          }
          command: [
            '/bin/sh'
          ]
          args: [
            '-c'
            'npm install && npm start'
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// Outputs
output containerAppUrl string = 'https://${weatherAgentApp.properties.configuration.ingress.fqdn}'
output resourceGroupName string = resourceGroup().name
output containerAppName string = weatherAgentApp.name