#!/bin/bash

# =========================[ COLORS & ICONS ]=========================
GREEN="\x1b[32m"; BLUE="\x1b[34m"; RED="\x1b[31m"; BOLD="\x1b[1m"; RESET="\x1b[0m"
DIM="\x1b[2m"; YELLOW="\x1b[33m"; MAGENTA="\x1b[35m"; CYAN="\x1b[36m"; GRAY="\x1b[90m"

ICON_INFO="ℹ"
ICON_OK="✔"
ICON_FAIL="✖"
ICON_WARN="⚠"
ICON_RUN="▶"
ICON_STEP="▸"

ts() { date +"%H:%M:%S"; }
hr() { printf "%b\n" "${GRAY}----------------------------------------------------------------------${RESET}"; }

# Basic loggers (console only for this helper)
log_line() { printf "%b %b%s%b %b%b%b\n" "$(printf "[%s]" "$(ts)")" "$CYAN" "$1" "$RESET" "$BOLD" "$2" "$RESET"; }
log_info() { printf "%b %b%s%b %b%b%b\n" "$(printf "[%s]" "$(ts)")" "$CYAN" "${ICON_INFO} INFO" "$RESET" "$BOLD" "$*" "$RESET"; }
log_ok()   { printf "%b %b%s%b %b%b%b\n" "$(printf "[%s]" "$(ts)")" "$GREEN" "${ICON_OK} OK  " "$RESET" "$BOLD" "$*" "$RESET"; }
log_warn() { printf "%b %b%s%b %b%b%b\n" "$(printf "[%s]" "$(ts)")" "$YELLOW" "${ICON_WARN} WARN" "$RESET" "$BOLD" "$*" "$RESET"; }
log_fail() { printf "%b %b%s%b %b%b%b\n" "$(printf "[%s]" "$(ts)")" "$RED" "${ICON_FAIL} FAIL" "$RESET" "$BOLD" "$*" "$RESET"; }
section()  { hr; printf "%b %b%s%b\n" "$(printf "[%s]" "$(ts)")" "$BOLD" "$*" "$RESET"; hr; }
run_announce(){ printf "%b %b%s%b %b%s%b\n" "$(printf "[%s]" "$(ts)")" "$MAGENTA" "${ICON_RUN} RUN" "$RESET" "$DIM" "$*" "$RESET"; }

# =========================[ ENV LOADING ]===========================
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
else
  log_fail ".env file not found. Please create one with the required MySQL configuration."
  exit 1
fi

