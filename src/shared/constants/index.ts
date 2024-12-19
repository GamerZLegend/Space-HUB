// API Constants
export const API = {
  VERSION: 'v1',
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  }
};

// WebSocket Constants
export const WEBSOCKET = {
  RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 5,
  PING_INTERVAL: 30000,
  EVENTS: {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    ERROR: 'error',
    STREAM_START: 'stream:start',
    STREAM_END: 'stream:end',
    STREAM_ERROR: 'stream:error',
    CHAT_MESSAGE: 'chat:message',
    CHAT_MODERATION: 'chat:moderation',
    METRICS_UPDATE: 'metrics:update'
  }
};

// Stream Quality Presets
export const STREAM_QUALITY = {
  ULTRALOW: {
    resolution: '640x360',
    framerate: 24,
    bitrate: 500000,
    codec: 'x264',
    preset: 'veryfast'
  },
  LOW: {
    resolution: '852x480',
    framerate: 30,
    bitrate: 1000000,
    codec: 'x264',
    preset: 'veryfast'
  },
  MEDIUM: {
    resolution: '1280x720',
    framerate: 30,
    bitrate: 2500000,
    codec: 'x264',
    preset: 'veryfast'
  },
  HIGH: {
    resolution: '1920x1080',
    framerate: 60,
    bitrate: 6000000,
    codec: 'x264',
    preset: 'fast'
  },
  ULTRA: {
    resolution: '2560x1440',
    framerate: 60,
    bitrate: 12000000,
    codec: 'x264',
    preset: 'medium'
  }
};

// Platform Integration Constants
export const PLATFORMS = {
  TWITCH: {
    name: 'twitch',
    baseUrl: 'https://api.twitch.tv/helix',
    scopes: [
      'channel:manage:broadcast',
      'channel:read:stream_key',
      'chat:edit',
      'chat:read'
    ],
    rateLimit: {
      requests: 800,
      duration: 60000 // 1 minute
    }
  },
  YOUTUBE: {
    name: 'youtube',
    baseUrl: 'https://www.googleapis.com/youtube/v3',
    scopes: [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ],
    rateLimit: {
      requests: 10000,
      duration: 86400000 // 24 hours
    }
  },
  FACEBOOK: {
    name: 'facebook',
    baseUrl: 'https://graph.facebook.com',
    scopes: [
      'publish_video',
      'manage_pages',
      'publish_pages'
    ],
    rateLimit: {
      requests: 200,
      duration: 3600000 // 1 hour
    }
  },
  TIKTOK: {
    name: 'tiktok',
    baseUrl: 'https://open-api.tiktok.com',
    scopes: [
      'user.info.basic',
      'video.list',
      'video.publish'
    ],
    rateLimit: {
      requests: 100,
      duration: 60000 // 1 minute
    }
  },
  INSTAGRAM: {
    name: 'instagram',
    baseUrl: 'https://graph.instagram.com',
    scopes: [
      'instagram_graph_user_profile',
      'instagram_graph_user_media'
    ],
    rateLimit: {
      requests: 200,
      duration: 3600000 // 1 hour
    }
  }
};

// Analytics Constants
export const ANALYTICS = {
  METRICS_INTERVAL: 5000, // 5 seconds
  RETENTION_PERIOD: 90, // 90 days
  AGGREGATION_INTERVALS: {
    REALTIME: '1m',
    HOURLY: '1h',
    DAILY: '1d',
    WEEKLY: '1w',
    MONTHLY: '1M'
  },
  DIMENSIONS: {
    PLATFORM: 'platform',
    LOCATION: 'location',
    DEVICE: 'device',
    BROWSER: 'browser',
    OS: 'os'
  }
};

// Machine Learning Constants
export const ML = {
  MODEL_UPDATE_INTERVAL: 86400000, // 24 hours
  PREDICTION_CONFIDENCE_THRESHOLD: 0.8,
  ANOMALY_DETECTION: {
    SENSITIVITY: 0.95,
    WINDOW_SIZE: 100,
    MIN_SAMPLES: 30
  },
  RECOMMENDATION: {
    MAX_ITEMS: 10,
    CACHE_TTL: 300000 // 5 minutes
  }
};

// Cache Constants
export const CACHE = {
  TTL: {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    EXTENDED: 86400 // 24 hours
  },
  KEYS: {
    USER_PROFILE: 'user:profile:',
    STREAM_INFO: 'stream:info:',
    METRICS: 'metrics:',
    RECOMMENDATIONS: 'recommendations:'
  }
};

// Security Constants
export const SECURITY = {
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true
  },
  JWT: {
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '7d',
    ALGORITHM: 'HS256'
  },
  RATE_LIMITING: {
    LOGIN: {
      WINDOW_MS: 900000, // 15 minutes
      MAX_ATTEMPTS: 5
    },
    API: {
      WINDOW_MS: 900000, // 15 minutes
      MAX_REQUESTS: 100
    }
  }
};

// Error Constants
export const ERRORS = {
  CODES: {
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    PLATFORM_ERROR: 'PLATFORM_ERROR',
    STREAM_ERROR: 'STREAM_ERROR'
  },
  MESSAGES: {
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access denied',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation failed',
    RATE_LIMIT_EXCEEDED: 'Too many requests',
    INTERNAL_ERROR: 'Internal server error',
    PLATFORM_ERROR: 'Platform integration error',
    STREAM_ERROR: 'Streaming error'
  }
};

// Notification Constants
export const NOTIFICATIONS = {
  TYPES: {
    STREAM_START: 'stream_start',
    STREAM_END: 'stream_end',
    NEW_FOLLOWER: 'new_follower',
    NEW_SUBSCRIBER: 'new_subscriber',
    ACHIEVEMENT: 'achievement',
    SYSTEM: 'system'
  },
  PRIORITIES: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
  }
};
