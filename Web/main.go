// Command web is the NexoralDNS core DNS server.
//
// It answers DNS over UDP:53, TCP:53 and TLS:853 for a local area network,
// resolving from Redis, then MongoDB, then public upstream servers.
//
// This is a LAN-only service. It is not safe to expose on a public network:
// ISPs block the DNS behaviour it depends on, and an open resolver is an
// amplification vector.
package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"nexoraldns/web/internal/app"
	"nexoraldns/web/internal/netutil"
	"nexoraldns/web/shared/logger"
)

// shutdownTimeout bounds how long draining connections may take.
const shutdownTimeout = 10 * time.Second

func main() {
	logger.Info(fmt.Sprintf("Starting DNS server with %d UDP listeners on %d CPUs...",
		netutil.ListenerCount(), runtime.NumCPU()))

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	application, err := app.New()
	if err != nil {
		logger.Error("Failed to initialise the DNS server:", err)
		os.Exit(1)
	}

	if err := application.Start(ctx); err != nil {
		logger.Error("Failed to start the DNS server:", err)
		os.Exit(1)
	}

	<-ctx.Done()
	stop() // restore default signal handling so a second Ctrl-C kills immediately
	logger.Info("Shutting down...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	application.Shutdown(shutdownCtx)

	logger.Info("Shutdown complete")
}