# Endpoint (prefer host-mapped port; keep original default)
CONNECT_URL=${CONNECT_URL:-http://localhost:8083/connectors}
# Connect container name for fallback
CONNECT_SERVICE=${CONNECT_SERVICE:-kafka_connect}

# --- env-driven defaults for every field used in CONFIG ---
CONNECTOR_NAME="${CONNECTOR_NAME:-mysql-connector}"
TASKS_MAX="${TASKS_MAX:-1}"

# DB connection
MYSQL_HOST="${MYSQL_HOST:-lastdb}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-secret}"

# Debezium identity
DATABASE_SERVER_ID="${DATABASE_SERVER_ID:-1}"
MYSQL_SERVER_NAME="${MYSQL_SERVER_NAME:-lastdb}"

# Filters
MYSQL_DATABASE="${MYSQL_DATABASE:-base}"
MYSQL_TABLES="${MYSQL_TABLES:-}"          # e.g. base.agencies,base.posts
TOPIC_PREFIX="${TOPIC_PREFIX:-LASTSECOND}"

# Kafka / history topics (fully env-ized)
KAFKA_BOOTSTRAP_SERVERS="${KAFKA_BOOTSTRAP_SERVERS:-kafka:9092}"
SCHEMA_HISTORY_INTERNAL_KAFKA_TOPIC="${SCHEMA_HISTORY_INTERNAL_KAFKA_TOPIC:-schemahistory.${MYSQL_SERVER_NAME}}"
SCHEMA_HISTORY_INTERNAL_KAFKA_BOOTSTRAP_SERVERS="${SCHEMA_HISTORY_INTERNAL_KAFKA_BOOTSTRAP_SERVERS:-${KAFKA_BOOTSTRAP_SERVERS}}"
DATABASE_HISTORY_KAFKA_BOOTSTRAP_SERVERS="${DATABASE_HISTORY_KAFKA_BOOTSTRAP_SERVERS:-${KAFKA_BOOTSTRAP_SERVERS}}"
DATABASE_HISTORY_KAFKA_TOPIC="${DATABASE_HISTORY_KAFKA_TOPIC:-dbhistory.mysql}"

# Converters
KEY_CONVERTER="${KEY_CONVERTER:-org.apache.kafka.connect.json.JsonConverter}"
KEY_CONVERTER_SCHEMAS_ENABLE=${KEY_CONVERTER_SCHEMAS_ENABLE:-false}
VALUE_CONVERTER="${VALUE_CONVERTER:-org.apache.kafka.connect.json.JsonConverter}"
VALUE_CONVERTER_SCHEMAS_ENABLE=${VALUE_CONVERTER_SCHEMAS_ENABLE:-false}

# Transforms
TRANSFORMS="${TRANSFORMS:-unwrap}"
TRANSFORMS_UNWRAP_TYPE="${TRANSFORMS_UNWRAP_TYPE:-io.debezium.transforms.ExtractNewRecordState}"
TRANSFORMS_UNWRAP_DROP_TOMBSTONES=${TRANSFORMS_UNWRAP_DROP_TOMBSTONES:-true}
TRANSFORMS_UNWRAP_DELETE_HANDLING_MODE="${TRANSFORMS_UNWRAP_DELETE_HANDLING_MODE:-rewrite}"
TRANSFORMS_UNWRAP_ADD_FIELDS="${TRANSFORMS_UNWRAP_ADD_FIELDS:-op}"

# Producer overrides
PRODUCER_OVERRIDE_MAX_REQUEST_SIZE="${PRODUCER_OVERRIDE_MAX_REQUEST_SIZE:-20971520}"

# =========================[ PREVIEW SUMMARY ]=======================
section "MySQL Debezium Connector — Plan"
log_line "Connector Name:"         "$CONNECTOR_NAME"
log_line "Kafka Connect URL:"      "$CONNECT_URL"
log_line "Connect Container:"      "$CONNECT_SERVICE"
log_line "Kafka Bootstrap:"        "$KAFKA_BOOTSTRAP_SERVERS"
log_line "MySQL Host:"             "$MYSQL_HOST:$MYSQL_PORT"
log_line "MySQL User:"             "$MYSQL_USER"
log_line "DB Include:"             "$MYSQL_DATABASE"
log_line "Table Include:"          "${MYSQL_TABLES:-<none>}"
log_line "Topic Prefix:"           "$TOPIC_PREFIX"
log_line "Server Name:"            "$MYSQL_SERVER_NAME"
log_line "Tasks Max:"              "$TASKS_MAX"

# =========================[ BUILD CONFIG JSON ]=====================
CONFIG=$(cat <<EOF
{
  "name": "${CONNECTOR_NAME}",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "tasks.max": "${TASKS_MAX}",
    "database.hostname": "${MYSQL_HOST}",
    "database.port": "${MYSQL_PORT}",
    "database.user": "${MYSQL_USER}",
    "database.password": "${MYSQL_PASSWORD}",
    "database.server.id": "${DATABASE_SERVER_ID}",
    "database.server.name": "${MYSQL_SERVER_NAME}",
    "database.include.list": "${MYSQL_DATABASE}",
    "table.include.list": "${MYSQL_TABLES}",
    "topic.prefix": "${TOPIC_PREFIX}",

    "schema.history.internal.kafka.topic": "${SCHEMA_HISTORY_INTERNAL_KAFKA_TOPIC}",
    "schema.history.internal.kafka.bootstrap.servers": "${SCHEMA_HISTORY_INTERNAL_KAFKA_BOOTSTRAP_SERVERS}",

    "database.history.kafka.bootstrap.servers": "${DATABASE_HISTORY_KAFKA_BOOTSTRAP_SERVERS}",
    "database.history.kafka.topic": "${DATABASE_HISTORY_KAFKA_TOPIC}",

    "key.converter": "${KEY_CONVERTER}",
    "key.converter.schemas.enable": ${KEY_CONVERTER_SCHEMAS_ENABLE},
    "value.converter": "${VALUE_CONVERTER}",
    "value.converter.schemas.enable": ${VALUE_CONVERTER_SCHEMAS_ENABLE},

    "transforms": "${TRANSFORMS}",
    "transforms.unwrap.type": "${TRANSFORMS_UNWRAP_TYPE}",
    "transforms.unwrap.drop.tombstones": ${TRANSFORMS_UNWRAP_DROP_TOMBSTONES},
    "transforms.unwrap.delete.handling.mode": "${TRANSFORMS_UNWRAP_DELETE_HANDLING_MODE}",
    "transforms.unwrap.add.fields": "${TRANSFORMS_UNWRAP_ADD_FIELDS}",

    "producer.override.max.request.size": "${PRODUCER_OVERRIDE_MAX_REQUEST_SIZE}"
  }
}
EOF
)

section "Connector Configuration (JSON)"
# Show a compact preview (first lines) + full on demand
echo -e "${DIM}${CONFIG}${RESET}"

# =========================[ DEPLOY CONNECTOR ]======================
section "Deploying Connector"
log_info "Attempt 1 (host): POST ${BOLD}${CONNECT_URL}${RESET}"
run_announce "curl -i -X POST -H 'Accept: application/json' -H 'Content-Type: application/json' --data '\$CONFIG' ${CONNECT_URL}"

# Keep EXACT original logic: try host; if it fails, fallback via docker exec
curl -i -X POST -H "Accept: application/json" -H "Content-Type: application/json" \
    --data "$CONFIG" \
    ${CONNECT_URL} || \
(
  log_warn "Host request failed or not reachable. Falling back to ${BOLD}${CONNECT_SERVICE}${RESET} container..."
  log_info  "Attempt 2 (inside container): POST http://localhost:8083/connectors"
  run_announce "docker exec -i '${CONNECT_SERVICE}' curl -i -X POST -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary @- http://localhost:8083/connectors"
  docker exec -i "${CONNECT_SERVICE}" curl -i -X POST -H "Accept: application/json" -H "Content-Type: application/json" \
      --data-binary @- \
      http://localhost:8083/connectors <<< "$CONFIG"
)

# We don't parse HTTP codes here to keep behavior identical to your original.
# (If you ever want an OK/FAIL based on 2xx, we can add a non-breaking formatter.)

hr
log_ok "Deployment request(s) sent. Check Kafka Connect for the new connector: ${BOLD}${CONNECTOR_NAME}${RESET}"
