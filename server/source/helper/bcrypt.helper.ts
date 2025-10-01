import { genSalt } from "bcryptjs";
import { hash } from "bcryptjs";

export default class Bcrypt {
  private saltRounds: number;
  constructor() {
    this.saltRounds = 10;
  }

  /**
   * Encrypts a string using bcrypt.
   * 
   * @param data - The string to be encrypted
   * @returns A Promise that resolves to the hashed string
   * @throws {Error} If the encryption process fails
   */
  public async Encrypt(data: string): Promise<string> {
    const salt = await genSalt(this.saltRounds);
    const hashedData = await hash(data, salt);
    return hashedData;
  }

  /**
   * Compares a plain text string with a hashed string to check if they match.
   * @param data - The plain text string to compare.
   * @param hashedData - The hashed string to compare against.
   * @returns A Promise that resolves to a boolean indicating whether the plain text matches the hash.
   */
  public async Compare(data: string, hashedData: string): Promise<boolean> {
    const isMatch = await hash(data, hashedData);
    return isMatch === hashedData;
  }
}