# AGENTS.md — `client/` (the dashboard)

How to work on the web dashboard you open in a browser. Next.js, React, axios, zustand,
Tailwind, and **biome** for linting and formatting (there is no eslint or prettier here).
Runs on port 4000.

---

## Working agreement — ask, don't assume

**These three rules come first. They override everything else in this file.**
Full detail: root [`AGENTS.md`](../AGENTS.md) section 2.

**1. Tests are opt-in.** Say which command you want to run, say why, wait for a yes.
Permission covers only that moment — ask again next task. There is no client test suite
yet; the nearest one is `cd ../Test && npm run test:tools`.

No permission needed for `npm run lint` or `npm run build`; they change nothing. **But
`npm run format` writes changes to your files** — mention it before running.

**2. Ask when you are not sure — even mid-task.** Ask if the request is unclear, two files
disagree, the code does not support what you were asked, you would have to invent an API to
continue, or you are about to delete something you did not create. Being wrong 200 lines
in costs far more than one early question. Prefer the smallest change you can undo.
Reading code to answer a question is research, not a guess — making up behaviour is a guess.

**3. Check graphify before using it.** Run
`test -d graphify-out && command -v graphify >/dev/null && echo "graphify available"`.
Use `graphify query "<q>"` **only** if that prints `graphify available`; otherwise just use
grep/glob/read normally — no comment needed, it is not an error.

---

## 1. Check your work

Without asking: `npm run lint` (biome check) · `npm run build` (`next build --turbopack`).
`npm run dev` and `npm start` are pinned to port 4000.

> `client/` is deliberately **not** part of the npm workspace (the root workspace lists only
> `server`, `shared` and `DHCP`). `cd` into this folder and install here directly.

## 2. Where things live

`app/login/` is the public login page. Under `app/dashboard/` there is one folder per page:
the overview, `domains/`, `access-control/` (three tabs — Rules, Domain Groups, IP Groups),
`cache/`, `logs/`, `devices/`, `users/` (two tabs — Users, Roles), `settings/` and
`profile/`.

`components/` holds `auth/`, `dashboard/`, `domains/`, `access-control/`, `devices/`,
`users/` and `ui/`. `services/api.js` and `apiClient.js` hold every HTTP call.
`stores/authStore.js` and `themeStore.js` hold login state and light/dark mode.
`config/keys.js` holds endpoint names. `utils/queryCache.js` avoids sending the same
request twice.

## 3. Rules that matter

**All API calls go through `services/api.js` or `apiClient.js`.** Never call `axios`
directly from a component — there are over 50 functions there already. They use an **empty
base URL** on purpose: a Next.js rewrite forwards the request to the API. Do not hardcode
`localhost:4773`.

**Permission numbers must match the server exactly.** `components/dashboard/Sidebar.js` says
which numbers each menu item needs, and each one matches a `PermissionGuard.canAccess(...)`
call in `server/source/Router/*`. If you add a page, add its numbers there *and* in the
server route, or the two will drift apart. Number `4` (Full Access) covers everything. The
`devices` page also checks `isLocalNetwork()` — not just permissions. Keep that.

**The password-change popup blocks everything.** `dashboard/page.js:42` stops the whole
dashboard while `passwordUpdatedAt` is empty — true for the first admin account, for
accounts an admin created, and after an admin resets a password. Do not work around it.

**Protected pages** go through `components/auth/ProtectedRoute`. A 401 triggers a token
refresh through `authStore`, not a retry written into the page.

**Use the shared UI pieces** in `components/ui/`: `Button`, `InputField`, `TagInput`,
`LoadingSpinner`, `ConfirmationModal`, plus `react-hot-toast` for messages. Do not hand-build
a new modal or spinner. **Anything destructive goes through `ConfirmationModal`** — clearing
the cache, deleting a domain, deleting a user. No exceptions.

**Colours come from `themeStore` and CSS variables.** Do not hardcode colours; they will look
wrong in dark mode.

```jsx
// GOOD
const [saving, setSaving] = useState(false);

async function onSave(values) {
  setSaving(true);
  try {
    await api.updateDomain(domainId, values);
    toast.success('Domain updated');
  } catch (error) {
    toast.error(error?.response?.data?.message ?? 'Failed to update domain');
  } finally {
    setSaving(false);
  }
}
```

## 4. Dead code — delete it, do not build on it

`config/keys.js` points at five endpoints the server **does not have**: `DNS_RECORDS`,
`ZONES`, `STATISTICS`, `SETTINGS`, `LIST_OF_DEVICES`. The matching `getZones`, `getSettings`
and `getStatistics` functions are never called.

`components/access-control/AnalyticsTab.js` is never rendered — `access-control/page.js`
only shows Rules, Domain Groups and IP Groups. If you touch either of these, prefer removing
it over reviving it.

## 5. Boundaries

**Always** — send every request through `services/` · keep the permission numbers in
`client/` and `server/` in step · use the pieces in `components/ui/` · run `npm run lint`
and `npm run build` before reporting done.

**Ask first** — adding a page, because it needs a route, permission numbers and a sidebar
entry · changing the interceptors in `services/apiClient.js` · changing how login state or
tokens are stored.

**Never** — call the API directly at `localhost:4773` from the browser; it breaks the proxy
and exposes the API address · put secrets or tokens in `localStorage` · render a page that
needs permissions without adding it to `requiredPermissions` · remove the forced
password-change popup.