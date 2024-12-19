import { defineConfig } from './config/types'

export default defineConfig({
  project: {
    name: 'Space Hub',
    version: '2.0.0',
    description: 'Advanced Streaming Platform Integration Hub',
    repository: 'https://github.com/yourusername/space-hub'
  },
  
  infrastructure: {
    kubernetes: {
      clusters: ['production', 'staging', 'development'],
      namespaces: {
        production: ['space-hub-prod', 'monitoring-prod', 'ml-prod'],
        staging: ['space-hub-staging', 'monitoring-staging', 'ml-staging'],
        development: ['space-hub-dev', 'monitoring-dev', 'ml-dev']
      }
    },
    
    docker: {
      registry: 'ghcr.io',
      images: {
        backend: {
          context: './src/backend',
          dockerfile: 'Dockerfile',
          tags: ['latest', '${version}']
        },
        frontend: {
          context: './src/frontend',
          dockerfile: 'Dockerfile',
          tags: ['latest', '${version}']
        },
        ml: {
          context: './src/ml',
          dockerfile: 'Dockerfile.ml',
          tags: ['latest', '${version}']
        }
      }
    },
    
    monitoring: {
      prometheus: {
        enabled: true,
        retention: '15d',
        scrapeInterval: '15s'
      },
      grafana: {
        enabled: true,
        defaultDashboards: ['platform-metrics', 'ml-metrics', 'streaming-metrics']
      },
      elasticStack: {
        enabled: true,
        components: ['elasticsearch', 'kibana', 'filebeat', 'metricbeat']
      }
    }
  },
  
  services: {
    backend: {
      port: 3000,
      scaling: {
        min: 2,
        max: 10,
        targetCPUUtilization: 70
      },
      dependencies: [
        'postgresql',
        'redis',
        'rabbitmq',
        'elasticsearch'
      ]
    },
    
    frontend: {
      port: 80,
      scaling: {
        min: 2,
        max: 8,
        targetCPUUtilization: 60
      }
    },
    
    ml: {
      port: 5000,
      scaling: {
        min: 1,
        max: 5,
        targetCPUUtilization: 80
      },
      gpu: {
        enabled: true,
        type: 'nvidia-tesla-t4',
        count: 1
      }
    }
  },
  
  databases: {
    postgresql: {
      version: '14',
      replicas: 3,
      backup: {
        enabled: true,
        schedule: '0 2 * * *',
        retention: '30d'
      }
    },
    
    redis: {
      version: '6.2',
      cluster: {
        enabled: true,
        nodes: 3
      }
    },
    
    elasticsearch: {
      version: '8.7.0',
      cluster: {
        enabled: true,
        nodes: {
          master: 3,
          data: 3,
          ingest: 2
        }
      }
    }
  },
  
  messaging: {
    rabbitmq: {
      version: '3.9',
      cluster: {
        enabled: true,
        nodes: 3
      },
      queues: [
        'streaming-events',
        'ml-predictions',
        'user-notifications'
      ]
    }
  },
  
  security: {
    authentication: {
      providers: ['jwt', 'oauth2', 'apiKey'],
      oauth2: {
        providers: ['google', 'github', 'twitch', 'youtube']
      }
    },
    
    encryption: {
      algorithm: 'AES-256-GCM',
      keyRotation: true,
      rotationPeriod: '30d'
    },
    
    networkPolicies: {
      enabled: true,
      defaultDeny: true
    }
  },
  
  ci: {
    providers: ['github-actions'],
    stages: [
      'lint',
      'test',
      'security-scan',
      'build',
      'deploy',
      'performance-test'
    ],
    environments: ['development', 'staging', 'production'],
    notifications: {
      slack: true,
      email: true
    }
  },
  
  monitoring: {
    metrics: {
      custom: [
        'streaming_concurrent_viewers',
        'ml_prediction_accuracy',
        'platform_integration_health'
      ],
      alerts: {
        enabled: true,
        providers: ['slack', 'pagerduty']
      }
    },
    
    logging: {
      level: 'info',
      retention: '30d',
      structured: true,
      exporters: ['elasticsearch']
    },
    
    tracing: {
      enabled: true,
      provider: 'opentelemetry',
      samplingRate: 0.1
    }
  }
})
