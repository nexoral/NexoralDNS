import { readFile } from "fs/promises";
import { AuthorInfo } from "../../core/key";
import getLocalIPRange from "../../utilities/GetWLANIP.utls";
// Interfaces
type PackageInterface = {
  name: string;
  version: number;
  author: string;
  license: string;
};

// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";
// db connections
import { getCollectionClient } from "../../Database/mongodb.db";
import { ObjectId } from "mongodb";

/**
 * Service class providing information about the application.
 * 
 * This class is responsible for retrieving and providing metadata
 * about the NexoralDNS application from package.json.
 */
export default class InfoService {
  constructor() { }

  /**
 * Service to provide information about the application.
 * 
 * Retrieves package information from package.json and returns metadata about the application,
 * including the package name, version, author, license, and additional author details.
 * 
 * @returns {Promise<any>} A Promise that resolves to an object containing application metadata.
 * @property {string} Package_Name - The name of the package.
 * @property {string} NexoralDNS_Version - The version of NexoralDNS.
 * @property {string} Author_Name - The author of the package.
 * @property {string} License - The license of the package.
 * @property {any} AuthorDetails - Additional information about the author.
 */
  static async getInfo(): Promise<any> {
    const PackageFile: PackageInterface = JSON.parse(
      await readFile("./package.json", "utf-8"),
    );

    return {
      Package_Name: PackageFile.name,
      NexoralDNS_Version: PackageFile.version,
      Author_Name: PackageFile.author,
      License: PackageFile.license,
      AuthorDetails: AuthorInfo,
    };
  }

  /**
   * Retrieves basic runtime information for the DNS service.
   *
   * This asynchronous static method determines the local server IP (via getLocalIPRange("any"))
   * and obtains the current NexoralDNS version (via InfoService.getInfo()). It returns a plain
   * object describing the server IP, the DNS port and the server version.
   *
   * @async
   * @static
   * @returns Promise<object> A promise that resolves to an object with the following shape:
   * - serverIP: string | undefined — the selected local IP address (from getLocalIPRange().ip)
   * - DNS_Port: number — the DNS port (defaults to 53)
   * - serverVersion: string — the NexoralDNS version string from InfoService.getInfo()
   *
   * @throws If getLocalIPRange or InfoService.getInfo() rejects, the returned promise will reject
   *         with the underlying error.
   */
  static async getServiceInfo(): Promise<object> {
    const serverIP = getLocalIPRange("any");
    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SERVICE);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }
    const serviceData = await dbClient.findOne({ SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME });

    const finalObject = {
      serverIP: serverIP.ip,
      DNS_Port: 53,
      serviceStatus: serviceData?.Service_Status,
      serverVersion: (await InfoService.getInfo()).NexoralDNS_Version,
      WebInterface: {
        Host: serverIP.ip,
        Port: 4000
      }
    }

    return finalObject;
  }
}