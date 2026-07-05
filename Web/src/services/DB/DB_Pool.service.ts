// Service to manage database connections and collections
import container from '../../container/appContainer';
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { DB_DEFAULT_CONFIGS } from "../../Config/key";


// Service to handle domain-related database operations
export class DomainDBPoolService {
  constructor() { }

  // get domain matched with the name
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

      // Try exact match first
      const record = await DNSRecordsCollection?.findOne({ name: currentName });

      if (!record) {
        return null; // Domain not found
      }

      if (record.type === 'A') {
        record.name = domainName;
        return record;
      }

      if (record.type === 'CNAME') {
        currentName = record.value;
        depth++;
        continue;
      }

      return record;
    }

    throw new Error(`Maximum CNAME depth exceeded for ${domainName}`);
  }
}