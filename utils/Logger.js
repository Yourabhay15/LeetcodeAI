import chalk from "chalk";

class Logger {
  static logs = [];
  static listeners = [];

  static subscribe(listener) {
    this.listeners.push(listener);
  }

  static unsubscribe(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  static getLogs() {
    return this.logs;
  }

  static logMessage(type, message, obj = null) {
    const timestamp = new Date().toISOString();
    let log = `[${timestamp}]\t${message}`;

    if (type === 'error' && obj instanceof Error) {
      log += `\nStack Trace: ${obj.stack}`;
    } else if (obj) {
      log += ` ${JSON.stringify(obj)}`;
    }

    // Buffer logs
    const logItem = { type, log, timestamp };
    this.logs.push(logItem);
    if (this.logs.length > 300) this.logs.shift();

    // Broadcast
    for (const listener of this.listeners) {
      try {
        listener(logItem);
      } catch (_) {}
    }

    switch (type) {
      case 'success':
        console.log(chalk.green(log));
        break;
      case 'error':
        console.error(chalk.red(log));
        break;
      case 'warn':
        console.warn(chalk.yellow(log));
        break;
      case 'info':
        console.log(chalk.cyan(log));
        break;
      default:
        console.log(log);
    }
  }

  static success(message, obj = null) {
    this.logMessage('success', message, obj);
  }

  static error(message, obj = null) {
    this.logMessage('error', message, obj);
  }

  static warn(message, obj = null) {
    this.logMessage('warn', message, obj);
  }

  static info(message, obj = null) {
    this.logMessage('info', message, obj);
  }
}

export default Logger;
