// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
  settings: UserSettings;
  stats: UserStats;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  streaming: StreamingSettings;
  language: string;
  timezone: string;
}

export interface UserStats {
  totalStreamTime: number;
  totalViewers: number;
  followers: number;
  averageViewership: number;
  peakViewership: number;
  engagement: number;
}

// Stream Types
export interface Stream {
  id: string;
  userId: string;
  title: string;
  description?: string;
  thumbnail?: string;
  startTime: Date;
  endTime?: Date;
  status: StreamStatus;
  settings: StreamSettings;
  metrics: StreamMetrics;
  platforms: StreamPlatform[];
}

export type StreamStatus = 'scheduled' | 'live' | 'ended' | 'error';

export interface StreamSettings {
  quality: StreamQuality;
  privacy: StreamPrivacy;
  chat: ChatSettings;
  recording: RecordingSettings;
  multiplatform: MultiPlatformSettings;
}

export interface StreamMetrics {
  currentViewers: number;
  peakViewers: number;
  chatMessages: number;
  likes: number;
  shares: number;
  averageWatchTime: number;
  bufferRatio: number;
  bitrateHistory: BitrateMetric[];
  qualityMetrics: QualityMetrics;
}

// Platform Types
export interface Platform {
  id: string;
  name: PlatformName;
  enabled: boolean;
  credentials: PlatformCredentials;
  settings: PlatformSettings;
  metrics: PlatformMetrics;
}

export type PlatformName = 'twitch' | 'youtube' | 'facebook' | 'tiktok' | 'instagram';

export interface PlatformCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
}

// Analytics Types
export interface Analytics {
  id: string;
  userId: string;
  streamId?: string;
  type: AnalyticsType;
  data: AnalyticsData;
  timestamp: Date;
}

export type AnalyticsType = 'stream' | 'engagement' | 'revenue' | 'performance';

export interface AnalyticsData {
  metrics: { [key: string]: number };
  dimensions: { [key: string]: string };
  segments: string[];
}

// ML Types
export interface MLPrediction {
  id: string;
  type: PredictionType;
  input: any;
  output: any;
  confidence: number;
  timestamp: Date;
}

export type PredictionType = 'engagement' | 'quality' | 'recommendation' | 'anomaly';

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export type NotificationType = 'stream' | 'chat' | 'achievement' | 'system' | 'update';

// Settings Types
export interface NotificationSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: {
    [K in NotificationType]: boolean;
  };
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'followers';
  streamHistory: boolean;
  showLocation: boolean;
  dataCollection: boolean;
}

export interface StreamingSettings {
  defaultQuality: StreamQuality;
  autoRecord: boolean;
  lowLatencyMode: boolean;
  chatDelay: number;
  multiplatform: boolean;
}

// Quality Types
export interface StreamQuality {
  resolution: string;
  framerate: number;
  bitrate: number;
  codec: string;
  preset: string;
}

export interface QualityMetrics {
  fps: number;
  bitrate: number;
  resolution: string;
  keyframeInterval: number;
  encoderCpu: number;
  encoderGpu: number;
  droppedFrames: number;
}

export interface BitrateMetric {
  timestamp: Date;
  value: number;
  type: 'video' | 'audio';
}

// Chat Types
export interface ChatMessage {
  id: string;
  streamId: string;
  userId: string;
  platform: PlatformName;
  content: string;
  type: ChatMessageType;
  metadata: ChatMessageMetadata;
  timestamp: Date;
}

export type ChatMessageType = 'text' | 'emote' | 'donation' | 'subscription' | 'system';

export interface ChatMessageMetadata {
  badges?: string[];
  color?: string;
  emotes?: ChatEmote[];
  donation?: DonationInfo;
  subscription?: SubscriptionInfo;
}

export interface ChatEmote {
  id: string;
  name: string;
  url: string;
  positions: [number, number][];
}

// Additional Settings Types
export interface ChatSettings {
  enabled: boolean;
  moderation: ModerationSettings;
  commands: CommandSettings;
  emotes: EmoteSettings;
}

export interface RecordingSettings {
  enabled: boolean;
  format: 'mp4' | 'mkv';
  quality: StreamQuality;
  storage: StorageSettings;
}

export interface MultiPlatformSettings {
  enabled: boolean;
  platforms: {
    [K in PlatformName]?: PlatformStreamSettings;
  };
  chatSync: boolean;
}

export interface ModerationSettings {
  enabled: boolean;
  automod: boolean;
  wordBlacklist: string[];
  linkProtection: boolean;
  spamProtection: boolean;
}

export interface CommandSettings {
  prefix: string;
  enabled: boolean;
  custom: CustomCommand[];
}

export interface EmoteSettings {
  enabled: boolean;
  custom: CustomEmote[];
}

export interface StorageSettings {
  provider: 'local' | 's3' | 'gcs';
  path: string;
  retention: number;
}

export interface PlatformStreamSettings {
  enabled: boolean;
  title?: string;
  description?: string;
  privacy: StreamPrivacy;
  quality: StreamQuality;
}

export interface CustomCommand {
  name: string;
  response: string;
  cooldown: number;
  userLevel: UserLevel;
}

export interface CustomEmote {
  name: string;
  url: string;
  animated: boolean;
}

export type UserLevel = 'viewer' | 'subscriber' | 'moderator' | 'broadcaster';
export type StreamPrivacy = 'public' | 'unlisted' | 'private';

// Platform Specific Types
export interface PlatformSettings {
  autoPublish: boolean;
  customization: PlatformCustomization;
  integration: PlatformIntegration;
}

export interface PlatformMetrics {
  followers: number;
  subscribers: number;
  totalViews: number;
  engagement: number;
}

export interface PlatformCustomization {
  branding: {
    color: string;
    logo?: string;
  };
  layout: {
    chat: boolean;
    overlay: boolean;
  };
}

export interface PlatformIntegration {
  webhooks: boolean;
  api: boolean;
  oauth: boolean;
}

// Donation and Subscription Types
export interface DonationInfo {
  amount: number;
  currency: string;
  message?: string;
}

export interface SubscriptionInfo {
  tier: number;
  months: number;
  message?: string;
}

// Error Types
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}
