#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKER="${LAMBIC_EDGE_CHECKER:-/work/lambic/lambic-edge/scripts/check_resolved_compose_edge_contract.py}"

if [[ ! -f "$ROOT_DIR/edge/app.yml" ]]; then
  echo "ERROR: missing edge/app.yml" >&2
  exit 1
fi

if [[ -x "$CHECKER" ]]; then
  python3 "$CHECKER" \
    -f "$ROOT_DIR/compose.yml" \
    --app-service web \
    --route-alias web=sourdough-timeline-web \
    --require-no-restart
else
  CONFIG_JSON="$(mktemp)"
  trap 'rm -f "$CONFIG_JSON"' EXIT

  docker compose -f "$ROOT_DIR/compose.yml" config --format json > "$CONFIG_JSON"

  python3 - "$CONFIG_JSON" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as config_file:
    config = json.load(config_file)
failures = []
services = config.get("services", {})
networks = config.get("networks", {})
web = services.get("web", {})

if "ports" in web and web["ports"]:
    failures.append("web must not publish host ports")

edge = networks.get("edge", {})
if edge.get("external") is not True:
    failures.append("edge network must be external")

if "internal" not in networks:
    failures.append("internal network is missing")

web_networks = web.get("networks", {})
if "edge" not in web_networks:
    failures.append("web must join edge network")
if "internal" not in web_networks:
    failures.append("web must join internal network")

edge_aliases = web_networks.get("edge", {}).get("aliases", [])
if "sourdough-timeline-web" not in edge_aliases:
    failures.append("web must expose sourdough-timeline-web alias on edge network")

if web.get("restart") not in (None, "no"):
    failures.append('web restart policy must be "no" for on-demand local dev')

if failures:
    for failure in failures:
        print(f"ERROR: {failure}", file=sys.stderr)
    sys.exit(1)

print("fallback resolved compose edge contract passed")
PY
fi

echo "sourdough timeline local dev edge validation passed"
