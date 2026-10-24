/**
 * BistApp Social Publisher Engine - Publisher Queue
 * Internal memory queue with retry mechanism and rate-limiting protection.
 */

export interface QueueItem {
  id: string;
  task: () => Promise<boolean>;
  retries: number;
  maxRetries: number;
  channel: string;
}

export class PublisherQueue {
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private delayMs: number;

  constructor(delayMs: number = 2000) {
    this.delayMs = delayMs;
  }

  /**
   * Adds a task to the publishing queue
   */
  public enqueue(channel: string, task: () => Promise<boolean>, maxRetries: number = 3): void {
    const item: QueueItem = {
      id: Math.random().toString(36).substring(2, 9),
      task,
      retries: 0,
      maxRetries,
      channel,
    };

    this.queue.push(item);
    console.log(`📥 [PublisherQueue] Görev kuyruğa eklendi [Kanal: ${channel}]. Kuyruk boyutu: ${this.queue.length}`);

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Processes queue sequentially with delay between items and retry logic
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift();

    if (!item) {
      this.isProcessing = false;
      return;
    }

    try {
      const success = await item.task();
      if (!success) {
        throw new Error('Task returned false status');
      }
      console.log(`✅ [PublisherQueue] Görev başarıyla tamamlandı [Kanal: ${item.channel}]`);
    } catch (error) {
      item.retries++;
      if (item.retries <= item.maxRetries) {
        console.warn(`⚠️ [PublisherQueue] Görev başarısız oldu, yeniden deneniyor (${item.retries}/${item.maxRetries}) [Kanal: ${item.channel}]`);
        // Put back at the front of the queue for retry after backoff
        this.queue.unshift(item);
      } else {
        console.error(`❌ [PublisherQueue] Görev maksimum deneme hakkını aştı ve iptal edildi [Kanal: ${item.channel}]`);
      }
    }

    // Rate-limiting pause before next queue item
    setTimeout(() => {
      this.processQueue();
    }, this.delayMs);
  }

  public getQueueLength(): number {
    return this.queue.length;
  }
}

// Export singleton instance
export const globalPublisherQueue = new PublisherQueue(2000);
