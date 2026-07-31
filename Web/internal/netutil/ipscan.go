package netutil

import (
	"context"
	"fmt"
	"time"

	"nexoraldns/web/shared/logger"
)

// scanInterval is how often the host's address is re-checked.
const scanInterval = 10 * time.Second

// ScanIPChanges watches for a change to the host's IPv4 address and calls
// rebind with the new one. If rebind reports failure the previous address is
// forgotten, so the next tick retries instead of the service staying stranded
// on a dead socket.
//
// Runs until ctx is cancelled.
func ScanIPChanges(ctx context.Context, initialIP string, rebind func(newIP string) error) {
	previous := initialIP

	ticker := time.NewTicker(scanInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}

		current := CurrentIP()
		if current == previous {
			continue
		}

		logger.Info(fmt.Sprintf("IP Change Detected: %s -> %s", previous, current))
		logger.Info(fmt.Sprintf("Rebinding DNS server to new IP: %s", current))

		if err := rebind(current); err != nil {
			logger.Error(fmt.Sprintf("Failed to rebind DNS server to %s:", current), err)
			previous = "" // force a retry on the next tick
			continue
		}

		logger.Info(fmt.Sprintf("Rebound DNS server to new IP: %s", current))
		previous = current
	}
}
