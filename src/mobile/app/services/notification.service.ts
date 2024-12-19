import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import PushNotification, { Importance } from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { SecurityService } from './security.service';
import { AnalyticsService } from './analytics.service';
import { LoggerService } from './logger.service';

export class NotificationService {
  private static instance: NotificationService;
  private notificationPermission$ = new BehaviorSubject<boolean>(false);
  private notificationToken$ = new BehaviorSubject<string | null>(null);
  private readonly NOTIFICATION_CHANNEL_ID = 'space-hub-notifications';
  private readonly NOTIFICATION_STORAGE_KEY = '@notifications';

  private constructor(
    private apiService: ApiService,
    private securityService: SecurityService,
    private analyticsService: AnalyticsService,
    private logger: LoggerService,
  ) {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService(
        ApiService.getInstance(),
        SecurityService.getInstance(),
        AnalyticsService.getInstance(),
        LoggerService.getInstance(),
      );
    }
    return NotificationService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      await this.setupNotifications();
      await this.registerNotificationHandlers();
      await this.restoreNotificationSettings();
      
      this.logger.info('Notification service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  private async setupNotifications(): Promise<void> {
    if (Platform.OS === 'ios') {
      await this.setupIOSNotifications();
    } else {
      await this.setupAndroidNotifications();
    }
  }

