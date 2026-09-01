package forwarder

import (
	"context"
	"testing"
	"time"

	"nexoraldns/web/internal/dnsio"
	"nexoraldns/web/shared/rabbitmq"
)

func stubRemoteInfo() dnsio.RemoteInfo {
	return dnsio.RemoteInfo{Address: "192.168.1.1", Family: "IPv4", Port: 12345}
}

func timeNow() time.Time { return time.Now() }

// ── mock RecordCache ────────────────────────────────────────────────────────

type mockRecordCache struct {
	setCalls []mockSetCall
}

type mockSetCall struct {
	key   string
	value any
	ttl   uint32
}

func (m *mockRecordCache) Set(_ context.Context, key string, value any, ttl uint32) {
	m.setCalls = append(m.setCalls, mockSetCall{key: key, value: value, ttl: ttl})
}

// ── mock AnalyticsPublisher ─────────────────────────────────────────────────

type mockAnalyticsPublisher struct{}

func (m *mockAnalyticsPublisher) Publish(_ context.Context, _ string, _ any, _ *rabbitmq.PublishOptions) bool {
	return true
}

// ── NewService ──────────────────────────────────────────────────────────────

func TestNewService_CreatesBreakers(t *testing.T) {
	svc, err := NewService(&mockRecordCache{}, &mockAnalyticsPublisher{})
	if err != nil {
		t.Fatalf("NewService failed: %v", err)
	}
	defer svc.Close()

	if len(svc.breakers) != len(upstreams) {
		t.Errorf("breakers = %d, want %d", len(svc.breakers), len(upstreams))
	}
	for _, server := range upstreams {
		if _, ok := svc.breakers[server.IP]; !ok {
			t.Errorf("missing breaker for %s", server.IP)
		}
	}
}

// ── Status / counters ───────────────────────────────────────────────────────

func TestStatus_InitialState(t *testing.T) {
	svc, err := NewService(&mockRecordCache{}, &mockAnalyticsPublisher{})
	if err != nil {
		t.Fatalf("NewService failed: %v", err)
	}
	defer svc.Close()

	status := svc.Status()
	if status.TotalAttempted != 0 {
		t.Errorf("TotalAttempted = %d, want 0", status.TotalAttempted)
	}
	if status.TotalSucceeded != 0 {
		t.Errorf("TotalSucceeded = %d, want 0", status.TotalSucceeded)
	}
	if status.SuccessRate != 0 {
		t.Errorf("SuccessRate = %f, want 0", status.SuccessRate)
	}
	if status.QueueDepth != 0 {
		t.Errorf("QueueDepth = %d, want 0", status.QueueDepth)
	}
	if len(status.Breakers) != len(upstreams) {
		t.Errorf("Breakers = %d, want %d", len(status.Breakers), len(upstreams))
	}
}

func TestQueueDepth_AlwaysZero(t *testing.T) {
	svc, err := NewService(&mockRecordCache{}, &mockAnalyticsPublisher{})
	if err != nil {
		t.Fatalf("NewService failed: %v", err)
	}
	defer svc.Close()

	if svc.QueueDepth() != 0 {
		t.Errorf("QueueDepth = %d, want 0", svc.QueueDepth())
	}
}

func TestConcurrencyLimit(t *testing.T) {
	svc, err := NewService(&mockRecordCache{}, &mockAnalyticsPublisher{})
	if err != nil {
		t.Fatalf("NewService failed: %v", err)
	}
	defer svc.Close()

	want := socketPoolSize * txidSpace
	if got := svc.ConcurrencyLimit(); got != want {
		t.Errorf("ConcurrencyLimit = %d, want %d", got, want)
	}
}

func TestTotalAttempted_InitiallyZero(t *testing.T) {
	svc, err := NewService(&mockRecordCache{}, &mockAnalyticsPublisher{})
	if err != nil {
		t.Fatalf("NewService failed: %v", err)
	}
	defer svc.Close()

	if svc.TotalAttempted() != 0 {
		t.Errorf("TotalAttempted = %d, want 0", svc.TotalAttempted())
	}
}

