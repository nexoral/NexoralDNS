package cache

import (
	"context"
	"time"

	sharedredis "nexoraldns/web/shared/redis"
)

// Service is the single cache entry point for the DNS path, composing the
// connection, key/value store, pub/sub and ACL collaborators.
type Service struct {
	conn   *sharedredis.ConnectionManager
	store  *sharedredis.CacheStore
	pubSub *sharedredis.PubSub
	acl    *ACLService
}

func NewService(
	conn *sharedredis.ConnectionManager,
	store *sharedredis.CacheStore,
	pubSub *sharedredis.PubSub,
	acl *ACLService,
) *Service {
	return &Service{conn: conn, store: store, pubSub: pubSub, acl: acl}
}

func (s *Service) Set(ctx context.Context, key string, value any, ttl uint32) {
	s.store.Set(ctx, key, value, ttl)
}

func (s *Service) Get(ctx context.Context, key string, dest any) bool {
	return s.store.Get(ctx, key, dest)
}

func (s *Service) Delete(ctx context.Context, key string) bool { return s.store.Delete(ctx, key) }
func (s *Service) Exists(ctx context.Context, key string) bool { return s.store.Exists(ctx, key) }

func (s *Service) Invalidate(ctx context.Context, pattern string) int {
	return s.store.Invalidate(ctx, pattern)
}

func (s *Service) TTL(ctx context.Context, key string) time.Duration { return s.store.TTL(ctx, key) }

func (s *Service) Expire(ctx context.Context, key string, seconds int) bool {
	return s.store.Expire(ctx, key, seconds)
}

func (s *Service) FlushAll(ctx context.Context)                { s.store.FlushAll(ctx) }
func (s *Service) Stats(ctx context.Context) map[string]string { return s.store.Stats(ctx) }

func (s *Service) Subscribe(ctx context.Context, channel string, callback func(string)) error {
	return s.pubSub.Subscribe(ctx, channel, callback)
}

func (s *Service) Publish(ctx context.Context, channel, message string) int64 {
	return s.pubSub.Publish(ctx, channel, message)
}

func (s *Service) BlockedDomainsForIP(ctx context.Context, ip string) []string {
	return s.acl.BlockedDomainsForIP(ctx, ip)
}

func (s *Service) GloballyBlockedDomains(ctx context.Context) []string {
	return s.acl.GloballyBlockedDomains(ctx)
}

func (s *Service) ACLMetadata(ctx context.Context) map[string]any { return s.acl.Metadata(ctx) }

func (s *Service) IsDomainBlocked(ctx context.Context, ip, domain string) (bool, error) {
	return s.acl.IsDomainBlocked(ctx, ip, domain)
}

func (s *Service) Close() error {
	_ = s.pubSub.Close()
	return s.conn.Close()
}
