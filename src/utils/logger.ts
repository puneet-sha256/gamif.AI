/**
 * Singleton Logger Utility
 * 
 * Automatically extracts file name and function name from stack trace
 * to provide context for each log statement.
 * 
 * Usage:
 *   import { logger } from '../utils/logger'
 *   logger.info('Message here', optionalData)
 *   logger.error('Error occurred', errorObject)
 */

class Logger {
  private static instance: Logger

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  /**
   * Extract caller information from stack trace
   * Returns format: "fileName:functionName"
   */
  private getCallerInfo(): string {
    try {
      const stack = new Error().stack
      if (!stack) return 'unknown:unknown'

      const stackLines = stack.split('\n')
      // Stack depth:
      // 0: 'Error'
      // 1: 'at getCallerInfo'
      // 2: 'at Logger.info/debug/etc'
      // 3: 'at actualCallerFunction' <- This is what we want
      const callerLine = stackLines[3] || ''

      // Extract file name from path
      // Example formats:
      // "at functionName (C:\path\to\file.ts:line:col)"
      // "at C:\path\to\file.ts:line:col"
      const fileMatch = callerLine.match(/\((.+?):(\d+):(\d+)\)/) || 
                        callerLine.match(/at (.+?):(\d+):(\d+)/)
      
      let fileName = 'unknown'
      if (fileMatch && fileMatch[1]) {
        const filePath = fileMatch[1].trim()
        // Extract just the file name without path and extension
        const fileNameWithExt = filePath.split(/[/\\]/).pop() || 'unknown'
        fileName = fileNameWithExt.replace(/\.(ts|js|tsx|jsx)$/, '')
      }

      // Extract function name
      // Example: "at Object.functionName" or "at functionName"
      const funcMatch = callerLine.match(/at\s+(?:async\s+)?(?:\w+\.)?(\w+)/)
      const functionName = funcMatch ? funcMatch[1] : 'anonymous'

      return `${fileName}:${functionName}`
    } catch (error) {
      return 'unknown:unknown'
    }
  }

  /**
   * Log informational messages
   */
  public info(message: string, ...args: any[]): void {
    console.log(`[${this.getCallerInfo()}] ℹ️  ${message}`, ...args)
  }

  /**
   * Log debug messages (for development/troubleshooting)
   */
  public debug(message: string, ...args: any[]): void {
    console.log(`[${this.getCallerInfo()}] 🔍 ${message}`, ...args)
  }

  /**
   * Log warning messages
   */
  public warn(message: string, ...args: any[]): void {
    console.warn(`[${this.getCallerInfo()}] ⚠️  ${message}`, ...args)
  }

  /**
   * Log error messages
   */
  public error(message: string, ...args: any[]): void {
    console.error(`[${this.getCallerInfo()}] ❌ ${message}`, ...args)
  }

  /**
   * Log success messages
   */
  public success(message: string, ...args: any[]): void {
    console.log(`[${this.getCallerInfo()}] ✅ ${message}`, ...args)
  }

  /**
   * Log with custom emoji/prefix
   */
  public custom(emoji: string, message: string, ...args: any[]): void {
    console.log(`[${this.getCallerInfo()}] ${emoji} ${message}`, ...args)
  }
}

// Export singleton instance
export const logger = Logger.getInstance()
