import { StreamQuality, StreamSettings, PlatformName } from '../types';

export class ValidationUtils {
  static readonly SUPPORTED_RESOLUTIONS = [
    '640x360',
    '852x480',
    '1280x720',
    '1920x1080',
    '2560x1440',
    '3840x2160'
  ];

  static readonly SUPPORTED_FRAMERATES = [24, 30, 48, 60];

  static readonly BITRATE_LIMITS = {
    min: 500_000,    // 500 Kbps
    max: 15_000_000  // 15 Mbps
  };

  static readonly PLATFORM_LIMITS = {
    twitch: {
      maxBitrate: 6_000_000,
      maxResolution: '1920x1080',
      maxFramerate: 60
    },
    youtube: {
      maxBitrate: 15_000_000,
      maxResolution: '3840x2160',
      maxFramerate: 60
    },
    facebook: {
      maxBitrate: 4_000_000,
      maxResolution: '1920x1080',
      maxFramerate: 30
    },
    tiktok: {
      maxBitrate: 2_000_000,
      maxResolution: '1920x1080',
      maxFramerate: 30
    },
    instagram: {
      maxBitrate: 2_000_000,
      maxResolution: '1280x720',
      maxFramerate: 30
    }
  };

  static validateStreamQuality(quality: StreamQuality): ValidationResult {
    const errors: string[] = [];

    // Validate resolution
    if (!this.SUPPORTED_RESOLUTIONS.includes(quality.resolution)) {
      errors.push(`Unsupported resolution: ${quality.resolution}`);
    }

    // Validate framerate
    if (!this.SUPPORTED_FRAMERATES.includes(quality.framerate)) {
      errors.push(`Unsupported framerate: ${quality.framerate}`);
    }

    // Validate bitrate
    if (quality.bitrate < this.BITRATE_LIMITS.min || quality.bitrate > this.BITRATE_LIMITS.max) {
      errors.push(`Bitrate must be between ${this.BITRATE_LIMITS.min} and ${this.BITRATE_LIMITS.max}`);
    }

    // Validate codec
    if (!['x264', 'x265', 'nvenc', 'quicksync'].includes(quality.codec)) {
      errors.push(`Unsupported codec: ${quality.codec}`);
    }

    // Validate preset
    if (!['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'].includes(quality.preset)) {
      errors.push(`Unsupported preset: ${quality.preset}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validatePlatformSettings(platform: PlatformName, quality: StreamQuality): ValidationResult {
    const errors: string[] = [];
    const limits = this.PLATFORM_LIMITS[platform];

    // Check bitrate
    if (quality.bitrate > limits.maxBitrate) {
      errors.push(`${platform} maximum bitrate is ${limits.maxBitrate}`);
    }

    // Check resolution
    const [width] = quality.resolution.split('x').map(Number);
    const [maxWidth] = limits.maxResolution.split('x').map(Number);
    if (width > maxWidth) {
      errors.push(`${platform} maximum resolution is ${limits.maxResolution}`);
    }

    // Check framerate
    if (quality.framerate > limits.maxFramerate) {
      errors.push(`${platform} maximum framerate is ${limits.maxFramerate}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validateStreamSettings(settings: StreamSettings): ValidationResult {
    const errors: string[] = [];

    // Validate quality settings
    const qualityValidation = this.validateStreamQuality(settings.quality);
    if (!qualityValidation.valid) {
      errors.push(...qualityValidation.errors);
    }

    // Validate privacy settings
    if (!['public', 'unlisted', 'private'].includes(settings.privacy)) {
      errors.push(`Invalid privacy setting: ${settings.privacy}`);
    }

    // Validate chat settings
    if (settings.chat) {
      if (typeof settings.chat.enabled !== 'boolean') {
        errors.push('Invalid chat enabled setting');
      }
      if (settings.chat.moderation && typeof settings.chat.moderation.enabled !== 'boolean') {
        errors.push('Invalid chat moderation setting');
      }
    }

    // Validate recording settings
    if (settings.recording) {
      if (typeof settings.recording.enabled !== 'boolean') {
        errors.push('Invalid recording enabled setting');
      }
      if (!['mp4', 'mkv'].includes(settings.recording.format)) {
        errors.push(`Invalid recording format: ${settings.recording.format}`);
      }
    }

    // Validate multiplatform settings
    if (settings.multiplatform) {
      if (typeof settings.multiplatform.enabled !== 'boolean') {
        errors.push('Invalid multiplatform enabled setting');
      }
      if (settings.multiplatform.platforms) {
        for (const [platform, platformSettings] of Object.entries(settings.multiplatform.platforms)) {
          if (platformSettings && platformSettings.enabled) {
            const platformValidation = this.validatePlatformSettings(platform as PlatformName, platformSettings.quality);
            if (!platformValidation.valid) {
              errors.push(...platformValidation.errors.map(error => `${platform}: ${error}`));
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}
