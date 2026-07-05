/* eslint-disable @typescript-eslint/no-explicit-any */

export class DIContainer {
  private singletons: Map<string, any> = new Map();
  private factories: Map<string, () => any> = new Map();

  register(key: string, factory: () => any, singleton: boolean = false): void {
    if (singleton) {
      this.singletons.set(key, null);
    }
    this.factories.set(key, factory);
  }

  get<T = any>(key: string): T {
    // Check if singleton already exists
    if (this.singletons.has(key)) {
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
    return factory();
  }

  has(key: string): boolean {
    return this.factories.has(key);
  }

  clear(): void {
    this.singletons.clear();
    this.factories.clear();
  }
}
