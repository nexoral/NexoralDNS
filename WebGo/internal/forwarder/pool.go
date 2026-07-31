package forwarder

import (
	"encoding/binary"
	"errors"
	"net"
	"sync"
	"sync/atomic"
)

// errPoolSaturated means every transaction ID on every socket is in flight.
var errPoolSaturated = errors.New("forward socket pool saturated")

// txidSpace is the size of the DNS transaction ID space.
const txidSpace = 0x10000

// pendingReply is one reserved transaction ID. reply is nil while the slot is
// merely reserved — set once a caller is actually waiting on it.
type pendingReply struct {
	reply          chan []byte
	expectedRemote string
}

// multiplexedSocket is one upstream socket and the replies outstanding on it.
type multiplexedSocket struct {
	conn *net.UDPConn

	mu       sync.Mutex
	pending  map[uint16]*pendingReply
	nextTxid uint16
}

// socketPool spreads upstream queries over several sockets, each multiplexing
// many in-flight queries keyed by a generated transaction ID, so forwarding
// never blocks waiting for a free socket.
//
// The ID on the wire is generated here rather than reused from the client, so
// two clients that happen to pick the same ID cannot clobber each other. The
// caller restores the client's original ID before replying.
type socketPool struct {
	sockets []*multiplexedSocket
	rr      atomic.Uint32
	closed  atomic.Bool
}

func newSocketPool(size int) (*socketPool, error) {
	if size < 1 {
		size = 1
	}

	pool := &socketPool{sockets: make([]*multiplexedSocket, 0, size)}
	for range size {
		conn, err := net.ListenUDP("udp4", nil)
		if err != nil {
			pool.close()
			return nil, err
		}
		socket := &multiplexedSocket{conn: conn, pending: map[uint16]*pendingReply{}}
		pool.sockets = append(pool.sockets, socket)
		go pool.readLoop(socket)
	}
	return pool, nil
}

// readLoop dispatches every datagram to the caller waiting on its transaction
// ID, dropping replies whose source is not the server the query went to.
func (p *socketPool) readLoop(socket *multiplexedSocket) {
	buf := make([]byte, 4096)
	for {
		n, remote, err := socket.conn.ReadFromUDP(buf)
		if err != nil {
			if p.closed.Load() {
				return
			}
			continue // per-query timeouts surface real failures
		}
		if n < 2 {
			continue
		}

		txid := binary.BigEndian.Uint16(buf)

		socket.mu.Lock()
		entry, found := socket.pending[txid]
		deliver := found && entry.reply != nil && entry.expectedRemote == remote.IP.String()
		if deliver {
			delete(socket.pending, txid)
		}
		socket.mu.Unlock()

		if !deliver {
			continue
		}

		// The buffer is reused on the next read, so the reply must be copied out.
		reply := make([]byte, n)
		copy(reply, buf[:n])

		select {
		case entry.reply <- reply:
		default: // the caller already gave up
		}
	}
}

// reservation identifies a claimed transaction ID on a specific socket.
type reservation struct {
	socket *multiplexedSocket
	txid   uint16
}

// reserve claims a free transaction ID, trying each socket in round-robin order.
func (p *socketPool) reserve() (reservation, error) {
	for range len(p.sockets) {
		socket := p.sockets[int(p.rr.Add(1)-1)%len(p.sockets)]

		socket.mu.Lock()
		if len(socket.pending) >= txidSpace {
			socket.mu.Unlock()
			continue
		}
		txid := socket.nextTxid
		for {
			if _, taken := socket.pending[txid]; !taken {
				break
			}
			txid++
		}
		socket.pending[txid] = &pendingReply{}
		socket.nextTxid = txid + 1
		socket.mu.Unlock()

		return reservation{socket: socket, txid: txid}, nil
	}
	return reservation{}, errPoolSaturated
}

// awaitFrom arms the reservation to receive a reply from expectedRemote.
func (r reservation) awaitFrom(expectedRemote string) chan []byte {
	reply := make(chan []byte, 1)

	r.socket.mu.Lock()
	if entry, found := r.socket.pending[r.txid]; found {
		entry.reply = reply
		entry.expectedRemote = expectedRemote
	}
	r.socket.mu.Unlock()

	return reply
}

// stopAwaiting drops the reply channel but keeps the reservation, so the next
// retry attempt reuses the same transaction ID.
func (r reservation) stopAwaiting() {
	r.socket.mu.Lock()
	if entry, found := r.socket.pending[r.txid]; found {
		entry.reply = nil
	}
	r.socket.mu.Unlock()
}

// release frees the transaction ID for reuse.
func (r reservation) release() {
	r.socket.mu.Lock()
	delete(r.socket.pending, r.txid)
	r.socket.mu.Unlock()
}

func (r reservation) send(payload []byte, upstreamIP string) error {
	_, err := r.socket.conn.WriteToUDP(payload, &net.UDPAddr{IP: net.ParseIP(upstreamIP), Port: 53})
	return err
}

// totalPending counts queries currently in flight across every socket.
func (p *socketPool) totalPending() int {
	total := 0
	for _, socket := range p.sockets {
		socket.mu.Lock()
		total += len(socket.pending)
		socket.mu.Unlock()
	}
	return total
}

func (p *socketPool) close() {
	p.closed.Store(true)
	for _, socket := range p.sockets {
		_ = socket.conn.Close()
	}
}
