/* eslint-disable @typescript-eslint/no-explicit-any */


// Database Related Configs
type DBConfigType = {
  HOST: string;
  DB_NAME: string;
  Collections: {
    USERS: string;
    ROLES: string;
    PERMISSIONS: string;
    SERVICE: string;
  };
  DefaultValues: {
    DEFAULT_ADMIN_USERNAME: string;
    DEFAULT_ADMIN_PASSWORD: string;
    DEFAULT_ADMIN_ROLE: string;
    DEFAULT_ADMIN_ROLE_CODE: number;
    DEFAULT_ADMIN_PERMISSIONS_CODE: number;
    DEFAULT_PERMISSIONS_TYPE: { code: number; name: string }[];
    ServiceConfigs: {
      API_KEY?: string;
      CORE_URL?: string;
      Service_Status: "active" | "inactive";
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
    SERVICE: "service"
  },
  DefaultValues: {
    DEFAULT_ADMIN_USERNAME: "admin",
    DEFAULT_ADMIN_PASSWORD: "admin", // Change this after first login
    DEFAULT_ADMIN_ROLE: "Super Admin",
    DEFAULT_ADMIN_ROLE_CODE: 1,
    DEFAULT_ADMIN_PERMISSIONS_CODE: 3, // Full Access
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
      { code: 16, name: "Activate Service" }
    ],
    ServiceConfigs: {
      API_KEY: process.env.SERVICE_API_KEY || undefined,
      CORE_URL: process.env.CORE_SERVICE_URL || undefined,
      Service_Status: "active" // active, inactive
    }
  }
}