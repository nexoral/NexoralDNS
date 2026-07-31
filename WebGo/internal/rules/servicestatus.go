package rules

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/v2/bson"

	"nexoraldns/webgo/internal/cache"
	"nexoraldns/webgo/internal/config"
	"nexoraldns/webgo/internal/database"
	"nexoraldns/webgo/internal/dnsio"
	"nexoraldns/webgo/shared/keys"
	"nexoraldns/webgo/shared/logger"
)

// ErrServiceConfigMissing signals the service document could not be read, which
// the pipeline treats as "database offline" and bypasses access controls for.
var ErrServiceConfigMissing = errors.New("service config missing — database offline")

// ServiceStatusResult carries whether DNS processing may continue, plus the
// service configuration document it was decided from.
type ServiceStatusResult struct {
	Active bool
	Config map[string]any
}

// ServiceStatusChecker gates the whole query pipeline on the service being
// switched on, reading from Redis first and MongoDB second.
type ServiceStatusChecker struct {
	cache       *cache.Service
	collections *database.CollectionManager
}

func NewServiceStatusChecker(cacheService *cache.Service, collections *database.CollectionManager) *ServiceStatusChecker {
	return &ServiceStatusChecker{cache: cacheService, collections: collections}
}

// Check reports whether the service is active. When it is not, the caller's
// query is answered with 0.0.0.0 before returning.
func (s *ServiceStatusChecker) Check(
	ctx context.Context,
	queryName string,
	io dnsio.Handler,
	msg []byte,
	rinfo dnsio.RemoteInfo,
) (ServiceStatusResult, error) {
	var cached map[string]any
	if s.cache.Get(ctx, keys.ServiceStatus, &cached) && cached != nil {
		if status, _ := cached["Service_Status"].(string); status != "active" {
			logger.Error("Service is inactive (from cache). DNS query processing is halted.")
			io.BuildSendAnswer(msg, rinfo, queryName, "0.0.0.0", 10)
			return ServiceStatusResult{Active: false, Config: cached}, nil
		}
		return ServiceStatusResult{Active: true, Config: cached}, nil
	}

	collection := s.collections.Collection(config.CollectionService)
	if collection == nil {
		logger.Error("Service collection not found in the database.")
		return ServiceStatusResult{}, ErrServiceConfigMissing
	}

	var serviceConfig map[string]any
	err := collection.FindOne(ctx, bson.M{"SERVICE_NAME": config.ServiceName}).Decode(&serviceConfig)
	if err != nil || serviceConfig == nil {
		logger.Error("Service configuration not found in the database.")
		return ServiceStatusResult{}, ErrServiceConfigMissing
	}

	s.cache.Set(ctx, keys.ServiceStatus, serviceConfig, 60)

	if status, _ := serviceConfig["Service_Status"].(string); status != "active" {
		logger.Error("Service is inactive. DNS query processing is halted.")
		io.BuildSendAnswer(msg, rinfo, queryName, "0.0.0.0", DefaultTTL(serviceConfig))
		return ServiceStatusResult{Active: false, Config: serviceConfig}, nil
	}

	return ServiceStatusResult{Active: true, Config: serviceConfig}, nil
}

// DefaultTTL reads DefaultTTL off the service document, defaulting to 0.
//
// The value arrives as an int from MongoDB but as a float64 after a JSON
// round-trip through Redis, so every numeric shape is accepted.
func DefaultTTL(serviceConfig map[string]any) uint32 {
	if serviceConfig == nil {
		return 0
	}
	switch v := serviceConfig["DefaultTTL"].(type) {
	case float64:
		if v > 0 {
			return uint32(v)
		}
	case int32:
		if v > 0 {
			return uint32(v)
		}
	case int64:
		if v > 0 {
			return uint32(v)
		}
	case int:
		if v > 0 {
			return uint32(v)
		}
	}
	return 0
}
