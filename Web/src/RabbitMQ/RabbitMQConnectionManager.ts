/* eslint-disable @typescript-eslint/no-explicit-any */
import amqp, { Channel } from 'amqplib';
import logger from '../utilities/logger';

export class RabbitMQConnectionManager {
  private connection: any = null;
  private channel: Channel | null = null;
  private isConnecting = false;
  private reconnecting = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly RECONNECT_DELAY = 5000;

  async connect(): Promise<Channel> {
    if (this.channel && this.connection) {
      return this.channel;
    }

    if (this.isConnecting) {
      await this.waitForConnection();
      return this.channel!;
    }

    this.isConnecting = true;

    try {
      const rabbitURL = process.env.RABBITMQ_URI || 'amqp://localhost:5672';

      logger.info('📡 Connecting to RabbitMQ...');
      logger.info(`   URL: ${rabbitURL}`);

      const connection = await amqp.connect(rabbitURL);
      this.connection = connection;
      logger.info('✅ Connected to RabbitMQ successfully!');

      this.channel = await connection.createChannel();
      logger.info('✅ RabbitMQ channel created!');

      this.setupEventHandlers();

      this.reconnectAttempts = 0;
      return this.channel;

    } catch (error) {
      logger.error('❌ Failed to connect to RabbitMQ:', error as any);
      // Do NOT block the caller on reconnection — detach it to the background.
      this.scheduleReconnect();
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    this.connection.on('error', (err: any) => {
      logger.error('❌ RabbitMQ connection error:', err as any);
      this.scheduleReconnect();
    });

    this.connection.on('close', () => {
      logger.warn('🔴 RabbitMQ connection closed');
      this.connection = null;
      this.channel = null;
      this.scheduleReconnect();
    });
  }

  /**
   * Starts a single background reconnection loop (idempotent). Callers on the
   * request/response path are never blocked — only the very first connection is
   * awaited at startup. Subsequent reconnects run detached here.
   */
  private scheduleReconnect(): void {
    if (this.reconnecting) return; // one loop at a time
    this.reconnecting = true;
    void this.reconnectLoop();
  }

  private async reconnectLoop(): Promise<void> {
    while (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      logger.warn(`⏳ Reconnecting to RabbitMQ in ${this.RECONNECT_DELAY / 1000}s (attempt ${this.reconnectAttempts})`);
      await new Promise(resolve => setTimeout(resolve, this.RECONNECT_DELAY));

      try {
        await this.connect(); // resets reconnectAttempts to 0 on success
        this.reconnecting = false;
        return;
      } catch {
        // stay in the loop; scheduleReconnect() from connect() no-ops while reconnecting
      }
    }

    logger.error(`❌ Max reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached`);
    this.reconnecting = false;
  }

  private async waitForConnection(): Promise<void> {
    const maxWait = 30000;
    const checkInterval = 100;
    let waited = 0;

    while (this.isConnecting && waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    if (waited >= maxWait) {
      throw new Error('Timeout waiting for RabbitMQ connection');
    }
  }

  async close(): Promise<void> {
    try {
      logger.info('🔌 Closing RabbitMQ connection...');

      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      logger.info('✅ RabbitMQ connection closed');
    } catch (error) {
      logger.error('❌ Error closing RabbitMQ connection:', error as any);
    }
  }

  getChannel(): Channel | null {
    return this.channel;
  }
}
