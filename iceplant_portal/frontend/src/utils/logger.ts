import { createContext, useContext } from 'react';

// Log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

// Log entry interface
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: unknown;
  componentName?: string;
}

// Logger interface
export interface Logger {
  debug: (message: string, details?: unknown) => void;
  info: (message: string, details?: unknown) => void;
  warn: (message: string, details?: unknown) => void;
  error: (message: string, details?: unknown) => void;
  getRecentLogs: () => LogEntry[];
  clearLogs: () => void;
}

// Maximum number of logs to keep in memory
const MAX_LOGS = 1000;

class LoggerService implements Logger {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  private createLogEntry(level: LogLevel, message: string, details?: unknown): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
      componentName: this.getCurrentComponentName()
    };
  }

  private getCurrentComponentName(): string {
    // This is a simple implementation - you might want to enhance this
    const error = new Error();
    const stack = error.stack || '';
    const stackLines = stack.split('\n');
    // Try to find a line containing a React component name
    const componentLine = stackLines.find(line =>
      line.includes('Component') ||
      line.includes('Page') ||
      line.includes('Layout')
    );
    return componentLine ? componentLine.trim().split(' ')[1] : 'Unknown';
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }
    this.notifyListeners();

    // Also log to console for development
    if (process.env.NODE_ENV === 'development') {
      const consoleArgs = [
        `[${entry.level}] ${entry.message}`,
        entry.details || ''
      ];

      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(...consoleArgs);
          break;
        case LogLevel.INFO:
          console.info(...consoleArgs);
          break;
        case LogLevel.WARN:
          console.warn(...consoleArgs);
          break;
        case LogLevel.ERROR:
          console.error(...consoleArgs);
          break;
      }
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.logs));
  }

  public addListener(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public debug(message: string, details?: unknown): void {
    this.addLog(this.createLogEntry(LogLevel.DEBUG, message, details));
  }

  public info(message: string, details?: unknown): void {
    this.addLog(this.createLogEntry(LogLevel.INFO, message, details));
  }

  public warn(message: string, details?: unknown): void {
    this.addLog(this.createLogEntry(LogLevel.WARN, message, details));
  }

  public error(message: string, details?: unknown): void {
    this.addLog(this.createLogEntry(LogLevel.ERROR, message, details));
  }

  public getRecentLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    this.notifyListeners();
  }
}

// Create a singleton instance
export const loggerService = new LoggerService();

// React context for the logger
export const LoggerContext = createContext<Logger>(loggerService);

// Custom hook for using the logger
export const useLogger = () => useContext(LoggerContext); 