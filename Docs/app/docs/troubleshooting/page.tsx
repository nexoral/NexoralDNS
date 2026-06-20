import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';

const blocks: Block[] = [
  { type: 'h', title: 'Quick diagnostics' },
  { type: 'code', prompt: false, label: 'diagnostics', code: `sudo docker compose ps
sudo docker compose logs -f
sudo docker compose logs -f dns-server
cat VERSION` },
  { type: 'h', title: 'Port conflicts', sub: '"Port 53 already in use" or "Port 4000 already in use".' },
  { type: 'code', prompt: false, label: 'free the port', code: `sudo netstat -tulpn | grep :53
sudo systemctl disable systemd-resolved
sudo systemctl stop systemd-resolved
sudo rm /etc/resolv.conf
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf` },
  { type: 'h', title: 'DNS not working after installation' },
  { type: 'code', prompt: false, label: 'dns checks', code: `sudo docker compose ps
dig @localhost google.com
sudo ufw allow 53/udp
sudo ufw allow 53/tcp
sudo ufw allow 4000/tcp` },
  { type: 'h', title: 'Custom domains not resolving' },
  { type: 'code', prompt: false, label: 'clear cache & test', code: `docker exec -it nexoraldns-redis-1 redis-cli FLUSHDB
dig @localhost myapp.local
dig @192.168.1.100 myapp.local` },
  { type: 'h', title: 'Cannot access the dashboard' },
  { type: 'code', prompt: false, label: 'restart web', code: `sudo docker compose ps | grep web
sudo docker compose restart web
curl http://localhost:4000` },
  { type: 'h', title: 'Login issues / forgot password' },
  { type: 'p', text: 'Default credentials are admin / admin. Reset via MongoDB if needed:' },
  { type: 'code', prompt: false, label: 'reset password', code: `docker exec -it nexoraldns-mongodb-1 mongosh
use nexoraldns
db.users.updateOne({ username: "admin" }, { $set: { password: "$2b$10$..." } })` },
  { type: 'h', title: 'Common error messages' },
  { type: 'table', grid: '1.2fr 2fr', head: ['Message', 'Meaning'], rows: [
    { key: 'Port already in use',  cells: ['Another service is using port 53 or 4000'] },
    { key: 'Connection refused',   cells: ['Service not running — check status and restart'] },
    { key: 'NXDOMAIN',            cells: ['Domain not found or blocked'] },
    { key: 'Permission denied',    cells: ['Insufficient privileges — use sudo'] },
    { key: 'Network unreachable',  cells: ['No internet — check connectivity'] },
  ]},
  { type: 'h', title: 'Useful commands' },
  { type: 'code', prompt: false, label: 'reference', code: `docker compose ps           # service status
docker compose logs -f      # all logs
docker compose restart      # restart all
docker stats                # resource usage
dig @localhost domain.com   # test resolution` },
  { type: 'callout', tone: 'info', title: 'Still need help?', text: 'Check GitHub Issues, open a new issue with your OS / Docker version / logs, or contact priority support (premium).' },
];

export default function Troubleshooting() {
  return (
    <DocPage
      group="Help"
      title="Troubleshooting"
      intro="A comprehensive reference for installation, DNS, dashboard, performance and database issues."
      blocks={blocks}
    />
  );
}
