package server

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"os"
	"path/filepath"
	"time"

	"nexoraldns/webgo/shared/logger"
)

// certValidity is how long a generated certificate stays valid.
const certValidity = 730 * 24 * time.Hour

func certDir() string {
	if dir := os.Getenv("DOT_CERT_DIR"); dir != "" {
		return dir
	}
	return "/etc/nexoral/cert"
}

func certPaths() (certFile, keyFile string) {
	dir := certDir()
	return filepath.Join(dir, "server.crt"), filepath.Join(dir, "server.key")
}

// LoadOrGenerateCerts returns the DoT certificate, generating and persisting a
// self-signed one on first run so the service is zero-config on a LAN.
//
// DoT clients must trust this certificate or skip verification, which is the
// normal expectation for private LAN DNS. Set DOT_CERT_DIR to relocate it.
func LoadOrGenerateCerts() (tls.Certificate, error) {
	certFile, keyFile := certPaths()

	if certPEM, err := os.ReadFile(certFile); err == nil {
		if keyPEM, err := os.ReadFile(keyFile); err == nil {
			return tls.X509KeyPair(certPEM, keyPEM)
		}
	}

	logger.Warn("DoT: No TLS certs found — generating self-signed certificate...")
	certPEM, keyPEM, err := generateSelfSigned()
	if err != nil {
		return tls.Certificate{}, err
	}

	// Persist so the same certificate survives restarts and clients are not
	// re-prompted to trust a new one.
	if err := persist(certFile, keyFile, certPEM, keyPEM); err != nil {
		logger.Warn("DoT: Cannot persist TLS certs to disk — using in-memory only.")
	} else {
		logger.Info("DoT: Self-signed TLS cert saved to " + certDir())
	}

	return tls.X509KeyPair(certPEM, keyPEM)
}

func generateSelfSigned() (certPEM, keyPEM []byte, err error) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, nil, err
	}

	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return nil, nil, err
	}

	template := x509.Certificate{
		SerialNumber: serial,
		Subject: pkix.Name{
			CommonName:   "NexoralDNS",
			Organization: []string{"NexoralDNS"},
		},
		NotBefore:             time.Now().Add(-time.Hour), // tolerate minor clock skew
		NotAfter:              time.Now().Add(certValidity),
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment | x509.KeyUsageCertSign,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		IsCA:                  true,
	}

	der, err := x509.CreateCertificate(rand.Reader, &template, &template, &key.PublicKey, key)
	if err != nil {
		return nil, nil, err
	}

	certPEM = pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
	keyPEM = pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: mustMarshalKey(key)})
	return certPEM, keyPEM, nil
}

func mustMarshalKey(key *rsa.PrivateKey) []byte {
	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		// PKCS#8 marshalling of an RSA key cannot fail.
		panic(err)
	}
	return der
}

func persist(certFile, keyFile string, certPEM, keyPEM []byte) error {
	if err := os.MkdirAll(certDir(), 0o755); err != nil {
		return err
	}
	if err := atomicWrite(certFile, certPEM, 0o644); err != nil {
		return err
	}
	return atomicWrite(keyFile, keyPEM, 0o600)
}

// atomicWrite writes via a temp file in the same directory then renames, so a
// concurrent reader or a killed process never sees a partial file.
//
// The temp file is created fresh and exclusively rather than at a fixed path:
// os.WriteFile applies its mode only when it creates the file, so writing the
// private key through a stale or pre-planted temp file would silently keep that
// file's permissions instead of 0600.
func atomicWrite(dest string, data []byte, mode os.FileMode) error {
	tmp, err := os.CreateTemp(filepath.Dir(dest), filepath.Base(dest)+".*.tmp")
	if err != nil {
		return err
	}
	name := tmp.Name()
	defer os.Remove(name) // no-op once the rename below succeeds

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Chmod(mode); err != nil {
		tmp.Close()
		return err
	}
	// Flush before the rename so a crash cannot leave an empty file where a
	// valid certificate is expected.
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}

	return os.Rename(name, dest)
}
