import { Injectable, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StreamSession } from '../entities/stream-session.entity';
import { StreamMetrics } from '../entities/stream-metrics.entity';
import { UserEngagement } from '../entities/user-engagement.entity';
import { StreamAnalytics } from '../entities/stream-analytics.entity';
import { MetricsProcessingService } from './metrics-processing.service';
import { MachineLearningService } from '../../ml/services/machine-learning.service';
import { CacheService } from '../../core/services/cache.service';
import { LoggerService } from '../../core/services/logger.service';

@Injectable()
export class AdvancedAnalyticsService implements OnModuleInit {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly METRICS_BATCH_SIZE = 1000;
  private readonly ANALYSIS_INTERVAL = 300000; // 5 minutes

  constructor(
    @InjectRepository(StreamSession)
    private readonly sessionRepository: Repository<StreamSession>,
    @InjectRepository(StreamMetrics)
    private readonly metricsRepository: Repository<StreamMetrics>,
    @InjectRepository(UserEngagement)
    private readonly engagementRepository: Repository<UserEngagement>,
    @InjectRepository(StreamAnalytics)
    private readonly analyticsRepository: Repository<StreamAnalytics>,
    private readonly elasticsearchService: ElasticsearchService,
    private readonly metricsProcessingService: MetricsProcessingService,
    private readonly mlService: MachineLearningService,
    private readonly cacheService: CacheService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    await this.initializeAnalytics();
    this.startPeriodicAnalysis();
  }

  private async initializeAnalytics() {
    try {
      await this.setupElasticsearchIndices();
      await this.initializeMLModels();
      await this.validateHistoricalData();
    } catch (error) {
      this.logger.error('Failed to initialize analytics', error);
      throw error;
    }
  }

  // Real-time Analytics
  public async processStreamMetrics(streamId: string, metrics: StreamMetrics) {
    try {
      // Process metrics in real-time
      const processedMetrics = await this.metricsProcessingService.processMetrics(metrics);
      
      // Store processed metrics
      await this.storeProcessedMetrics(streamId, processedMetrics);
      
      // Update real-time analytics
      await this.updateRealTimeAnalytics(streamId, processedMetrics);
      
      // Check for anomalies
      await this.detectAnomalies(streamId, processedMetrics);
      
      return processedMetrics;
    } catch (error) {
      this.logger.error('Error processing stream metrics', error);
      throw error;
    }
  }

  // Advanced Analytics Generation
  public async generateAdvancedAnalytics(streamId: string): Promise<StreamAnalytics> {
    try {
      // Check cache first
      const cachedAnalytics = await this.cacheService.get(`analytics:${streamId}`);
      if (cachedAnalytics) return cachedAnalytics;

      // Gather all required data
      const [
        session,
        metrics,
        engagement,
        predictions
      ] = await Promise.all([
        this.getStreamSession(streamId),
        this.getStreamMetrics(streamId),
        this.getEngagementData(streamId),
        this.getPredictiveAnalytics(streamId)
      ]);

      // Generate comprehensive analytics
      const analytics = await this.generateComprehensiveAnalytics({
        session,
        metrics,
        engagement,
        predictions
      });

      // Cache results
      await this.cacheService.set(`analytics:${streamId}`, analytics, this.CACHE_TTL);

      return analytics;
    } catch (error) {
      this.logger.error('Error generating advanced analytics', error);
      throw error;
    }
  }

  // Predictive Analytics
  private async generatePredictiveAnalytics(streamId: string) {
    const historicalData = await this.getHistoricalData(streamId);
    const currentMetrics = await this.getCurrentMetrics(streamId);

    return await this.mlService.generatePredictions({
      historicalData,
      currentMetrics,
      predictionTypes: [
        'viewerTrend',
        'engagementRate',
        'retentionRate',
        'monetizationPotential'
      ]
    });
  }

  // Engagement Analysis
  private async analyzeEngagement(streamId: string): Promise<EngagementAnalytics> {
    const engagement = await this.engagementRepository.find({
      where: { streamId },
      order: { timestamp: 'DESC' }
    });

    return {
      overallEngagement: await this.calculateOverallEngagement(engagement),
      peakEngagementPeriods: await this.identifyPeakEngagementPeriods(engagement),
      engagementTrends: await this.analyzeEngagementTrends(engagement),
      userSegmentation: await this.performUserSegmentation(engagement),
      contentCorrelation: await this.analyzeContentCorrelation(engagement)
    };
  }

  // Performance Analytics
  private async analyzePerformance(streamId: string): Promise<PerformanceAnalytics> {
    const metrics = await this.metricsRepository.find({
      where: { streamId },
      order: { timestamp: 'DESC' }
    });

    return {
      technicalMetrics: await this.analyzeTechnicalMetrics(metrics),
      qualityMetrics: await this.analyzeQualityMetrics(metrics),
      networkMetrics: await this.analyzeNetworkMetrics(metrics),
      platformComparison: await this.comparePlatformPerformance(metrics)
    };
  }

