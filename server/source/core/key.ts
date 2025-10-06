/* eslint-disable @typescript-eslint/no-explicit-any */
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
  BROKER_PORT = 56300
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

// Database Related Configs
type DBConfigType = {
  HOST: string;
  DB_NAME: string;
  Collections: {
    USERS: string;
    ROLES: string;
    PERMISSIONS: string;
    SERVICE: string;
    DOMAINS: string;
    DNS_RECORDS: string;
    LOGS: string;
    RULES: string;
  };
  DefaultValues: {
    DEFAULT_ADMIN_USERNAME: string;
    DEFAULT_ADMIN_PASSWORD: string;
    DEFAULT_ADMIN_ROLE: string;
    DEFAULT_ADMIN_ROLE_CODE: number;
    DEFAULT_PERMISSIONS_TYPE: { code: number; name: string }[];
    DefaultRoles: { role: string; code: number; permissions: number[] }[];
    ServiceConfigs: {
      SERVICE_NAME: string;
      API_KEY?: string;
      CLOUD_URL?: string;
      Service_Status: "active" | "inactive";
      Connected_At: Date | null;
      Disconnected_At: Date | null;
      Current_WiFi_SSID: string | null;
      Current_Local_IP: string | null;
      Current_Subnet_Mask: string | null;
      Current_IP_Range: string | null;
      Next_Expected_Sync_At: Date | null;
      Last_Synced_At: Date | null;
      Total_Connected_Devices_To_Router: number;
      List_of_Connected_Devices_Info: any[];
    }
  };
};

export const DB_DEFAULT_CONFIGS: DBConfigType = {
  HOST: process.env.MONGO_URI || "mongodb://localhost:27017",
  DB_NAME: "nexoral_db",
  Collections: {
    USERS: "users",
    ROLES: "roles",
    PERMISSIONS: "permissions",
    SERVICE: "service",
    DOMAINS: "domains",
    DNS_RECORDS: "dns_records",
    LOGS: "logs",
    RULES: "rules"
  },
  DefaultValues: {
    DEFAULT_ADMIN_USERNAME: "admin",
    DEFAULT_ADMIN_PASSWORD: "admin", // Change this after first login
    DEFAULT_ADMIN_ROLE: "Super Admin",
    DEFAULT_ADMIN_ROLE_CODE: 1,
    DEFAULT_PERMISSIONS_TYPE: [
      { code: 1, name: "Add Domain" },
      { code: 2, name: "Remove Domain" },
      { code: 3, name: "View Logs" },
      { code: 4, name: "Full Access" },
      { code: 5, name: "Manage Users" },
      { code: 6, name: "Manage Roles" },
      { code: 7, name: "View Analytics" },
      { code: 8, name: "Configure Settings" },
      { code: 9, name: "Access API" },
      { code: 10, name: "Monitor Performance" },
      { code: 11, name: "Backup Data" },
      { code: 12, name: "Restore Data" },
      { code: 13, name: "Audit Changes" },
      { code: 14, name: "Manage Billing" },
      { code: 15, name: "Support Access" },
      { code: 16, name: "Activate Service" },
      { code: 17, name: "Deactivate Service" }
    ],
    DefaultRoles: [
      {
        role: "Super Admin",
        code: 1,
        permissions: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
      },
      {
        role: "Admin",
        code: 2,
        permissions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      },
      {
        role: "Moderator",
        code: 3,
        permissions: [1, 2, 3, 7, 8, 9]
      },
      {
        role: "User",
        code: 4,
        permissions: [1, 2, 3]
      },
      {
        role: "Guest",
        code: 5,
        permissions: [3]
      }
    ],
    // Service Related Configs
    ServiceConfigs: {
      SERVICE_NAME: "NexoralDNS",
      API_KEY: process.env.SERVICE_API_KEY || undefined,
      CLOUD_URL: process.env.CLOUD_URL || undefined,
      Service_Status: "active", // active, inactive
      Connected_At: null,
      Disconnected_At: null,
      Current_WiFi_SSID: null,
      Current_Local_IP: null,
      Current_Subnet_Mask: null,
      Current_IP_Range: null,
      Next_Expected_Sync_At: null,
      Last_Synced_At: null,
      Total_Connected_Devices_To_Router: 0,
      List_of_Connected_Devices_Info: []
    }
  }
}