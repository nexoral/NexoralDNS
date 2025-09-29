import { readFile } from "fs/promises";
import { AuthorInfo } from "../../core/key";
// Interfaces
type PackageInterface = {
  name: string;
  version: number;
  author: string;
  license: string;
};


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
}