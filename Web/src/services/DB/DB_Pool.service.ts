import container from '../../container/appContainer';
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { DB_DEFAULT_CONFIGS } from "../../Config/key";

type DNSRecordsCollection = ReturnType<MongoCollectionManager['getCollection']>;

interface DnsRecord {
  name: string;
  type: string;
  value: string;
  ttl?: number;
}

export class DomainDBPoolService {
  // Caches individual hops (not the final chain, which Rules.service.ts already
  // caches in Redis) so a hop shared across chains isn't re-fetched from Mongo.
  private static readonly hopCache = new Map<string, { record: DnsRecord; expiresAt: number }>();
  private static readonly HOP_CACHE_TTL_MS = 3000;

  constructor() { }

  public async getDnsRecordByDomainName(domainName: string, maxDepth: number = 10) {
    let currentName = domainName;
    let depth = 0;
    const visited = new Set<string>();

    // Fetch collection fresh on each call for reconnection resilience
    const DNSRecordsCollection = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);

    while (depth < maxDepth) {
      if (visited.has(currentName)) {
        throw new Error(`Circular CNAME reference detected for ${domainName}`);
      }
      visited.add(currentName);

      const record = await this.lookupHop(DNSRecordsCollection, currentName);

      if (!record) {
        return null;
      }

      if (record.type === 'A' || record.type === 'AAAA') {
        return { ...record, name: domainName };
      }

      if (record.type === 'CNAME') {
        currentName = record.value;
        depth++;
        continue;
      }

      return { ...record, name: domainName };
    }

    throw new Error(`Maximum CNAME depth exceeded for ${domainName}`);
  }

  private async lookupHop(collection: DNSRecordsCollection, name: string): Promise<DnsRecord | null> {
    const cached = DomainDBPoolService.hopCache.get(name);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.record;
    }

    const record = await collection?.findOne({ name }) as DnsRecord | null | undefined;
    if (record) {
      DomainDBPoolService.hopCache.set(name, { record, expiresAt: Date.now() + DomainDBPoolService.HOP_CACHE_TTL_MS });
    }
    return record ?? null;
  }
}