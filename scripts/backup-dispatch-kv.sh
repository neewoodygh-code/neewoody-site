#!/usr/bin/env bash
# Read-only backup of the dispatch KV namespace (neewoody-dispatch).
# Does NOT modify the dispatch Worker, its routes, or any key — it only READS
# the known nwd-* keys via wrangler and writes them to a local JSON file.
#
# Usage:  DISPATCH_KV_ID=<namespace-id> ./scripts/backup-dispatch-kv.sh
# Find the namespace id in the Cloudflare dashboard: Workers & Pages → KV →
# neewoody-dispatch (or `npx wrangler kv namespace list`).
set -euo pipefail

: "${DISPATCH_KV_ID:?Set DISPATCH_KV_ID to the neewoody-dispatch namespace id}"

# The documented allowed keys (see CLAUDE.md). Add here if new nwd-* keys appear.
KEYS=(nwd-crew nwd-tools nwd-jobs nwd-damage nwd-quotes nwd-overhead nwd-leads nwd-config)

OUT="dispatch-backup-$(date +%F).json"
echo "{" > "$OUT"
first=1
for k in "${KEYS[@]}"; do
  # Read the value; treat "not found" as null rather than failing the whole run.
  val="$(npx wrangler kv key get "$k" --namespace-id="$DISPATCH_KV_ID" --remote 2>/dev/null || echo "")"
  [ -z "$val" ] && val="null"
  [ $first -eq 0 ] && echo "," >> "$OUT"
  first=0
  # Store the raw value as a JSON string (already-JSON values are kept as text).
  printf '  %s: %s' "\"$k\"" "$(printf '%s' "$val" | python -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" >> "$OUT"
done
echo "" >> "$OUT"
echo "}" >> "$OUT"

echo "Wrote $OUT ($(wc -c < "$OUT") bytes)"
echo "Restore a key with:  npx wrangler kv key put \"<key>\" --path <file> --namespace-id=$DISPATCH_KV_ID --remote"
