// Service to manage database connections and collections
import { DB_DEFAULT_CONFIGS } from "../../Config/key";
import { getCollectionClient } from "../../Database/mongodb.db";


// Service to handle domain-related database operations
export class DomainDBPoolService {
  private DNSRecordsCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);

  constructor() {}

  // get domain matched with the name
  public async getDnsRecordByDomainName(domainName: string, maxDepth: number = 10) {
    let currentName = domainName;
    console.log(currentName)
    let depth = 0;
    const visited = new Set<string>();

    while (depth < maxDepth) {
      if (visited.has(currentName)) {
        throw new Error(`Circular CNAME reference detected for ${domainName}`);
      }
      visited.add(currentName);

      // Try exact match first
      const record = await this.DNSRecordsCollection?.aggregate([
        { $match: { name: currentName } },
      ]).toArray().then(results => results[0]);
      
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