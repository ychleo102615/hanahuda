import type { IntegrationEvent } from './IntegrationEvent'

/**
 * Event Logger
 *
 * Provides structured logging for integration events.
 * Useful for debugging event flow between Bounded Contexts.
 */
export class EventLogger {
  private static instance: EventLogger | null = null
  private readonly logHistory: LogEntry[] = []
  private readonly maxHistorySize: number

  private constructor(maxHistorySize: number = 1000) {
    this.maxHistorySize = maxHistorySize
  }

  static getInstance(maxHistorySize?: number): EventLogger {
    if (!EventLogger.instance) {
      EventLogger.instance = new EventLogger(maxHistorySize)
    }
    return EventLogger.instance
  }

  /**
   * Log an event publication
   */
  logPublished(event: IntegrationEvent, publisherId: string): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      action: 'published',
      publisherId,
      event: this.serializeEvent(event)
    }

    this.addLogEntry(entry)

    if (this.shouldLogToConsole()) {
      console.log(`📤 [${publisherId}] Published: ${event.eventType} (seq: ${event.sequenceNumber})`)
    }
  }

  /**
   * Log an event reception
   */
  logReceived(event: IntegrationEvent, subscriberId: string): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      action: 'received',
      subscriberId,
      event: this.serializeEvent(event)
    }

    this.addLogEntry(entry)

    if (this.shouldLogToConsole()) {
      console.log(`📥 [${subscriberId}] Received: ${event.eventType} (seq: ${event.sequenceNumber})`)
    }
  }

  /**
   * Log an event processing completion
   */
  logProcessed(event: IntegrationEvent, subscriberId: string, processingTimeMs: number): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      action: 'processed',
      subscriberId,
      processingTimeMs,
      event: this.serializeEvent(event)
    }

    this.addLogEntry(entry)

    if (this.shouldLogToConsole()) {
      console.log(`✅ [${subscriberId}] Processed: ${event.eventType} (${processingTimeMs}ms)`)
    }
  }

  /**
   * Log an event processing error
   */
  logError(event: IntegrationEvent, subscriberId: string, error: Error): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      action: 'error',
      subscriberId,
      error: error.message,
      event: this.serializeEvent(event)
    }

    this.addLogEntry(entry)

    console.error(`❌ [${subscriberId}] Error processing ${event.eventType}:`, error.message)
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(limit: number = 100): readonly LogEntry[] {
    return this.logHistory.slice(-limit)
  }

  /**
   * Clear log history
   */
  clearLogs(): void {
    this.logHistory.length = 0
  }

  /**
   * Get event flow statistics
   */
  getStatistics(): EventStatistics {
    const totalEvents = this.logHistory.length
    const publishedEvents = this.logHistory.filter(entry => entry.action === 'published').length
    const processedEvents = this.logHistory.filter(entry => entry.action === 'processed').length
    const errorEvents = this.logHistory.filter(entry => entry.action === 'error').length

    const processingTimes = this.logHistory
      .filter(entry => entry.action === 'processed' && entry.processingTimeMs)
      .map(entry => entry.processingTimeMs!)

    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0

    return {
      totalEvents,
      publishedEvents,
      processedEvents,
      errorEvents,
      avgProcessingTimeMs: Math.round(avgProcessingTime * 100) / 100,
      successRate: processedEvents > 0 ? (processedEvents / (processedEvents + errorEvents)) : 0
    }
  }

  private addLogEntry(entry: LogEntry): void {
    this.logHistory.push(entry)

    // Maintain max history size
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.splice(0, this.logHistory.length - this.maxHistorySize)
    }
  }

  private serializeEvent(event: IntegrationEvent): SerializedEvent {
    return {
      id: event.eventId,
      type: event.eventType,
      sequence: event.sequenceNumber,
      timestamp: event.timestamp
    }
  }

  private shouldLogToConsole(): boolean {
    // Only log to console in development
    return import.meta.env?.MODE === 'development' || import.meta.env?.DEV === true
  }
}

// Types
interface LogEntry {
  readonly timestamp: number
  readonly action: 'published' | 'received' | 'processed' | 'error'
  readonly publisherId?: string
  readonly subscriberId?: string
  readonly processingTimeMs?: number
  readonly error?: string
  readonly event: SerializedEvent
}

interface SerializedEvent {
  readonly id: string
  readonly type: string
  readonly sequence: number
  readonly timestamp: number
}

interface EventStatistics {
  readonly totalEvents: number
  readonly publishedEvents: number
  readonly processedEvents: number
  readonly errorEvents: number
  readonly avgProcessingTimeMs: number
  readonly successRate: number
}
