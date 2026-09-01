/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt, { SignOptions } from "jsonwebtoken";

type str = string;
type Expiry = SignOptions["expiresIn"];

type Record<T> = { [key: string]: T };

const todayDate = `${new Date().getDate()}-${new Date().getMonth()}-${new Date().getFullYear()} ${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`;

const NumFunction = (length: number = 1, WithZero: boolean = true): number => {
  const NumbersArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  const FilteredArray = WithZero === false ? NumbersArray.filter((num) => num !== 0) : NumbersArray;
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * FilteredArray.length);
    result += `${FilteredArray[randomIndex]}`;
  }
  return Number(result);
};

const MixedFunction = (length: number = 1, isCAPITAL: boolean = false): string => {
  const Mixed = [
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "0",
    "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "_", "=", "+",
    "[", "]", "{", "}", "|", ";", ":", "'", ",", ".", "/", "?", "~", "`",
  ];
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * Mixed.length);
    const char = Mixed[randomIndex];
    result += isCAPITAL ? char.toUpperCase() : char;
  }
  return result;
};

const BooleanFunction = (): boolean => {
  const ArrayOFboolean = [true, false];
  const randomIndex = Math.floor(Math.random() * ArrayOFboolean.length);
  return ArrayOFboolean[randomIndex];
};

const cipherList = ((): string[] => {
  let NumberCiphers = NumFunction(2, false);
  const cipherListResult: string[] = [];
  do {
    cipherListResult.push(MixedFunction(NumFunction(2, false), BooleanFunction()));
    NumberCiphers--;
  } while (NumberCiphers !== 0);
  return cipherListResult;
})();

class Jwt {
  private signatureKey: string;
  private cipherList: string[];

  constructor(signatureKey?: string) {
    this.signatureKey = signatureKey ?? "secret";
    this.cipherList = cipherList;
  }

  generate(Payload: unknown, expiry: Expiry = "1h"): Record<unknown> {
    try {
      if (!Payload) {
        return {
          status: "Empty",
          message: "Payload is required",
          algoRithm: "HS256 (Default)",
          currentTimeStamp: todayDate,
        };
      }

      const signedData = this.generateToken(Payload, this.signatureKey, expiry);
      if (signedData == null) {
        return {
          status: "error",
          message: "Something went wrong when generating the token",
          algoRithm: "HS256 (Default)",
          currentTimeStamp: todayDate,
        };
      }

      return {
        status: "Success",
        message: "Token generated successfully",
        toKen: signedData,
        algoRithm: "HS256 (Default)",
        expiry,
        currentTimeStamp: todayDate,
      };
    } catch {
      return {
        status: "error",
        message: "Error generating token",
        currentTimeStamp: todayDate,
        algoRithm: "HS256 (Default)",
      };
    }
  }

  generateLoginToken(Payload: unknown, Rounds: number = 5, expiry: Expiry = "1h"): Record<unknown> {
    try {
      let data = Payload;
      let times = Rounds;
      do {
        const result = this.generate(data, expiry);
        data = result.toKen;
        times--;
      } while (times > 0);

      return {
        status: true,
        message: "Token generated successfully",
        toKen: data,
        algoRithm: "HS256 (Default)",
        expiry,
        currentTimeStamp: todayDate,
      };
    } catch {
      return {
        status: false,
        message: "Error generating login token",
        currentTimeStamp: todayDate,
        algoRithm: "HS256 (Default)",
      };
    }
  }

  destroy(token: string): Record<unknown> {
    try {
      const positions = [5, 3, 9, 4, 7];
      let tokenArray = token.split("");
      this.cipherList.forEach((cipher, index) => {
        tokenArray.splice(positions[index], 0, cipher);
      });
      tokenArray = tokenArray.reverse();
      const modifiedToken = tokenArray.join("");

      return {
        status: "Successfully destroyed",
        message: "Token destroyed successfully",
        token: modifiedToken,
        currentTimeStamp: todayDate,
        algoRithm: "HS256 (Default)",
      };
    } catch {
      return {
        status: "error",
        message: "Error destroying token",
        currentTimeStamp: todayDate,
        algoRithm: "HS256 (Default)",
      };
    }
  }

  decode(token: string): Record<any> {
    try {
      if (!token) {
        return {
          status: "empty",
          message: "Token is required",
          currentTimeStamp: todayDate,
          algoRithm: "HS256 (Default)",
        };
      }

      const cipherResult = this.verifyCipher(token);
      if (cipherResult.status === "Already Destroyed") {
        return cipherResult;
      }

      const resultData = jwt.verify(token, this.signatureKey);
      return {
        status: "Success",
        message: "Token decoded successfully",
        data: resultData,
        currentTimeStamp: todayDate,
        algoRithm: "HS256 (Default)",
      };
    } catch {
      return {
        status: "Invalid",
        message: "Invalid Token Provided, token might have been tampered, not match the signature key or expired",
        currentTimeStamp: todayDate,
        algoRithm: "HS256 (Default)",
      };
    }
  }

  setCipherList(newCipherList: string[]): void {
    if (!newCipherList) {
      throw new Error("Cipher list is required to update the cipher list");
    }
    if (!Array.isArray(newCipherList)) {
      throw new Error("Cipher list should be an array");
    }
    this.cipherList = newCipherList;
  }

  setSignatureKey(signatureKey: string): void {
    if (!signatureKey) {
      throw new Error("Signature key is required to update the signature key");
    }
    if (typeof signatureKey !== "string") {
      throw new Error("Signature key should be a string");
    }
    this.signatureKey = signatureKey;
  }

  private generateToken(Payload: unknown, signatureKey: string, expiry: Expiry): string | null {
    try {
      return jwt.sign({ data: Payload }, signatureKey, { expiresIn: expiry });
    } catch {
      return null;
    }
  }

  private verifyCipher(token: string): Record<unknown> {
    try {
      let cipherResult = false;
      this.cipherList.forEach((cipher) => {
        cipherResult = token.includes(cipher);
      });

      if (!cipherResult) {
        return {
          status: "Not Destroyed",
          message: "Token is not Destroyed Manually",
          currentTimeStamp: todayDate,
          algoRithm: "HS256 (Default)",
        };
      }
      return {
        status: "Already Destroyed",
        message: "Token is Destroyed Manually with the destroy() method",
        currentTimeStamp: todayDate,
        algoRithm: "HS256 (Default)",
      };
    } catch {
      return {
        status: "error",
        message: "Error verifying token",
        currentTimeStamp: todayDate,
        algoRithm: "HS256 (Default)",
      };
    }
  }
}

export default Jwt;