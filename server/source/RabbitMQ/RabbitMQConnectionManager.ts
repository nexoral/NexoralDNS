import logger from '../utilities/logger';
/* eslint-disable @typescript-eslint/no-explicit-any */
import amqp, { Channel } from 'amqplib';

export class RabbitMQConnectionManager {
  private connection: any = null;
  private channel: Channel | null = null;
  private isConnecting = false;
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
      logger.error('❌ Failed to connect to RabbitMQ:', error);
      await this.handleReconnection();
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    this.connection.on('error', async (err: any) => {
      logger.error('❌ RabbitMQ connection error:', err);
      await this.handleReconnection();
    });

    this.connection.on('close', async () => {
      logger.warn('🔴 RabbitMQ connection closed');
      this.connection = null;
      this.channel = null;
      await this.handleReconnection();
    });
  }

  private async handleReconnection(): Promise<void> {
    this.reconnectAttempts++;
    if (this.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
      logger.error(`❌ Max reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached`);
      return;
    }

    logger.warn(`⏳ Reconnecting to RabbitMQ in ${this.RECONNECT_DELAY / 1000}s (attempt ${this.reconnectAttempts + 1})`);

    await new Promise(resolve => setTimeout(resolve, this.RECONNECT_DELAY));

    try {
      await this.connect();
    } catch (error) {
      logger.error('❌ Reconnection failed:', error);
    }
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
      logger.error('❌ Error closing RabbitMQ connection:', error);
    }
  }

  getChannel(): Channel | null {
    return this.channel;
  }
}