  private async setupIOSNotifications(): Promise<void> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled = 
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        await this.registerForPushNotifications();
      }

      this.notificationPermission$.next(enabled);
    } catch (error) {
      this.logger.error('iOS notification setup failed:', error);
      throw error;
    }
  }

  private async setupAndroidNotifications(): Promise<void> {
    try {
      PushNotification.createChannel(
        {
          channelId: this.NOTIFICATION_CHANNEL_ID,
          channelName: 'Space Hub Notifications',
          channelDescription: 'Space Hub streaming and collaboration notifications',
          playSound: true,
          soundName: 'default',
          importance: Importance.HIGH,
          vibrate: true,
        },
        (created) => this.logger.info(`Notification channel created: ${created}`)
      );

      await this.registerForPushNotifications();
      this.notificationPermission$.next(true);
    } catch (error) {
      this.logger.error('Android notification setup failed:', error);
      throw error;
    }
  }

  private async registerForPushNotifications(): Promise<void> {
    try {
      await messaging().registerDeviceForRemoteMessages();
      const token = await messaging().getToken();
      
      await this.updateNotificationToken(token);
      
      messaging().onTokenRefresh(async (newToken) => {
        await this.updateNotificationToken(newToken);
      });
    } catch (error) {
      this.logger.error('Failed to register for push notifications:', error);
      throw error;
    }
  }

  private async updateNotificationToken(token: string): Promise<void> {
    try {
      // Update local storage
      await AsyncStorage.setItem('pushToken', token);
      
      // Update server
      await this.apiService.updateNotificationToken(token);
      
      // Update observable
      this.notificationToken$.next(token);
      
      // Log analytics
      await this.analyticsService.logEvent('notification_token_updated', { token });
    } catch (error) {
      this.logger.error('Failed to update notification token:', error);
      throw error;
    }
  }

  private async registerNotificationHandlers(): Promise<void> {
    // Foreground handler
    messaging().onMessage(async (remoteMessage) => {
      await this.handleForegroundNotification(remoteMessage);
    });

    // Background handler
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      await this.handleBackgroundNotification(remoteMessage);
    });

    // Notification open handler
    messaging().onNotificationOpenedApp(async (remoteMessage) => {
      await this.handleNotificationOpen(remoteMessage);
    });

    // Initial notification check
    messaging()
      .getInitialNotification()
      .then(async (remoteMessage) => {
        if (remoteMessage) {
          await this.handleInitialNotification(remoteMessage);
        }
      });
  }

  private async handleForegroundNotification(remoteMessage: any): Promise<void> {
    try {
      // Validate notification
      if (!await this.validateNotification(remoteMessage)) {
        return;
      }

      // Process notification based on type
      await this.processNotification(remoteMessage, 'foreground');

      // Show local notification
      await this.showLocalNotification(remoteMessage);

      // Track analytics
      await this.analyticsService.logEvent('notification_received', {
        type: remoteMessage.data.type,
        state: 'foreground',
      });
    } catch (error) {
      this.logger.error('Foreground notification handling failed:', error);
    }
  }

  private async handleBackgroundNotification(remoteMessage: any): Promise<void> {
    try {
      // Validate notification
      if (!await this.validateNotification(remoteMessage)) {
        return;
      }

      // Process notification based on type
      await this.processNotification(remoteMessage, 'background');

      // Track analytics
      await this.analyticsService.logEvent('notification_received', {
        type: remoteMessage.data.type,
        state: 'background',
      });
    } catch (error) {
      this.logger.error('Background notification handling failed:', error);
    }
  }

  private async handleNotificationOpen(remoteMessage: any): Promise<void> {
    try {
      // Validate and decrypt notification data
      const decryptedData = await this.securityService.decryptNotificationData(
        remoteMessage.data
      );

      // Process notification action
      await this.processNotificationAction(decryptedData);

      // Track analytics
      await this.analyticsService.logEvent('notification_opened', {
        type: decryptedData.type,
        source: decryptedData.source,
      });
    } catch (error) {
      this.logger.error('Notification open handling failed:', error);
    }
  }

  private async validateNotification(notification: any): Promise<boolean> {
    try {
      // Verify notification signature
      const isValid = await this.securityService.verifyNotificationSignature(
        notification
      );

      if (!isValid) {
        this.logger.warn('Invalid notification signature detected');
        return false;
      }

      // Check notification timestamp
      const isTimely = this.isNotificationTimely(notification.timestamp);
      if (!isTimely) {
        this.logger.warn('Outdated notification detected');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Notification validation failed:', error);
      return false;
    }
  }

  private async processNotification(notification: any, state: 'foreground' | 'background'): Promise<void> {
    const { type, data } = notification;

    switch (type) {
      case 'STREAM_START':
        await this.handleStreamNotification(data);
        break;
      case 'COLLABORATION_REQUEST':
        await this.handleCollaborationNotification(data);
        break;
      case 'ACHIEVEMENT':
        await this.handleAchievementNotification(data);
        break;
      case 'SYSTEM_ALERT':
        await this.handleSystemAlert(data);
        break;
      default:
        this.logger.warn('Unknown notification type:', type);
    }
  }

  private async showLocalNotification(remoteMessage: any): Promise<void> {
    const { title, body, data } = remoteMessage.notification;

    if (Platform.OS === 'ios') {
      PushNotificationIOS.addNotificationRequest({
        id: String(Date.now()),
        title,
        body,
        userInfo: data,
      });
    } else {
      PushNotification.localNotification({
        channelId: this.NOTIFICATION_CHANNEL_ID,
        title,
        message: body,
        userInfo: data,
        priority: 'high',
        vibrate: true,
        playSound: true,
      });
    }
  }

  private isNotificationTimely(timestamp: number): boolean {
    const MAX_NOTIFICATION_AGE = 5 * 60 * 1000; // 5 minutes
    return Date.now() - timestamp < MAX_NOTIFICATION_AGE;
  }

  public async updateNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      // Update local storage
      await AsyncStorage.setItem(
        this.NOTIFICATION_STORAGE_KEY,
        JSON.stringify(settings)
      );

      // Update server
      await this.apiService.updateNotificationSettings(settings);

      // Track analytics
      await this.analyticsService.logEvent('notification_settings_updated', settings);
    } catch (error) {
      this.logger.error('Failed to update notification settings:', error);
      throw error;
    }
  }

  private async restoreNotificationSettings(): Promise<void> {
    try {
      const settings = await AsyncStorage.getItem(this.NOTIFICATION_STORAGE_KEY);
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        await this.applyNotificationSettings(parsedSettings);
      }
    } catch (error) {
      this.logger.error('Failed to restore notification settings:', error);
    }
  }

  private async applyNotificationSettings(settings: NotificationSettings): Promise<void> {
    if (Platform.OS === 'ios') {
      // Apply iOS specific settings
      PushNotificationIOS.setNotificationCategories([
        {
          id: 'streaming',
          actions: [
            { id: 'view', title: 'View', options: { foreground: true } },
            { id: 'dismiss', title: 'Dismiss', options: { destructive: true } },
          ],
        },
      ]);
    } else {
      // Apply Android specific settings
      PushNotification.createChannel(
        {
          channelId: this.NOTIFICATION_CHANNEL_ID,
          channelName: 'Space Hub Notifications',
          channelDescription: 'Space Hub streaming and collaboration notifications',
          playSound: settings.sound,
          soundName: settings.soundName || 'default',
          importance: settings.priority ? Importance.HIGH : Importance.DEFAULT,
          vibrate: settings.vibration,
        },
        (created) => this.logger.info(`Notification channel updated: ${created}`)
      );
    }
  }

  public cleanup(): void {
    this.notificationPermission$.complete();
    this.notificationToken$.complete();
  }
}

interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  soundName?: string;
  vibration: boolean;
  priority: boolean;
  categories: {
    streaming: boolean;
    collaboration: boolean;
    achievements: boolean;
    system: boolean;
  };
}
