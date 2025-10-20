export default class RequestControllerHelper {
  private inFlightRequests: Map<string, Promise<void>> = new Map();
  constructor() { }

  public addRequest(key: string, promise: Promise<void>): void {
    this.inFlightRequests.set(key, promise);
  }

  public removeRequest(key: string): void {
    this.inFlightRequests.delete(key);
  }

  public getRequest(key: string): Promise<void> | undefined {
    return this.inFlightRequests.get(key);
  }

  public hasRequest(key: string): boolean {
    return this.inFlightRequests.has(key);
  }

  /**
   * Execute a request with deduplication logic
   * If the same request is already in progress, waits for it to complete
   * Otherwise, executes the request and tracks it
   * @param requestKey - Unique identifier for the request
   * @param executor - Async function to execute
   * @param onDuplicate - Optional callback when duplicate is detected
   * @param onCleanup - Optional callback after request completes
   */
  public async executeWithDeduplication<T = void>(
    requestKey: string,
    executor: () => Promise<T>,
    onDuplicate?: (key: string) => void,
    onCleanup?: (key: string) => void
  ): Promise<T | undefined> {
    // Check if this request is already being processed
    if (this.inFlightRequests.has(requestKey)) {
      if (onDuplicate) {
        onDuplicate(requestKey);
      }
      // Wait for the in-flight request to complete
      await this.inFlightRequests.get(requestKey);
      return undefined;
    }

    // Create the promise for this request
    const requestPromise = (async () => {
      try {
        await executor();
      } finally {
        // Remove from in-flight requests after completion
        this.inFlightRequests.delete(requestKey);
        if (onCleanup) {
          onCleanup(requestKey);
        }
      }
    })();

    // Store the promise
    this.inFlightRequests.set(requestKey, requestPromise);

    // Wait for completion
    await requestPromise;

    return undefined;
  }
}