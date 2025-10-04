
// Service to manage database connections and collections
import { DB_DEFAULT_CONFIGS } from "../Config/key";
import { getCollectionClient } from "../Database/mongodb.db";


// Service to handle domain-related database operations
export class DomainDBPoolService {
  private DNSRecordsCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);

  constructor() {}

  // get domain matched with the name
  public async getDnsRecordByDomainName(domainName: string) {
    const record = await this.DNSRecordsCollection?.aggregate([
      { $match: { name: domainName } },
    ]).toArray().then(results => results[0]); // Get the first result
    return record;
  }
}