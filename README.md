# Sourdough Timeline Calculator

A mobile-first web prototype for planning sourdough starter and levain builds on a visual timeline.

The app lets a baker enter the initial starter amount, final starter amount, and generic final ready time, then generate a two-feed plan or adjust feed points manually. Schedules are day-relative time spans, so output uses labels such as `Day 1 18:00` and `Day 2 06:00`. Expansion/feed points can be added, edited, or dragged on the timeline. The schedule recalculates flour, water, total-after-feeding amounts, per-stage total expansion ratio, target mix/hold temperature, and warnings.

Advanced configuration is collapsed by default and includes hydration, snap interval, safe expansion range, practical temperature range, starter speed correction, visible timeline range, and one repeating working-hours window.

The first prototype is a web app only. It does not include Android native tooling, user accounts, payments, push notifications, or cloud persistence.

The header includes a lightweight external support link to `https://buymeacoffee.com/lambic`. It is a plain link, not an embedded payment widget.

## Local Development

Requirements:

- Node.js 22 or compatible current LTS
- npm

Install and run:

```bash
npm install
npm run dev
```

The Vite dev server reads these optional environment variables:

```bash
VITE_DEV_HOST=0.0.0.0
VITE_DEV_PORT=5173
VITE_BASE_PATH=/
```

Example:

```bash
VITE_DEV_HOST=0.0.0.0 VITE_DEV_PORT=5180 npm run dev
```

Run tests:

```bash
npm test
```

Build:

```bash
npm run build
```

## Docker / Podman

Build and run with Docker:

```bash
docker build -t sourdough-timeline-calculator .
docker run --rm -p 4173:4173 \
  -e APP_HOST=0.0.0.0 \
  -e APP_PORT=4173 \
  sourdough-timeline-calculator
```

Using Compose:

```bash
docker compose -f compose.yml up --build
```

The default Compose file is designed for the Lambic edge proxy pattern and does not publish a host port. For direct LAN testing by IP address, use the LAN override:

```bash
docker compose -f compose.yml -f compose.lan.yml up -d --build
```

That exposes `http://<host-lan-ip>:4173/` by default.

Podman can use the same Dockerfile and compose file where Podman Compose is available:

```bash
podman build -t sourdough-timeline-calculator .
podman run --rm -p 4173:4173 -e APP_HOST=0.0.0.0 -e APP_PORT=4173 sourdough-timeline-calculator
```

Runtime environment variables:

- `APP_HOST`: host/interface for the static server, default `0.0.0.0`
- `APP_PORT`: container listen port, default `4173`
- `BASE_URL`: documented deployment URL for the environment
- `PROXY_BASE_PATH`: expected external path when served behind a reverse proxy
- `TRUST_PROXY`: deployment hint for Lambic Labs reverse proxy setups
- `EDGE_NETWORK`: shared edge Docker network, default `edge`; production hosts may use a lane-specific value such as `edge-home`
- `LAN_BIND_ADDR`: bind address for `compose.lan.yml`, default `0.0.0.0`
- `HOST_PORT`: LAN override host port, default `4173`

Build-time environment variables:

- `VITE_BASE_PATH`: Vite asset base path, default `/`. Set this if the app is mounted below a path such as `/tools/sourdough/`.

## Lambic Labs Reverse Proxy Assumptions

This project is deployed on `lambic-local` as a container-friendly service behind the existing Lambic Labs edge proxy and Cloudflare tunnel.

Recommended deployment shape:

- Run the container on an internal Docker/Podman network.
- Use `APP_HOST=0.0.0.0` and an internal `APP_PORT`.
- Avoid binding a public fixed host port unless local testing requires it.
- Configure the edge proxy to route the chosen host or path to the container service.
- If the app is served under a subpath, build with `VITE_BASE_PATH` matching that path.

Example subpath build:

```bash
VITE_BASE_PATH=/sourdough/ docker compose -f compose.yml build
```

## Lambic Deployment

The current production placement is:

- Host: `lambic-local`
- Install path: `/srv/lambic/apps/sourdough-timeline-calculator`
- Public URL: `https://sourdough.lambiclabs.com`
- Tunnel: `home-server-edge`
- Docker network: `edge-home`

The app declares its edge route in `edge/app.yml`. The Lambic infrastructure inventory records `sourdough-timeline-calculator` as a small public web product on `lambic-local`.

Host-local production `.env`:

```bash
APP_HOST=0.0.0.0
APP_PORT=4173
BASE_URL=https://sourdough.lambiclabs.com
PROXY_BASE_PATH=/
TRUST_PROXY=true
VITE_BASE_PATH=/
EDGE_NETWORK=edge-home
```

Manual production refresh on `lambic-local`:

```bash
cd /srv/lambic/apps/sourdough-timeline-calculator
docker compose -p sourdough-timeline -f compose.yml up -d --build
cd /srv/lambic/edge
bash scripts/prod_edge_up.sh
```

The Cloudflare DNS route was created with:

```bash
cloudflared tunnel route dns c191c8c0-ae61-4c52-952b-1911ce160d28 sourdough.lambiclabs.com
```

## Approximate Fermentation Model

The timing model is intentionally simple and isolated in `src/lib/timingModel.ts` so it can be replaced later with empirical data. Temperature values are target mix/hold temperatures: the model assumes the starter is mixed to that temperature and held there for the stage.

At a 21C target mix/hold temperature, the prototype estimates:

- 2x total expansion: 6 hours
- 3x total expansion: 8 hours
- 4x total expansion: 10 hours
- 5x total expansion: 12 hours

Values between these points are linearly interpolated. Temperature uses a simple Q10-style rule: every 5C warmer halves the estimated time, and every 5C cooler doubles it. The current model does not calculate water temperature or thermal lag from cold flour, starter, containers, or room conditions.

The starter speed correction factor adjusts the model:

- Greater than `1.0`: starter is faster than predicted
- Less than `1.0`: starter is slower than predicted

The speed correction slider is centered at `1.0x`. It maps slower starters down to `0.5x` and faster starters up to `2.0x`.

## Expansion Multipliers

By default, the app balances the required growth evenly across all feeds. A feed multiplier can be edited in the feeding schedule. Editing one multiplier locks that feed and automatically rebalances the remaining unlocked feeds so the plan still targets the final starter amount.

Use **Balance ratios** to unlock the manually adjusted multipliers.

## Working Hours

Timeline background bands use configured working hours rather than fixed day/night labels. One working-hours window is repeated every generic day and can use daytime or overnight hours, such as `20:00` to `06:00`.

The default visible span starts at the opening time for Day 1, continues through the closed/non-working hours, and ends halfway through the following working block.

The **Generate feeding plan** action places the suggested feed points inside configured working hours when possible.

## Persistence

The current schedule is saved in browser `localStorage`. User defaults and advanced settings are also stored in a browser cookie, with a `localStorage` backup. The app includes:

- Reset to defaults
- Copy schedule as plain text
- Shareable plan URLs
- Print-friendly schedule output

## Roadmap

- Native Android version
- Empirical starter activity calibration
- Observation-based correction such as "starter was ready 1 hour early"
- Flour type adjustment
- Fridge cold-start lag
- Different starter hydration versus feeding hydration
- Push notifications and reminders
- Save common bakery schedules
- Multiple starter profiles
- Advanced optimisation balancing timing, temperature, and feeding ratios