  // Anomaly Detection
  private async detectAnomalies(metrics: StreamMetrics): Promise<AnomalyDetectionResult> {
    const anomalyDetector = await this.mlService.getAnomalyDetector();
    const baselineMetrics = await this.getBaselineMetrics();

    return await anomalyDetector.detectAnomalies({
      currentMetrics: metrics,
      baselineMetrics,
      sensitivityLevel: 0.8,
      detectionTypes: [
        'viewerSpikes',
        'qualityDegradation',
        'engagementAnomalies',
        'technicalIssues'
      ]
    });
  }

  // Trend Analysis
  private async analyzeTrends(streamId: string): Promise<TrendAnalysis> {
    const historicalData = await this.getHistoricalData(streamId);
    
    return {
      viewerTrends: await this.analyzeViewerTrends(historicalData),
      engagementTrends: await this.analyzeEngagementTrends(historicalData),
      contentTrends: await this.analyzeContentTrends(historicalData),
      platformTrends: await this.analyzePlatformTrends(historicalData)
    };
  }

  // Revenue Analytics
  private async analyzeRevenue(streamId: string): Promise<RevenueAnalytics> {
    const revenueData = await this.getRevenueData(streamId);
    
    return {
      totalRevenue: await this.calculateTotalRevenue(revenueData),
      revenueBreakdown: await this.generateRevenueBreakdown(revenueData),
      monetizationEfficiency: await this.calculateMonetizationEfficiency(revenueData),
      revenueProjections: await this.generateRevenueProjections(revenueData)
    };
  }

  // Comparative Analytics
  private async generateComparativeAnalytics(streamId: string): Promise<ComparativeAnalytics> {
    const similarStreams = await this.findSimilarStreams(streamId);
    
    return {
      performanceComparison: await this.comparePerformance(streamId, similarStreams),
      engagementComparison: await this.compareEngagement(streamId, similarStreams),
      monetizationComparison: await this.compareMonetization(streamId, similarStreams),
      marketPositioning: await this.analyzeMarketPosition(streamId, similarStreams)
    };
  }

  // Helper Methods
  private async getHistoricalData(streamId: string) {
    return await this.elasticsearchService.search({
      index: 'stream_metrics',
      body: {
        query: {
          bool: {
            must: [
              { match: { streamId } },
              {
                range: {
                  timestamp: {
                    gte: 'now-30d/d',
                    lte: 'now'
                  }
                }
              }
            ]
          }
        },
        sort: [{ timestamp: 'asc' }],
        size: 10000
      }
    });
  }

  private startPeriodicAnalysis() {
    setInterval(async () => {
      try {
        const activeStreams = await this.getActiveStreams();
        for (const stream of activeStreams) {
          await this.processStreamMetrics(stream.id, await this.getCurrentMetrics(stream.id));
        }
      } catch (error) {
        this.logger.error('Error in periodic analysis', error);
      }
    }, this.ANALYSIS_INTERVAL);
  }
}

// Types
interface EngagementAnalytics {
  overallEngagement: number;
  peakEngagementPeriods: Array<{
    start: Date;
    end: Date;
    level: number;
  }>;
  engagementTrends: Array<{
    timestamp: Date;
    trend: number;
  }>;
  userSegmentation: Array<{
    segment: string;
    size: number;
    engagement: number;
  }>;
  contentCorrelation: Array<{
    contentType: string;
    correlation: number;
  }>;
}

interface PerformanceAnalytics {
  technicalMetrics: {
    averageLatency: number;
    bufferingRatio: number;
    qualityScore: number;
  };
  qualityMetrics: {
    resolution: string;
    bitrate: number;
    fps: number;
    stability: number;
  };
  networkMetrics: {
    bandwidth: number;
    packetLoss: number;
    jitter: number;
  };
  platformComparison: Array<{
    platform: string;
    performance: number;
  }>;
}

interface RevenueAnalytics {
  totalRevenue: number;
  revenueBreakdown: {
    subscriptions: number;
    donations: number;
    advertisements: number;
    sponsorships: number;
  };
  monetizationEfficiency: number;
  revenueProjections: Array<{
    timestamp: Date;
    projected: number;
  }>;
}

interface ComparativeAnalytics {
  performanceComparison: {
    rank: number;
    percentile: number;
    metrics: Record<string, number>;
  };
  engagementComparison: {
    rank: number;
    percentile: number;
    metrics: Record<string, number>;
  };
  monetizationComparison: {
    rank: number;
    percentile: number;
    metrics: Record<string, number>;
  };
  marketPositioning: {
    segment: string;
    competitiveness: number;
    opportunities: string[];
  };
}
