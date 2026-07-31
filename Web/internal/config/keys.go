// Package config holds the database naming and default seed values for the
// service. Port of Web/src/Config/key.ts.
package config

import "os"

// BrokerPort is the port the message broker listens on.
const BrokerPort = 56300

// Collection names.
const (
	CollectionUsers       = "users"
	CollectionRoles       = "roles"
	CollectionPermissions = "permissions"
	CollectionService     = "service"
	CollectionDomains     = "domains"
	CollectionDNSRecords  = "dns_records"
	CollectionLogs        = "logs"
	CollectionRules       = "rules"
	CollectionAnalytics   = "analytics"
)

// AllCollections is the set touched at startup so any lazy setup runs once.
var AllCollections = []string{
	CollectionPermissions,
	CollectionRoles,
	CollectionUsers,
	CollectionService,
	CollectionDomains,
	CollectionDNSRecords,
	CollectionAnalytics,
	CollectionLogs,
	CollectionRules,
}

// ServiceName identifies this service's configuration document.
const ServiceName = "NexoralDNS"

// DBName is the database this service reads from.
func DBName() string {
	if v := os.Getenv("MONGO_DB_NAME"); v != "" {
		return v
	}
	return "nexoral_db"
}

// MongoHost is the connection string used by the shared connection manager.
func MongoHost() string {
	if v := os.Getenv("MONGO_URI"); v != "" {
		return v
	}
	return "mongodb://localhost:27017"
}

// Default admin seed values.
const (
	DefaultAdminUsername = "admin"
	DefaultAdminPassword = "admin" // Change this after first login
	DefaultAdminRole     = "Super Admin"
	DefaultAdminRoleCode = 1
)

type Permission struct {
	Code int    `bson:"code" json:"code"`
	Name string `bson:"name" json:"name"`
}

type Role struct {
	Role        string `bson:"role" json:"role"`
	Code        int    `bson:"code" json:"code"`
	Permissions []int  `bson:"permissions" json:"permissions"`
}

var DefaultPermissionTypes = []Permission{
	{1, "Add Domain"}, {2, "Remove Domain"}, {3, "View Logs"}, {4, "Full Access"},
	{5, "Manage Users"}, {6, "Manage Roles"}, {7, "View Analytics"}, {8, "Configure Settings"},
	{9, "Access API"}, {10, "Monitor Performance"}, {11, "Backup Data"}, {12, "Restore Data"},
	{13, "Audit Changes"}, {14, "Manage Billing"}, {15, "Support Access"},
	{16, "Activate Service"}, {17, "Deactivate Service"},
}

var DefaultRoles = []Role{
	{"Super Admin", 1, []int{3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17}},
	{"Admin", 2, []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}},
	{"Moderator", 3, []int{1, 2, 3, 7, 8, 9}},
	{"User", 4, []int{1, 2, 3}},
	{"Guest", 5, []int{3}},
}

// ServiceAPIKey and CloudURL are optional and empty when unset.
func ServiceAPIKey() string { return os.Getenv("SERVICE_API_KEY") }
func CloudURL() string      { return os.Getenv("CLOUD_URL") }
