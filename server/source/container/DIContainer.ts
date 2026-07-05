/* eslint-disable @typescript-eslint/no-explicit-any */

export class DIContainer {
  private singletons: Map<string, any> = new Map();
  private factories: Map<string, ((...args: any[]) => any) | (() => any)> = new Map();

  register(key: string, factory: ((...args: any[]) => any) | (() => any), singleton: boolean = false): void {
    if (singleton) {
      this.singletons.set(key, null);
    }
    this.factories.set(key, factory);
  }

  get<T = any>(key: string, ...args: any[]): T {
    // Check if singleton already exists
    if (this.singletons.has(key)) {
      // Singletons are shared across all callers, so per-call arguments would be
      // silently ignored after first creation - reject them to prevent subtle bugs
      if (args.length > 0) {
        throw new Error(`Service '${key}' is a singleton - per-call arguments are not supported. Pass request data to the service's methods instead.`);
      }
      let instance = this.singletons.get(key);
      if (!instance) {
        const factory = this.factories.get(key);
        if (!factory) {
          throw new Error(`Service '${key}' not registered in DI container`);
        }
        instance = factory();
        this.singletons.set(key, instance);
      }
      return instance;
    }

    // Non-singleton - create new instance
    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(`Service '${key}' not registered in DI container`);
    }
    return factory(...args);
  }

  has(key: string): boolean {
    return this.factories.has(key);
  }

  clear(): void {
    this.singletons.clear();
    this.factories.clear();
  }
}
