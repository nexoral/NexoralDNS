import { AxioDB } from "axiodb";
import Database from "axiodb/lib/Services/Database/database.operation";
import Collection from "axiodb/lib/Services/Collection/collection.operation";

const NewNexoralDB = new AxioDB();

// DB Instances
const DB_Instances: { [key: string]: Database | null } = {
  DNS_DB: null,
};

// Collections
const Collection_Instances: { [key: string]: Collection | null } = {
  DNS_Record_Collection: null,
  
};


/**
 * Function to configure and initialize databases and collections
 * @returns {Promise<void>}
 */
const databaseConfigs = async (): Promise<void> => {

  // Creator a new instance of the AxioDB
  DB_Instances.DNS_DB = await NewNexoralDB.createDB("DNS");
  Collection_Instances.DNS_Record_Collection = await DB_Instances.DNS_DB.createCollection("Records");
};


// Namespace export
export { DB_Instances, Collection_Instances, NewNexoralDB };

// Default export
export default databaseConfigs;