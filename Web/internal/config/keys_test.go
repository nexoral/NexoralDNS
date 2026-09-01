package config

import (
	"os"
	"testing"
)

// ── DBName ──────────────────────────────────────────────────────────────────

func TestDBName_Default(t *testing.T) {
	os.Unsetenv("MONGO_DB_NAME")
	if got := DBName(); got != "nexoral_db" {
		t.Errorf("DBName() = %q, want %q", got, "nexoral_db")
	}
}

func TestDBName_FromEnv(t *testing.T) {
	os.Setenv("MONGO_DB_NAME", "custom_db")
	defer os.Unsetenv("MONGO_DB_NAME")

	if got := DBName(); got != "custom_db" {
		t.Errorf("DBName() = %q, want %q", got, "custom_db")
	}
}

func TestDBName_EmptyEnv(t *testing.T) {
	os.Setenv("MONGO_DB_NAME", "")
	defer os.Unsetenv("MONGO_DB_NAME")

	if got := DBName(); got != "nexoral_db" {
		t.Errorf("DBName() = %q, want %q", got, "nexoral_db")
	}
}

// ── MongoHost ───────────────────────────────────────────────────────────────

func TestMongoHost_Default(t *testing.T) {
	os.Unsetenv("MONGO_URI")
	if got := MongoHost(); got != "mongodb://localhost:27017" {
		t.Errorf("MongoHost() = %q, want %q", got, "mongodb://localhost:27017")
	}
}

func TestMongoHost_FromEnv(t *testing.T) {
	os.Setenv("MONGO_URI", "mongodb://remote:27017")
	defer os.Unsetenv("MONGO_URI")

	if got := MongoHost(); got != "mongodb://remote:27017" {
		t.Errorf("MongoHost() = %q, want %q", got, "mongodb://remote:27017")
	}
}

func TestMongoHost_EmptyEnv(t *testing.T) {
	os.Setenv("MONGO_URI", "")
	defer os.Unsetenv("MONGO_URI")

	if got := MongoHost(); got != "mongodb://localhost:27017" {
		t.Errorf("MongoHost() = %q, want %q", got, "mongodb://localhost:27017")
	}
}

// ── ServiceAPIKey / CloudURL ────────────────────────────────────────────────

func TestServiceAPIKey_Default(t *testing.T) {
	os.Unsetenv("SERVICE_API_KEY")
	if got := ServiceAPIKey(); got != "" {
		t.Errorf("ServiceAPIKey() = %q, want empty", got)
	}
}

func TestServiceAPIKey_FromEnv(t *testing.T) {
	os.Setenv("SERVICE_API_KEY", "my-key")
	defer os.Unsetenv("SERVICE_API_KEY")

	if got := ServiceAPIKey(); got != "my-key" {
		t.Errorf("ServiceAPIKey() = %q, want %q", got, "my-key")
	}
}

func TestCloudURL_Default(t *testing.T) {
	os.Unsetenv("CLOUD_URL")
	if got := CloudURL(); got != "" {
		t.Errorf("CloudURL() = %q, want empty", got)
	}
}

func TestCloudURL_FromEnv(t *testing.T) {
	os.Setenv("CLOUD_URL", "https://cloud.nexoral.in")
	defer os.Unsetenv("CLOUD_URL")

	if got := CloudURL(); got != "https://cloud.nexoral.in" {
		t.Errorf("CloudURL() = %q, want %q", got, "https://cloud.nexoral.in")
	}
}

// ── Constants ───────────────────────────────────────────────────────────────

func TestAllCollections_NotEmpty(t *testing.T) {
	if len(AllCollections) == 0 {
		t.Error("AllCollections is empty")
	}
}

func TestAllCollections_ContainsExpected(t *testing.T) {
	expected := map[string]bool{
		CollectionUsers:       true,
		CollectionRoles:       true,
		CollectionPermissions: true,
		CollectionService:     true,
		CollectionDomains:     true,
		CollectionDNSRecords:  true,
		CollectionLogs:        true,
		CollectionRules:       true,
		CollectionAnalytics:   true,
	}
	for _, name := range AllCollections {
		delete(expected, name)
	}
	if len(expected) > 0 {
		t.Errorf("AllCollections missing: %v", expected)
	}
}

func TestDefaultPermissionTypes_NotEmpty(t *testing.T) {
	if len(DefaultPermissionTypes) == 0 {
		t.Error("DefaultPermissionTypes is empty")
	}
}

func TestDefaultRoles_NotEmpty(t *testing.T) {
	if len(DefaultRoles) == 0 {
		t.Error("DefaultRoles is empty")
	}
}

func TestDefaultRoles_SuperAdminHasFullAccess(t *testing.T) {
	var superAdmin *Role
	for i := range DefaultRoles {
		if DefaultRoles[i].Role == "Super Admin" {
			superAdmin = &DefaultRoles[i]
			break
		}
	}
	if superAdmin == nil {
		t.Fatal("Super Admin role not found")
	}
	if superAdmin.Code != 1 {
		t.Errorf("Super Admin code = %d, want 1", superAdmin.Code)
	}
	if len(superAdmin.Permissions) == 0 {
		t.Error("Super Admin has no permissions")
	}
}

func TestServiceName(t *testing.T) {
	if ServiceName != "NexoralDNS" {
		t.Errorf("ServiceName = %q, want %q", ServiceName, "NexoralDNS")
	}
}

func TestBrokerPort(t *testing.T) {
	if BrokerPort != 56300 {
		t.Errorf("BrokerPort = %d, want 56300", BrokerPort)
	}
}
