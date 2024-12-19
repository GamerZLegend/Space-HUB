import { Injectable, LoggerService } from '@nestjs/common'
import * as winston from 'winston'
import * as DailyRotateFile from 'winston-daily-rotate-file'

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logger: winston.Logger

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      defaultMeta: { service: 'space-hub' },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        
        // File transport for errors
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '14d'
        }),
        
        // File transport for combined logs
        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d'
        })
      ]
    })
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context })
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { 
      trace, 
      context,
      metadata: this.getMetadata()
    })
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context })
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context })
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context })
  }

  // Log performance metrics
  logPerformance(
    operation: string, 
    duration: number, 
    metadata?: Record<string, any>
  ) {
    this.logger.info('Performance Metric', {
      operation,
      duration,
      ...metadata
    })
  }

  // Log security events
  logSecurityEvent(
    type: 'login' | 'logout' | 'access_denied' | 'password_change',
    userId?: string,
    metadata?: Record<string, any>
  ) {
    this.logger.warn('Security Event', {
      type,
      userId,
      ...metadata
    })
  }

  // Capture and log unhandled exceptions
  captureException(error: Error, context?: string) {
    this.logger.error('Unhandled Exception', {
      message: error.message,
      stack: error.stack,
      context
    })
  }

  // Get additional metadata for logging
  private getMetadata(): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      pid: process.pid,
      environment: process.env.NODE_ENV || 'development'
    }
  }
}
