// Package netutil covers host address discovery, DNS listener socket creation
// and the scanner that rebinds the server when the host's IP changes.
package netutil

import (
	"net"
	"strings"
)

// Interface preference for LocalIP.
const (
	PreferWiFi = "wifi"
	PreferLAN  = "lan"
	PreferAny  = "any"
)

// LocalIP returns this host's LAN address, preferring a wireless or wired
// interface when asked. Falls back to the first non-loopback IPv4 address, and
// to 127.0.0.1 if the host has none.
func LocalIP(preferred string) string {
	byInterface, order := ipv4Addresses()
	return pickIP(byInterface, order, preferred)
}

// pickIP applies the interface preference to an already-gathered address set.
// Split out from LocalIP so the selection rules can be exercised against a fixed
// set of interfaces rather than whatever the host happens to have.
func pickIP(byInterface map[string][]string, order []string, preferred string) string {
	switch preferred {
	case PreferWiFi:
		if ip := firstMatching(byInterface, order, "wlan", "wi-fi"); ip != "" {
			return ip
		}
	case PreferLAN:
		if ip := firstMatching(byInterface, order, "eth", "enp"); ip != "" {
			return ip
		}
	}

	for _, name := range order {
		if addrs := byInterface[name]; len(addrs) > 0 {
			return addrs[0]
		}
	}

	return "127.0.0.1"
}

// ipv4Addresses groups non-loopback IPv4 addresses by interface, preserving the
// kernel's interface ordering so the fallback choice is stable across calls.
func ipv4Addresses() (map[string][]string, []string) {
	byInterface := map[string][]string{}
	var order []string

	interfaces, err := net.Interfaces()
	if err != nil {
		return byInterface, order
	}

	for _, iface := range interfaces {
		if iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok || ipNet.IP.To4() == nil || ipNet.IP.IsLoopback() {
				continue
			}
			if _, seen := byInterface[iface.Name]; !seen {
				order = append(order, iface.Name)
			}
			byInterface[iface.Name] = append(byInterface[iface.Name], ipNet.IP.String())
		}
	}

	return byInterface, order
}

func firstMatching(byInterface map[string][]string, order []string, patterns ...string) string {
	for _, name := range order {
		lower := strings.ToLower(name)
		for _, pattern := range patterns {
			if strings.Contains(lower, pattern) && len(byInterface[name]) > 0 {
				return byInterface[name][0]
			}
		}
	}
	return ""
}

// CurrentIP reports the first non-loopback IPv4 address, or 0.0.0.0 if the host
// has none. Used by the scanner to detect address changes.
func CurrentIP() string {
	byInterface, order := ipv4Addresses()
	for _, name := range order {
		if addrs := byInterface[name]; len(addrs) > 0 {
			return addrs[0]
		}
	}
	return "0.0.0.0"
}
