/* eslint-disable @typescript-eslint/no-explicit-any */
import amqp, { Channel, ConsumeMessage } from 'amqplib';
import { Console } from 'outers';

/**
 * RabbitMQ Service with Producer and Consumer
 *
 * Provides high-performance message queue for asynchronous task processing
 * Supports both publishing (producer) and consuming (consumer) patterns
 */
class RabbitMQService {
  private static instance: RabbitMQService;
  private connection: any = null;
  private channel: Channel | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly RECONNECT_DELAY = 5000; // 5 seconds

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): RabbitMQService {
    if (!RabbitMQService.instance) {
      RabbitMQService.instance = new RabbitMQService();
    }
    return RabbitMQService.instance;
  }

  /**
   * Initialize RabbitMQ connection
   */
  public async connect(): Promise<Channel> {
    // Return existing channel if available
    if (this.channel && this.connection) {
      return this.channel;
    }

    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      await this.waitForConnection();
      return this.channel!;
    }

    this.isConnecting = true;

    try {
      const rabbitURL = process.env.RABBITMQ_URI || 'amqp://localhost:5672';

      Console.bright('📡 Connecting to RabbitMQ...');
      Console.bright(`   URL: ${rabbitURL}`);

      // Create connection
      const connection = await amqp.connect(rabbitURL);
      this.connection = connection;
      Console.green('✅ Connected to RabbitMQ successfully!');

      // Create channel
      this.channel = await connection.createChannel();
      Console.green('✅ RabbitMQ channel created!');

      // Setup event handlers
      this.setupEventHandlers();

      this.reconnectAttempts = 0;
      return this.channel;

    } catch (error) {
      Console.red('❌ Failed to connect to RabbitMQ:', error);
      await this.handleReconnection();
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Setup RabbitMQ event handlers
   */
  private setupEventHandlers(): void {
    if (!this.connection) return;

    this.connection.on('error', async (err: any) => {
      Console.red('❌ RabbitMQ connection error:', err);
      this.reconnectAttempts++;
      await this.handleReconnection();
    });

    this.connection.on('close', async () => {
      Console.yellow('🔴 RabbitMQ connection closed');
      this.connection = null;
      this.channel = null;
      await this.handleReconnection();
    });
  }

  /**
   * Handle reconnection logic
   */
  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      Console.red(`❌ Max reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached`);
      return;
    }

    Console.yellow(`⏳ Reconnecting to RabbitMQ in ${this.RECONNECT_DELAY / 1000}s (attempt ${this.reconnectAttempts + 1})`);

    await new Promise(resolve => setTimeout(resolve, this.RECONNECT_DELAY));

    try {
      await this.connect();
    } catch (error) {
      Console.red('❌ Reconnection failed:', error);
    }
  }

  /**
   * Wait for ongoing connection attempt
   */
  private async waitForConnection(): Promise<void> {
    const maxWait = 30000; // 30 seconds
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

  // ============================================
  // PRODUCER METHODS (Publishing Messages)
  // ============================================

  /**
   * Publish a single message to a queue
   *
   * @param queue - Queue name
   * @param message - Message data (will be JSON stringified)
   * @param options - Publishing options (persistent, priority, etc.)
   * @returns True if message was sent successfully
   *
   * @example
   * await RabbitMQ.publish('dns-analytics', {
   *   queryName: 'example.com',
   *   timestamp: Date.now()
   * });
   */
  public async publish(
    queue: string,
    message: any,
    options?: {
      persistent?: boolean;
      priority?: number;
      expiration?: string;
    }
  ): Promise<boolean> {
    try {
      if (!this.channel) await this.connect();

      // Ensure queue exists (create if not)
      await this.channel!.assertQueue(queue, {
        durable: true, // Queue survives RabbitMQ restart
        arguments: {
          'x-max-priority': 10, // Enable priority support
        },
      });

      // Serialize message
      const messageBuffer = Buffer.from(JSON.stringify(message));

      // Publish message
      const sent = this.channel!.sendToQueue(queue, messageBuffer, {
        persistent: options?.persistent ?? true, // Message survives broker restart
        priority: options?.priority ?? 5, // Default priority
        expiration: options?.expiration, // Message TTL (e.g., '60000' = 60 seconds)
      });

      if (sent) {
        Console.bright(`📤 Published message to queue: ${queue}`);
      } else {
        Console.yellow(`⚠️  Queue ${queue} is full, message buffered`);
      }

      return sent;

    } catch (error) {
      Console.red(`❌ Failed to publish to queue ${queue}:`, error);
      return false;
    }
  }

  /**
   * Publish multiple messages in batch
   *
   * @param queue - Queue name
   * @param messages - Array of messages
   * @returns Number of successfully published messages
   *
   * @example
   * await RabbitMQ.publishBatch('dns-analytics', [
   *   { queryName: 'example.com', timestamp: Date.now() },
   *   { queryName: 'google.com', timestamp: Date.now() }
   * ]);
   */
  public async publishBatch(queue: string, messages: any[]): Promise<number> {
    let successCount = 0;

    try {
      if (!this.channel) await this.connect();

      // Ensure queue exists
      await this.channel!.assertQueue(queue, { durable: true });

      // Publish all messages
      for (const message of messages) {
        const messageBuffer = Buffer.from(JSON.stringify(message));
        const sent = this.channel!.sendToQueue(queue, messageBuffer, { persistent: true });
        if (sent) successCount++;
      }

      Console.bright(`📤 Published ${successCount}/${messages.length} messages to queue: ${queue}`);

    } catch (error) {
      Console.red(`❌ Failed to publish batch to queue ${queue}:`, error);
    }

    return successCount;
  }

  // ============================================
  // CONSUMER METHODS (Reading Messages)
  // ============================================

  /**
   * Consume messages from a queue (one at a time)
   *
   * @param queue - Queue name
   * @param callback - Function to process each message
   * @param options - Consumer options
   *
   * @example
   * await RabbitMQ.consume('dns-analytics', async (message) => {
   *   console.log('Processing:', message);
   *   await saveToDatabase(message);
   *   return true; // Acknowledge message
   * });
   */
  public async consume(
    queue: string,
    callback: (message: any) => Promise<boolean>,
    options?: {
      prefetch?: number; // Number of messages to fetch at once (default: 1)
      noAck?: boolean;   // Auto-acknowledge messages (default: false)
    }
  ): Promise<void> {
    try {
      if (!this.channel) await this.connect();

      // Ensure queue exists
      await this.channel!.assertQueue(queue, { durable: true });

      // Set prefetch count (Quality of Service)
      await this.channel!.prefetch(options?.prefetch ?? 1);

      Console.green(`🔵 Started consuming from queue: ${queue}`);

      // Start consuming
      await this.channel!.consume(
        queue,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            // Parse message
            const messageData = JSON.parse(msg.content.toString());

            // Process message
            const success = await callback(messageData);

            // Acknowledge or reject message
            if (success) {
              this.channel!.ack(msg); // Remove from queue
              Console.bright(`✅ Message processed and acknowledged from queue: ${queue}`);
            } else {
              this.channel!.nack(msg, false, true); // Requeue message
              Console.yellow(`⚠️  Message processing failed, requeued: ${queue}`);
            }

          } catch (error) {
            Console.red(`❌ Error processing message from queue ${queue}:`, error);
            // Reject and requeue on error
            this.channel!.nack(msg, false, true);
          }
        },
        {
          noAck: options?.noAck ?? false, // Manual acknowledgment
        }
      );

    } catch (error) {
      Console.red(`❌ Failed to start consumer for queue ${queue}:`, error);
      throw error;
    }
  }

  /**
   * Consume messages in batches
   *
   * @param queue - Queue name
   * @param batchCallback - Function to process a batch of messages
   * @param options - Batch consumer options
   *
   * @example
   * await RabbitMQ.consumeBatch('dns-analytics', async (messages) => {
   *   console.log(`Processing batch of ${messages.length} messages`);
   *   await saveBatchToDatabase(messages);
   *   return true; // Acknowledge all messages
   * }, { batchSize: 100, batchTimeout: 60000 });
   */
  public async consumeBatch(
    queue: string,
    batchCallback: (messages: any[]) => Promise<boolean>,
    options?: {
      batchSize?: number;    // Max messages per batch (default: 100)
      batchTimeout?: number; // Max wait time in ms (default: 60000 = 1 min)
    }
  ): Promise<void> {
    const batchSize = options?.batchSize ?? 100;
    const batchTimeout = options?.batchTimeout ?? 60000; // 1 minute

    let messageBatch: { msg: ConsumeMessage; data: any }[] = [];
    let batchTimer: NodeJS.Timeout | null = null;

    const processBatch = async () => {
      if (messageBatch.length === 0) return;

      const currentBatch = [...messageBatch];
      messageBatch = []; // Clear batch

      try {
        Console.bright(`📦 Processing batch of ${currentBatch.length} messages from queue: ${queue}`);

        // Extract message data
        const messages = currentBatch.map((item) => item.data);

        // Process batch
        const success = await batchCallback(messages);

        // Acknowledge or reject all messages
        if (success) {
          currentBatch.forEach((item) => this.channel!.ack(item.msg));
          Console.green(`✅ Batch of ${currentBatch.length} messages processed successfully`);
        } else {
          currentBatch.forEach((item) => this.channel!.nack(item.msg, false, true));
          Console.yellow(`⚠️  Batch processing failed, messages requeued`);
        }

      } catch (error) {
        Console.red(`❌ Error processing batch from queue ${queue}:`, error);
        // Requeue all messages on error
        currentBatch.forEach((item) => this.channel!.nack(item.msg, false, true));
      }
    };

    try {
      if (!this.channel) await this.connect();

      // Ensure queue exists
      await this.channel!.assertQueue(queue, { durable: true });

      // Set prefetch to batch size
      await this.channel!.prefetch(batchSize);

      Console.green(`🔵 Started batch consumer for queue: ${queue} (batch size: ${batchSize})`);

      // Start consuming
      await this.channel!.consume(
        queue,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            // Parse and add to batch
            const messageData = JSON.parse(msg.content.toString());
            messageBatch.push({ msg, data: messageData });

            // Reset timer
            if (batchTimer) clearTimeout(batchTimer);

            // Process batch if size reached
            if (messageBatch.length >= batchSize) {
              await processBatch();
            } else {
              // Set timeout for partial batch
              batchTimer = setTimeout(async () => {
                await processBatch();
              }, batchTimeout);
            }

          } catch (error) {
            Console.red(`❌ Error adding message to batch from queue ${queue}:`, error);
            this.channel!.nack(msg, false, true);
          }
        },
        {
          noAck: false, // Manual acknowledgment
        }
      );

    } catch (error) {
      Console.red(`❌ Failed to start batch consumer for queue ${queue}:`, error);
      throw error;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get queue message count
   */
  public async getQueueMessageCount(queue: string): Promise<number> {
    try {
      if (!this.channel) await this.connect();
      const queueInfo = await this.channel!.assertQueue(queue, { durable: true });
      return queueInfo.messageCount;
    } catch (error) {
      Console.red(`❌ Failed to get message count for queue ${queue}:`, error);
      return -1;
    }
  }

  /**
   * Purge all messages from a queue
   */
  public async purgeQueue(queue: string): Promise<boolean> {
    try {
      if (!this.channel) await this.connect();
      await this.channel!.purgeQueue(queue);
      Console.green(`✅ Purged all messages from queue: ${queue}`);
      return true;
    } catch (error) {
      Console.red(`❌ Failed to purge queue ${queue}:`, error);
      return false;
    }
  }

  /**
   * Delete a queue
   */
  public async deleteQueue(queue: string): Promise<boolean> {
    try {
      if (!this.channel) await this.connect();
      await this.channel!.deleteQueue(queue);
      Console.green(`✅ Deleted queue: ${queue}`);
      return true;
    } catch (error) {
      Console.red(`❌ Failed to delete queue ${queue}:`, error);
      return false;
    }
  }

  /**
   * Close RabbitMQ connection
   */
  public async close(): Promise<void> {
    try {
      Console.bright('🔌 Closing RabbitMQ connection...');

      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      Console.green('✅ RabbitMQ connection closed');
    } catch (error) {
      Console.red('❌ Error closing RabbitMQ connection:', error);
    }
  }
}

// Export singleton instance
export default RabbitMQService.getInstance();

// Graceful shutdown
process.on('SIGINT', async () => {
  await RabbitMQService.getInstance().close();
});

process.on('SIGTERM', async () => {
  await RabbitMQService.getInstance().close();
});