func TestTotalSucceeded_InitiallyZero(t *testing.T) {
	svc, err := NewService(&mockRecordCache{}, &mockAnalyticsPublisher{})
	if err != nil {
		t.Fatalf("NewService failed: %v", err)
	}
	defer svc.Close()

	if svc.TotalSucceeded() != 0 {
		t.Errorf("TotalSucceeded = %d, want 0", svc.TotalSucceeded())
	}
}

func TestActiveForwards_InitiallyZero(t *testing.T) {
	svc, err := NewService(&mockRecordCache{}, &mockAnalyticsPublisher{})
	if err != nil {
		t.Fatalf("NewService failed: %v", err)
	}
	defer svc.Close()

	if svc.ActiveForwards() != 0 {
		t.Errorf("ActiveForwards = %d, want 0", svc.ActiveForwards())
	}
}

// ── Status with attempted queries ───────────────────────────────────────────

func TestStatus_AfterAttemptedIncrement(t *testing.T) {
	svc, err := NewService(&mockRecordCache{}, &mockAnalyticsPublisher{})
	if err != nil {
		t.Fatalf("NewService failed: %v", err)
	}
	defer svc.Close()

	svc.attempted.Add(10)
	svc.succeeded.Add(7)

	status := svc.Status()
	if status.TotalAttempted != 10 {
		t.Errorf("TotalAttempted = %d, want 10", status.TotalAttempted)
	}
	if status.TotalSucceeded != 7 {
		t.Errorf("TotalSucceeded = %d, want 7", status.TotalSucceeded)
	}
	if status.SuccessRate < 69.9 || status.SuccessRate > 70.1 {
		t.Errorf("SuccessRate = %f, want ~70", status.SuccessRate)
	}
}

// ── BreakerStatus fields ────────────────────────────────────────────────────

func TestBreakerStatus_FieldsPopulated(t *testing.T) {
	svc, err := NewService(&mockRecordCache{}, &mockAnalyticsPublisher{})
	if err != nil {
		t.Fatalf("NewService failed: %v", err)
	}
	defer svc.Close()

	status := svc.Status()
	for _, bs := range status.Breakers {
		if bs.IP == "" {
			t.Error("BreakerStatus.IP is empty")
		}
		if bs.Name == "" {
			t.Error("BreakerStatus.Name is empty")
		}
		if bs.State == "" {
			t.Error("BreakerStatus.State is empty")
		}
	}
}

// ── Forward with nil/short msg ──────────────────────────────────────────────

func TestForward_NilMsg(t *testing.T) {
	svc, err := NewService(&mockRecordCache{}, &mockAnalyticsPublisher{})
	if err != nil {
		t.Fatalf("NewService failed: %v", err)
	}
	defer svc.Close()

	resp := svc.Forward(context.Background(), nil, "example.com", "A", nil, stubRemoteInfo(), timeNow(), false)
	if resp != nil {
		t.Errorf("Forward(nil msg) = %v, want nil", resp)
	}
}

func TestForward_ShortMsg(t *testing.T) {
	svc, err := NewService(&mockRecordCache{}, &mockAnalyticsPublisher{})
	if err != nil {
		t.Fatalf("NewService failed: %v", err)
	}
	defer svc.Close()

	resp := svc.Forward(context.Background(), []byte{0x00}, "example.com", "A", nil, stubRemoteInfo(), timeNow(), false)
	if resp != nil {
		t.Errorf("Forward(short msg) = %v, want nil", resp)
	}
}

// ── Close ───────────────────────────────────────────────────────────────────

func TestClose_Idempotent(t *testing.T) {
	svc, err := NewService(&mockRecordCache{}, &mockAnalyticsPublisher{})
	if err != nil {
		t.Fatalf("NewService failed: %v", err)
	}
	svc.Close()
	svc.Close() // should not panic
}
