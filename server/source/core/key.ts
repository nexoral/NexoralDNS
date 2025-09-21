/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path";

export enum ServerKeys {
  PORT = 4773,
  HOST = "0.0.0.0",
  LOCALHOST = "127.0.0.1",
  DEFAULT_KEY_EXPIRE = "24h",
  DEFAULT_KEY_ISSUER = "Nexoral Server",
  DEFAULT_KEY_AUDIENCE = "Nexoral Client",
  DEFAULT_KEY_REASON = "For Transacting with Nexoral Server",
  DEFAULT_KEY_TIMESTAMP = Date.now(),
  DEFAULT_KEY_ROUNDS = 1,
}

// Config for CORS
export const CORS_CONFIG = {
  ORIGIN: "*",
  METHODS: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  ALLOWED_HEADERS: ["Content-Type", "Authorization"],
  EXPOSED_HEADERS: ["Content-Length", "X-Requested-With"],
  MAX_AGE: 86400, // 24 hours in seconds
  ALLOW_CREDENTIALS: true,
};

type AuthorInfoType = {
  name: string;
  Designation: string;
  Country: string;
  Email: string;
  LinkedIn: string;
  github: string;
};

export const AuthorInfo: AuthorInfoType = {
  name: "Ankan Saha",
  Designation: "Software Engineer",
  Country: "India",
  Email: "ankansahaofficial@gmail.com",
  LinkedIn: "https://www.linkedin.com/in/theankansaha/",
  github: "https://github.com/AnkanSaha",
};