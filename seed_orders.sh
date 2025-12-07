#!/usr/bin/env bash
# Seed sample orders by calling the backend REST API.
# Requirements: curl, jq
# Usage: ./scripts/seed_orders.sh [NUM_ORDERS] [ADMIN_USER] [ADMIN_PASS]

NUM=${1:-20}
ADMIN_USER=${2:-admin}
ADMIN_PASS=${3:-admin123}
API_BASE=${API_BASE:-http://localhost:8080}

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required but not installed. Install it (brew install jq) and retry." >&2
  exit 1
fi

echo "Logging in as $ADMIN_USER..."
TOKEN=$(curl -s -X POST "$API_BASE/auth/login" -H "Content-Type: application/json" -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" | jq -r '.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Failed to get token. Check backend is running and credentials are correct." >&2
  exit 1
fi

echo "Fetching foods..."
FOODS_JSON=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/api/foods")
FOOD_IDS=($(echo "$FOODS_JSON" | jq -r '.[].id'))
FOOD_AMOUNTS=($(echo "$FOODS_JSON" | jq -r '.[].amount'))

if [ ${#FOOD_IDS[@]} -eq 0 ]; then
  echo "No foods found. Ensure the backend has foods seeded or add foods first." >&2
  exit 1
fi

echo "Found ${#FOOD_IDS[@]} foods. Creating up to $NUM orders (will respect available stock)..."
for i in $(seq 1 $NUM); do
  # pick 1-3 random food ids but ensure we don't exceed available amounts
  CNT=$((1 + RANDOM % 3))
  IDS=()
  ATTEMPTS=0
  while [ ${#IDS[@]} -lt $CNT ] && [ $ATTEMPTS -lt 10 ]; do
    IDX=$((RANDOM % ${#FOOD_IDS[@]}))
    AMT=${FOOD_AMOUNTS[$IDX]}
    if [ -z "$AMT" ]; then
      AMT=0
    fi
    if [ "$AMT" -gt 0 ]; then
      IDS+=("{\"id\":${FOOD_IDS[$IDX]}}")
      # decrement local amount to avoid over-assigning
      FOOD_AMOUNTS[$IDX]=$((AMT - 1))
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
  done

  if [ ${#IDS[@]} -eq 0 ]; then
    echo "Skipping order $i: no available food stock to build an order." >&2
    continue
  fi

  # join IDS with commas to form a valid JSON array (avoid spaces/no-commas issues)
  IFS=,
  JOINED_IDS="${IDS[*]}"
  unset IFS
  BODY="{\"name\":\"Seed Order $i\",\"foods\":[${JOINED_IDS}]}"

  # send request and capture response body and status
  TMPFILE=$(mktemp)
  HTTP_CODE=$(curl -s -w "%{http_code}" -o "$TMPFILE" -X POST "$API_BASE/api/orders" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$BODY")
  RESP_BODY=$(cat "$TMPFILE")
  rm -f "$TMPFILE"

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "Created order $i"
  else
    echo "Failed to create order $i (status $HTTP_CODE) -- response: $RESP_BODY" >&2
  fi
done

echo "Done. Created $NUM orders. You can check analytics at /api/admin/analytics/overview or in the frontend UI."