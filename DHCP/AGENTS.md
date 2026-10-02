# AGENTS.md — `DHCP/` (the network device lister)

**This is not a DHCP server.** There is no DHCP code anywhere in this repository. Despite
the folder name, `DHCP/` watches this machine's own IP address, tells the rest of the
system about any change, keeps `/etc/resolv.conf` pointing at us, and hands work to the
device scanner.

The actual device scan and the device list are kept in
`server/source/CronJob/Jobs/Connected_IP_fetcher.cron.ts`. This folder only handles the
"the IP changed" half.

---

## Working agreement — ask, don't assume

**These three rules come first. They override everything else in this file.**
Full detail: root [`AGENTS.md`](../AGENTS.md) section 2.

**1. Tests are opt-in.** Say which command you want to run, say why, wait for a yes.
Permission covers only that moment — ask again on the next task, and before any *new*
command. No permission needed for `npm run build` — it only type-checks.

**2. Ask when you are not sure — even mid-task.** Ask if the request is unclear, two files
disagree, the code does not support what you were asked, you would have to invent an API
to continue, or you are about to delete something you did not create. Being wrong 200
lines in costs far more than one early question. Prefer the smallest change you can undo.
Reading code to answer a question is research, not a guess — making up behaviour is a guess.

**3. Check graphify before using it.** Run this first:
`test -d graphify-out && command -v graphify >/dev/null && echo "graphify available"`.
Use `graphify query "<q>"` **only** if that prints `graphify available`. Otherwise just use
grep/glob/read normally — no comment needed, it is not an error.

---

## 1. Check your work

Safe to run without asking:

```bash
npm run build
```

**Ask first:** `cd ../Test && npm run test:dhcp` or `npm run coverage:dhcp`.

`npm run dev` builds, then runs `lib/config/DHCP.js` under `sudo`.
`npm start` runs it without sudo.

## 2. Where things live

```
src/
  config/DHCP.ts                            connects to Redis, publishes the change
  config/key.ts                             fixed values
  service/AutoScanIPchange.service.ts       checks this machine's IP every 10 seconds
  service/UpdateResolveConfigFile.service.ts  rewrites /etc/resolv.conf
```

## 3. Rules

### Check the IP before you pass it on

`AutoScanIPchange.service.ts` confirms the address it reads is a real, usable IPv4 address
— rejecting `0.0.0.0` and broken values — **before** publishing it.

This matters more than it looks. If `0.0.0.0` were written into `/etc/resolv.conf` as a
DNS server, **this whole machine would stop resolving names**. Never publish an address that
has not been checked, and never remove the check.

### Only one write at a time

`UpdateResolveConfigFile.service.ts` sends every write through a single chain of promises,
so two writes cannot overlap and leave `/etc/resolv.conf` half-updated. Keep that if you add
anything to this path.

### There is a bug here — do not copy it

The part that handles `search` lines rewrites them to `search <this.IP>`. That puts an IP
address where a list of domains belongs. It looks like a copy-paste mistake from the
`nameserver` line just above it.

Either it is a real bug, or those lines should be left alone. Either way: **do not build on
that pattern**, and mention it rather than quietly copying it.

The same function also hides every error it catches. That is defensible for a best-effort
`/etc/resolv.conf` write, but it means a silent failure looks exactly like success. Log at
`warn` level instead of throwing.

### Keep retrying Redis forever

`config/DHCP.ts` uses a retry with a growing wait between attempts, and it **never gives
up**. This is deliberate: if the retry function returns an error, the Redis library stops
reconnecting permanently and this feature dies for the rest of the process's life. Keep
that behaviour.

## 4. What gets published

```typescript
// Published to the Redis channel `broker:ip_change`:
//   { event: 'INVOKE_IP_FETCH', timestamp: number }
```

`server/` listens for this and runs the device scan again. Do not change the shape of that
message without checking the other side.

## 5. Boundaries

### Always

- Check the IP address before publishing it.
- Keep writes to `resolv.conf` one at a time.
- Keep Redis retrying forever.
- **Write** a test in `Test/dhcp/` for any change. Running it is opt-in.

### Ask first

- Changing the `broker:ip_change` message. Another process depends on it.
- Changing the 10-second check interval.
- Changing how `/etc/resolv.conf` is written.

### Never

- Never publish an address that has not been checked, and never publish `0.0.0.0`.
- Never remove the one-write-at-a-time protection.
- Never make the Redis retry give up.
- Never add real DHCP handling to this folder.