import { StreamQuality, BitrateMetric, QualityMetrics } from '../types';
import { STREAM_QUALITY } from '../constants';

export class StreamingHelpers {
  /**
   * Calculate optimal streaming settings based on network conditions
   */
  static calculateOptimalQuality(
    bandwidth: number,
    cpuUsage: number,
    gpuAvailable: boolean
  ): StreamQuality {
    // Start with highest quality
    let quality = { ...STREAM_QUALITY.ULTRA };

    // Adjust based on bandwidth (assuming 1.5x bitrate for headroom)
    const availableBandwidth = bandwidth / 1.5;
    if (availableBandwidth < STREAM_QUALITY.ULTRALOW.bitrate) {
      throw new Error('Insufficient bandwidth for streaming');
    }

    // Find highest quality that fits bandwidth
    if (availableBandwidth < STREAM_QUALITY.LOW.bitrate) {
      quality = { ...STREAM_QUALITY.ULTRALOW };
    } else if (availableBandwidth < STREAM_QUALITY.MEDIUM.bitrate) {
      quality = { ...STREAM_QUALITY.LOW };
    } else if (availableBandwidth < STREAM_QUALITY.HIGH.bitrate) {
      quality = { ...STREAM_QUALITY.MEDIUM };
    } else if (availableBandwidth < STREAM_QUALITY.ULTRA.bitrate) {
      quality = { ...STREAM_QUALITY.HIGH };
    }

    // Adjust encoder settings based on CPU/GPU
    if (gpuAvailable) {
      quality.codec = 'nvenc';
      quality.preset = 'quality';
    } else {
      // Adjust CPU preset based on usage
      if (cpuUsage > 80) {
        quality.preset = 'ultrafast';
      } else if (cpuUsage > 60) {
        quality.preset = 'veryfast';
      } else if (cpuUsage > 40) {
        quality.preset = 'faster';
      }
    }

    return quality;
  }

  /**
   * Analyze stream health based on metrics
   */
  static analyzeStreamHealth(metrics: QualityMetrics): StreamHealthAnalysis {
    const issues: string[] = [];
    let score = 100;

    // Check FPS
    if (metrics.droppedFrames > 0) {
      const dropRate = (metrics.droppedFrames / metrics.fps) * 100;
      if (dropRate > 5) {
        issues.push(`High frame drop rate: ${dropRate.toFixed(2)}%`);
        score -= 20;
      } else if (dropRate > 1) {
        issues.push(`Moderate frame drop rate: ${dropRate.toFixed(2)}%`);
        score -= 10;
      }
    }

    // Check encoder usage
    if (metrics.encoderCpu > 90) {
      issues.push('CPU encoder near maximum capacity');
      score -= 15;
    } else if (metrics.encoderCpu > 75) {
      issues.push('High CPU encoder usage');
      score -= 10;
    }

    if (metrics.encoderGpu > 90) {
      issues.push('GPU encoder near maximum capacity');
      score -= 15;
    } else if (metrics.encoderGpu > 75) {
      issues.push('High GPU encoder usage');
      score -= 10;
    }

    // Analyze bitrate stability
    const bitrateVariation = this.calculateBitrateVariation(metrics.bitrate);
    if (bitrateVariation > 30) {
      issues.push('Severe bitrate instability');
      score -= 20;
    } else if (bitrateVariation > 15) {
      issues.push('Moderate bitrate instability');
      score -= 10;
    }

    return {
      score: Math.max(0, score),
      issues,
      status: this.determineHealthStatus(score),
    };
  }

  /**
   * Calculate bitrate variation percentage
   */
  private static calculateBitrateVariation(currentBitrate: number): number {
    const targetBitrate = this.getTargetBitrate(currentBitrate);
    return Math.abs((currentBitrate - targetBitrate) / targetBitrate) * 100;
  }

  /**
   * Get target bitrate based on current bitrate
   */
  private static getTargetBitrate(currentBitrate: number): number {
    // Find the closest quality preset
    const presets = Object.values(STREAM_QUALITY);
    return presets.reduce((prev, curr) => {
      return Math.abs(curr.bitrate - currentBitrate) < Math.abs(prev.bitrate - currentBitrate)
        ? curr
        : prev;
    }).bitrate;
  }

  /**
   * Determine stream health status based on score
   */
  private static determineHealthStatus(score: number): StreamHealthStatus {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Calculate stream statistics
   */
  static calculateStreamStats(metrics: BitrateMetric[]): StreamStats {
    if (!metrics.length) {
      throw new Error('No metrics available');
    }

    const bitrates = metrics.map(m => m.value);
    const timestamps = metrics.map(m => m.timestamp.getTime());

    return {
      averageBitrate: this.calculateAverage(bitrates),
      maxBitrate: Math.max(...bitrates),
      minBitrate: Math.min(...bitrates),
      bitrateStability: this.calculateStability(bitrates),
      duration: (Math.max(...timestamps) - Math.min(...timestamps)) / 1000, // in seconds
      totalData: this.calculateTotalData(bitrates, timestamps),
    };
  }

  /**
   * Calculate average value
   */
  private static calculateAverage(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate stability percentage (100 = perfectly stable)
   */
  private static calculateStability(values: number[]): number {
    const avg = this.calculateAverage(values);
    const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert to stability percentage (inverse of coefficient of variation)
    const stability = 100 - ((standardDeviation / avg) * 100);
    return Math.max(0, Math.min(100, stability));
  }

  /**
   * Calculate total data transferred in MB
   */
  private static calculateTotalData(bitrates: number[], timestamps: number[]): number {
    let totalBytes = 0;
    for (let i = 1; i < bitrates.length; i++) {
      const duration = (timestamps[i] - timestamps[i - 1]) / 1000; // in seconds
      const averageBitrate = (bitrates[i] + bitrates[i - 1]) / 2;
      totalBytes += (averageBitrate * duration) / 8; // convert bits to bytes
    }
    return totalBytes / (1024 * 1024); // convert to MB
  }
}

interface StreamHealthAnalysis {
  score: number;
  issues: string[];
  status: StreamHealthStatus;
}

type StreamHealthStatus = 'excellent' | 'good' | 'fair' | 'poor';

interface StreamStats {
  averageBitrate: number;
  maxBitrate: number;
  minBitrate: number;
  bitrateStability: number;
  duration: number;
  totalData: number;
}
