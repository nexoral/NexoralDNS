/* eslint-disable @typescript-eslint/no-explicit-any */
import CryptoJS from "crypto-js";

type str = string;

export async function Encrypt(Data: str, Key: str): Promise<str> {
  if (!Key) {
    throw new Error("Missing key");
  }

  const encryptedData = CryptoJS.AES.encrypt(Data, Key).toString();

  return encryptedData;
}

export function EncryptSync(Data: str, Key: str): str {
  if (!Key) {
    throw new Error("Missing key");
  }

  const encryptedData = CryptoJS.AES.encrypt(Data, Key).toString();

  return encryptedData;
}

export async function Decrypt(Data: str, Key: str): Promise<str> {
  if (!Key) {
    throw new Error("Missing key");
  }

  const bytes = CryptoJS.AES.decrypt(Data, Key);
  const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

  return decryptedText ?? "";
}

export function DecryptSync(Data: str, Key: str): str {
  if (!Key) {
    throw new Error("Missing key");
  }

  const bytes = CryptoJS.AES.decrypt(Data, Key);
  const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

  return decryptedText ?? "";
}