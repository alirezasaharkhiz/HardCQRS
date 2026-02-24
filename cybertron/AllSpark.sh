#!/usr/bin/env bash
set -euo pipefail

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
strip_ansi() { sed -E 's/\x1B\[[0-9;]*[mK]//g'; }

# Core logger: prints to console (with color) AND to current step log (sans color)
_log() {
  # Usage: _log LEVEL COLOR "message"
  local level="$1"; shift
  local color="$1"; shift
  local msg="$*"
  local stamp="[$(ts)]"
  # Console
  printf "%b %b%s%b %b%b%b\n" "$stamp" "$color" "$level" "$RESET" "$BOLD" "$msg" "$RESET"
  # File (strip ANSI)
  printf "%s %s %s\n" "$stamp" "$level" "$(printf "%b" "$msg" | strip_ansi)" >> "$CURRENT_LOG_FILE"
}
log_info() { _log "${ICON_INFO} INFO" "$CYAN"   "$*"; }
log_ok()   { _log "${ICON_OK} OK  " "$GREEN"  "$*"; }
log_warn() { _log "${ICON_WARN} WARN" "$YELLOW" "$*"; }
log_fail() { _log "${ICON_FAIL} FAIL" "$RED"    "$*"; }
log_note() { _log "      "         "$GRAY"   "$*"; }

section() {
  local title="$*"
  hr
  printf "%b %b%s%b\n" "$(printf "[%s]" "$(ts)")" "$BOLD" "$title" "$RESET"
  hr
  {
    echo "----------------------------------------------------------------------"
    echo "[$(ts)] $title"
    echo "----------------------------------------------------------------------"
  } >> "$CURRENT_LOG_FILE"
}

announce_cmd(){
  local cmd="$*"
  printf "%b %b%s%b %b%s%b\n" "$(printf "[%s]" "$(ts)")" "$MAGENTA" "${ICON_RUN} RUN" "$RESET" "$DIM" "$cmd" "$RESET"
  printf "[%s] RUN %s\n" "$(ts)" "$cmd" | strip_ansi >> "$CURRENT_LOG_FILE"
}

# =====================[ .env LOADING (unchanged) ]==================
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
else
  echo ".env file not found. Please create one with configuration."
  exit 1
fi

# ---------- RUNTIME TIMER ----------
START_TS=$(date +%s)
fmt_duration () {
  local T=$1
  local d=$(( T/86400 ))
  local h=$(( (T%86400)/3600 ))
  local m=$(( (T%3600)/60 ))
  local s=$(( T%60 ))
  if (( d > 0 )); then
    printf "%dd %02dh %02dm %02ds" "$d" "$h" "$m" "$s"
  else
    printf "%02dh %02dm %02ds" "$h" "$m" "$s"
  fi
}

# ---- ENV defaults (override in .env) ----
CONNECT_URL="${CONNECT_URL:-http://172.20.20.173:8083}"

# Compose command & service/container names
ZOOKEEPER_SERVICE="${ZOOKEEPER_SERVICE:-zookeeper_cybertron}"
KAFKA_SERVICE="${KAFKA_SERVICE:-kafka}"
CONNECT_SERVICE="${CONNECT_SERVICE:-kafka_connect}"
MEGATRON_SERVICE="${MEGATRON_SERVICE:-megatron}"

KAFKA_BOOTSTRAP_BROKERS="${KAFKA_BOOTSTRAP_BROKERS:-kafka:9092}"

# MongoDB sinks
MONGODB_URI="${MONGODB_URI:-mongodb://root:example@172.20.20.21:27017/?directConnection=true}"
MONGODB_DATABASE="${MONGODB_DATABASE:-lastsecond2}" # fallback
MONGODB_DATABASE_BASE="${MONGODB_DATABASE_BASE:-$MONGODB_DATABASE}"
MONGODB_DATABASE_SPOTS="${MONGODB_DATABASE_SPOTS:-spot}"
MONGODB_DATABASE_CONTENTS="${MONGODB_DATABASE_CONTENTS:-content}"

MONGODB_TOPICS_BASE="${MONGODB_TOPICS_BASE:-${MONGODB_TOPICS:-}}"
MONGODB_TOPICS_SPOTS="${MONGODB_TOPICS_SPOTS:-}"
MONGODB_TOPICS_CONTENTS="${MONGODB_TOPICS_CONTENTS:-}"

# Optional prefixes to strip when mapping topic -> collection
BASE_PREFIX="${BASE_PREFIX:-}"
SPOTS_PREFIX="${SPOTS_PREFIX:-spot_}"
CONTENTS_PREFIX="${CONTENTS_PREFIX:-content_}"

# Sink connector names & settings
MONGODB_SINK_BASE_NAME="${MONGODB_SINK_BASE_NAME:-mongodb-sink-base}"
MONGODB_SINK_SPOT_NAME="${MONGODB_SINK_SPOT_NAME:-mongodb-sink-spot}"
MONGODB_SINK_CONTENT_NAME="${MONGODB_SINK_CONTENT_NAME:-mongodb-sink-content}"
MONGODB_SINK_TASKS_MAX="${MONGODB_SINK_TASKS_MAX:-1}"

MONGO_KEY_CONVERTER="${MONGO_KEY_CONVERTER:-org.apache.kafka.connect.storage.StringConverter}"
MONGO_VALUE_CONVERTER="${MONGO_VALUE_CONVERTER:-org.apache.kafka.connect.json.JsonConverter}"
MONGO_VALUE_CONVERTER_SCHEMAS_ENABLE=${MONGO_VALUE_CONVERTER_SCHEMAS_ENABLE:-false}

MONGO_DOCUMENT_ID_STRATEGY="${MONGO_DOCUMENT_ID_STRATEGY:-com.mongodb.kafka.connect.sink.processor.id.strategy.ProvidedInKeyStrategy}"
MONGO_WRITEMODEL_STRATEGY="${MONGO_WRITEMODEL_STRATEGY:-com.mongodb.kafka.connect.sink.writemodel.strategy.ReplaceOneDefaultStrategy}"
MONGO_DELETE_ON_NULL_VALUES=${MONGO_DELETE_ON_NULL_VALUES:-true}
MONGO_RECONNECT_BACKOFF_MS="${MONGO_RECONNECT_BACKOFF_MS:-1000}"
MONGO_RECONNECT_BACKOFF_MAX_MS="${MONGO_RECONNECT_BACKOFF_MAX_MS:-10000}"

# Waits
CONNECT_WAIT_TIMEOUT_SEC="${CONNECT_WAIT_TIMEOUT_SEC:-120}"
CONNECT_WAIT_POLL_SEC="${CONNECT_WAIT_POLL_SEC:-2}"

DEBEZIUM_WAIT_TIMEOUT_SEC="${DEBEZIUM_WAIT_TIMEOUT_SEC:-300}"
DEBEZIUM_WAIT_POLL_SEC="${DEBEZIUM_WAIT_POLL_SEC:-3}"
REQUIRE_OFFSETS_READY="${REQUIRE_OFFSETS_READY:-false}"

# MySQL env for topic discovery
MYSQL_ENV_FILE="${MYSQL_ENV_FILE:-./mysql/.env}"

LOG_DIR="${LOG_DIR:-./deploy_logs}"
mkdir -p "$LOG_DIR"

steps=(
  "Bring down all containers"
  "Start all containers"
  "Wait for Kafka Connect REST"
  "Create MySQL connector"
  "Create MongoDB connectors base_spot_content"
  "Wait for Debezium topics from mysql/.env"
  "Start Megatron"
)
TOTAL_STEPS=${#steps[@]}

CURRENT_STEP_INDEX=-1
CURRENT_STEP_NAME=""
CURRENT_LOG_FILE=""

# =========================[ HELPERS ALWAYS DEFINED ]================
start_step() {
  CURRENT_STEP_INDEX=$1
  CURRENT_STEP_NAME="${steps[$CURRENT_STEP_INDEX]}"
  local idx_fmt safe_name
  idx_fmt=$(printf "%02d" $((CURRENT_STEP_INDEX+1)))
  safe_name=$(printf "%s" "$CURRENT_STEP_NAME" | tr -cs 'A-Za-z0-9._-' '_')
  CURRENT_LOG_FILE="${LOG_DIR}/step_${idx_fmt}_${safe_name}.log"
  : > "$CURRENT_LOG_FILE"
  section "${ICON_STEP} Step $((CURRENT_STEP_INDEX+1))/$TOTAL_STEPS: ${CURRENT_STEP_NAME}"
}
ok_step() { log_ok "${CURRENT_STEP_NAME}"; }
fail_step() {
  log_fail "${CURRENT_STEP_NAME}"
  log_warn "See logs: ${CURRENT_LOG_FILE}"
  exit 1
}
run() {
  local cmd="$*"
  announce_cmd "$cmd"
  ( set -o pipefail; bash -lc "$cmd" ) 2>&1 | tee -a "$CURRENT_LOG_FILE"
}
trap 'if [ $? -ne 0 ]; then fail_step; fi' ERR

tick_line() {
  local base="$1"; local i="${2:-0}"
  local frames=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
  local f="${frames[$((i % ${#frames[@]}))]}"
  printf "\r%b [%s] %b%s%b %b%s%b" "$DIM" "$(ts)" "$CYAN" "$base" "$RESET" "$MAGENTA" "$f" "$RESET"
}

# Build per-topic overrides (ALWAYS PRESENT)
build_overrides() {
  local prefix="$1"
  local list="$2"
  local IFS=',' topic trimmed suffix
  local lines=()
  for topic in $list; do
    trimmed="${topic//[[:space:]]/}"
    [ -z "$trimmed" ] && continue
    case "$trimmed" in
      "$prefix"*) suffix="${trimmed#${prefix}}" ;;
      *)          suffix="$trimmed" ;;
    esac
    lines+=("  \"topic.override.${trimmed}.collection\": \"${suffix}\",")
  done
  printf "%s\n" "${lines[@]}"
}

# Kafka helpers (ALWAYS PRESENT)
kafka_list_topics() {
  docker exec "${KAFKA_SERVICE}" kafka-topics --bootstrap-server "${KAFKA_BOOTSTRAP_BROKERS}" --list 2>/dev/null || true
}
describe_topic_ok() {
  local t="$1"
  local desc
  desc=$(docker exec "${KAFKA_SERVICE}" kafka-topics --bootstrap-server "${KAFKA_BOOTSTRAP_BROKERS}" --describe --topic "$t" 2>/dev/null || true)
  if [ -z "$desc" ]; then echo "describe empty: $t" >> "$CURRENT_LOG_FILE"; return 1; fi
  echo "$desc" | grep -E "Leader: -1" >/dev/null && { echo "leader -1: $t" >> "$CURRENT_LOG_FILE"; return 1; }
  echo "$desc" | grep -E "Isr: \[\]" >/dev/null && { echo "empty ISR: $t" >> "$CURRENT_LOG_FILE"; return 1; }
  return 0
}
latest_offset_sum() {
  local t="$1"
  local cmd
  if docker exec "${KAFKA_SERVICE}" bash -lc 'command -v kafka-get-offsets >/dev/null 2>&1'; then
    cmd="kafka-get-offsets --bootstrap-server ${KAFKA_BOOTSTRAP_BROKERS} --topic $t --time -1 2>/dev/null | awk -F: '{s+=\$3} END{print (s==\"\"?\"-1\":s)}'"
  else
    cmd="kafka-run-class kafka.tools.GetOffsetShell --broker-list ${KAFKA_BOOTSTRAP_BROKERS} --topic $t --time -1 2>/dev/null | awk -F: '{s+=\$3} END{print (s==\"\"?\"-1\":s)}'"
  fi
  docker exec "${KAFKA_SERVICE}" bash -lc "$cmd" || echo "-1"
}

# =========================[ WORKFLOW ]==============================
start_step 0
run "docker-compose down --remove-orphans -t 30"
ok_step

start_step 1
run "docker-compose up -d ${ZOOKEEPER_SERVICE}"
run "docker-compose up -d ${KAFKA_SERVICE}"
run "docker-compose up -d ${CONNECT_SERVICE}"
ok_step

start_step 2
log_info "Checking Kafka Connect REST at ${BOLD}${CONNECT_URL}${RESET}"
deadline=$(( $(date +%s) + CONNECT_WAIT_TIMEOUT_SEC ))
i=0
connect_reachable() {
  curl -s "${CONNECT_URL}/connectors" >/dev/null 2>&1 && return 0
  docker exec "${CONNECT_SERVICE}" curl -s "http://localhost:8083/connectors" >/dev/null 2>&1 && return 0
  return 1
}
while ! connect_reachable; do
  [ "$(date +%s)" -ge "$deadline" ] && { printf "\n"; log_fail "Kafka Connect not reachable at ${CONNECT_URL}"; fail_step; }
  tick_line "Waiting for Kafka Connect"
  sleep "${CONNECT_WAIT_POLL_SEC}"
  i=$((i+1))
done
printf "\n"
log_ok "Kafka Connect REST is reachable at ${CONNECT_URL}"
ok_step

start_step 3
run "(cd mysql && ./create_mysql_connector.sh)"
ok_step

start_step 4

put_connector() {
  local name="$1"
  local json="$2"

  section "Deploying connector: ${name}"
  local cfg_file="${LOG_DIR}/${name}_config.json"
  local resp_file="${LOG_DIR}/${name}_resp.txt"
  printf '%s' "$json" > "$cfg_file"
  log_note "Wrote config to: $cfg_file"

  # Try host-accessible Connect first
  HTTP_CODE=$(curl -s -o "$resp_file" -w "%{http_code}" \
    -X PUT -H "Content-Type: application/json" \
    --data @"$cfg_file" \
    "${CONNECT_URL}/connectors/${name}/config" || true)

  # Fallback: inside connect container if host failed/non-2xx
  if [ -z "$HTTP_CODE" ] || [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
    log_warn "Host PUT failed or non-2xx (HTTP:$HTTP_CODE). Retrying from inside ${CONNECT_SERVICE}..."
    local docker_out
    docker_out=$(docker exec -i "${CONNECT_SERVICE}" sh -lc \
      "curl -s -w '\n%{http_code}' -X PUT -H 'Content-Type: application/json' --data-binary @- http://localhost:8083/connectors/${name}/config" \
      <<< "$json" || true)
    HTTP_CODE=$(printf "%s\n" "$docker_out" | tail -n1)
    printf "%s\n" "$docker_out" | sed '$d' > "$resp_file"
  fi

  log_info "HTTP: ${HTTP_CODE}"
  [ -f "$resp_file" ] && { log_note "Connector response saved to: $resp_file"; cat "$resp_file" | tee -a "$CURRENT_LOG_FILE" >/dev/null; }
  echo | tee -a "$CURRENT_LOG_FILE" >/dev/null
  if [ -z "$HTTP_CODE" ] || [ "${HTTP_CODE}" -lt 200 ] || [ "${HTTP_CODE}" -ge 300 ]; then
    log_fail "Failed to deploy ${name}"
    fail_step
  else
    log_ok "Deployed ${name}"
  fi
}

if [ -n "${MONGODB_TOPICS_BASE}" ]; then
  CONFIG_BASE=$(cat <<EOF
{
  "connector.class": "com.mongodb.kafka.connect.MongoSinkConnector",
  "tasks.max": "${MONGODB_SINK_TASKS_MAX}",
  "topics": "${MONGODB_TOPICS_BASE}",
  "connection.uri": "${MONGODB_URI}",
  "database": "${MONGODB_DATABASE_BASE}",
  "key.converter": "${MONGO_KEY_CONVERTER}",
  "value.converter": "${MONGO_VALUE_CONVERTER}",
  "value.converter.schemas.enable": ${MONGO_VALUE_CONVERTER_SCHEMAS_ENABLE},
$(build_overrides "${BASE_PREFIX}" "${MONGODB_TOPICS_BASE}")
  "document.id.strategy": "${MONGO_DOCUMENT_ID_STRATEGY}",
  "writemodel.strategy": "${MONGO_WRITEMODEL_STRATEGY}",
  "delete.on.null.values": ${MONGO_DELETE_ON_NULL_VALUES},
  "reconnect.backoff.ms": "${MONGO_RECONNECT_BACKOFF_MS}",
  "reconnect.backoff.max.ms": "${MONGO_RECONNECT_BACKOFF_MAX_MS}"
}
EOF
)
  put_connector "${MONGODB_SINK_BASE_NAME}" "${CONFIG_BASE}"
else
  log_warn "Skipping ${MONGODB_SINK_BASE_NAME} (MONGODB_TOPICS_BASE not set)"
fi

if [ -n "${MONGODB_TOPICS_SPOTS}" ]; then
  CONFIG_SPOTS=$(cat <<EOF
{
  "connector.class": "com.mongodb.kafka.connect.MongoSinkConnector",
  "tasks.max": "${MONGODB_SINK_TASKS_MAX}",
  "topics": "${MONGODB_TOPICS_SPOTS}",
  "connection.uri": "${MONGODB_URI}",
  "database": "${MONGODB_DATABASE_SPOTS}",
  "key.converter": "${MONGO_KEY_CONVERTER}",
  "value.converter": "${MONGO_VALUE_CONVERTER}",
  "value.converter.schemas.enable": ${MONGO_VALUE_CONVERTER_SCHEMAS_ENABLE},
$(build_overrides "${SPOTS_PREFIX}" "${MONGODB_TOPICS_SPOTS}")
  "document.id.strategy": "${MONGO_DOCUMENT_ID_STRATEGY}",
  "writemodel.strategy": "${MONGO_WRITEMODEL_STRATEGY}",
  "delete.on.null.values": ${MONGO_DELETE_ON_NULL_VALUES},
  "reconnect.backoff.ms": "${MONGO_RECONNECT_BACKOFF_MS}",
  "reconnect.backoff.max.ms": "${MONGO_RECONNECT_BACKOFF_MAX_MS}"
}
EOF
)
  put_connector "${MONGODB_SINK_SPOT_NAME}" "${CONFIG_SPOTS}"
else
  log_warn "Skipping ${MONGODB_SINK_SPOT_NAME} (MONGODB_TOPICS_SPOTS not set)"
fi

if [ -n "${MONGODB_TOPICS_CONTENTS}" ]; then
  CONFIG_CONTENTS=$(cat <<EOF
{
  "connector.class": "com.mongodb.kafka.connect.MongoSinkConnector",
  "tasks.max": "${MONGODB_SINK_TASKS_MAX}",
  "topics": "${MONGODB_TOPICS_CONTENTS}",
  "connection.uri": "${MONGODB_URI}",
  "database": "${MONGODB_DATABASE_CONTENTS}",
  "key.converter": "${MONGO_KEY_CONVERTER}",
  "value.converter": "${MONGO_VALUE_CONVERTER}",
  "value.converter.schemas.enable": ${MONGO_VALUE_CONVERTER_SCHEMAS_ENABLE},
$(build_overrides "${CONTENTS_PREFIX}" "${MONGODB_TOPICS_CONTENTS}")
  "document.id.strategy": "${MONGO_DOCUMENT_ID_STRATEGY}",
  "writemodel.strategy": "${MONGO_WRITEMODEL_STRATEGY}",
  "delete.on.null.values": ${MONGO_DELETE_ON_NULL_VALUES},
  "reconnect.backoff.ms": "${MONGO_RECONNECT_BACKOFF_MS}",
  "reconnect.backoff.max.ms": "${MONGO_RECONNECT_BACKOFF_MAX_MS}"
}
EOF
)
  put_connector "${MONGODB_SINK_CONTENT_NAME}" "${CONFIG_CONTENTS}"
else
  log_warn "Skipping ${MONGODB_SINK_CONTENT_NAME} (MONGODB_TOPICS_CONTENTS not set)"
fi

ok_step

# =========================[ STEP 5 — WAIT ]=========================
start_step 5
if [ ! -f "$MYSQL_ENV_FILE" ]; then
  echo "Missing MySQL env file at $MYSQL_ENV_FILE" | tee -a "$CURRENT_LOG_FILE"
  fail_step
fi

# Small local log helpers for structured lists
log_line() { echo -e "$1"; printf "%b\n" "$1" | strip_ansi >> "$CURRENT_LOG_FILE"; }
log_section() {
  local title="$1"
  local bar="------------------------------------------------------------------------"
  log_line "${BLUE}${bar}${RESET}"
  log_line "${BOLD}$title${RESET}"
  log_line "${BLUE}${bar}${RESET}"
}
log_list() {
  local label="$1"; shift
  local count="$#"
  log_line "${BOLD}$label (${count})${RESET}"
  if [ "$count" -eq 0 ]; then
    log_line "  (none)"
  else
    local item
    for item in "$@"; do log_line "  - $item"; done
  fi
}

# Diagnostics: connector statuses
log_section "Connector statuses (for troubleshooting)"
list_connectors() {
  curl -s "${CONNECT_URL}/connectors" 2>/dev/null || docker exec "${CONNECT_SERVICE}" curl -s "http://localhost:8083/connectors" 2>/dev/null || echo "[]"
}
connector_status() {
  local cname="$1"
  curl -s "${CONNECT_URL}/connectors/${cname}/status" 2>/dev/null || docker exec "${CONNECT_SERVICE}" curl -s "http://localhost:8083/connectors/${cname}/status" 2>/dev/null || echo '{}'
}
for c in $(list_connectors | tr -d '[]"' | tr ',' ' '); do
  [ -z "$c" ] && continue
  log_line "${DIM}--- ${c}${RESET}"
  log_line "$(connector_status "$c")"
done

# Build expected list from mysql/.env
MYSQL_DATABASE=$(grep -E '^MYSQL_DATABASE=' "$MYSQL_ENV_FILE" | cut -d '=' -f2)
TOPIC_PREFIX=$(grep -E '^TOPIC_PREFIX=' "$MYSQL_ENV_FILE" | cut -d '=' -f2)
MYSQL_TABLES=$(grep -E '^MYSQL_TABLES=' "$MYSQL_ENV_FILE" | cut -d '=' -f2-)

if [ -z "${MYSQL_DATABASE:-}" ] || [ -z "${TOPIC_PREFIX:-}" ] || [ -z "${MYSQL_TABLES:-}" ]; then
  log_section "Error"
  log_line "${RED}Could not extract MYSQL_DATABASE, TOPIC_PREFIX, or MYSQL_TABLES from $MYSQL_ENV_FILE${RESET}"
  fail_step
fi

EXPECTED_TOPICS=()
IFS=',' read -ra TABLE_LIST <<< "$MYSQL_TABLES"
for table in "${TABLE_LIST[@]}"; do
  t="$(echo "$table" | awk -F'.' '{print $NF}')"
  EXPECTED_TOPICS+=("${TOPIC_PREFIX}.${MYSQL_DATABASE}.${t}")
done

# Exceptions to skip wait
EXC_LIST_RAW="${EXCEPTION_DEBEZIUM_TOPICS:-}"
EXC_FULL=()
EXC_SHORT=()
if [ -n "$EXC_LIST_RAW" ]; then
  IFS=',' read -ra RAW_EXC <<< "$EXC_LIST_RAW"
  for e in "${RAW_EXC[@]}"; do
    e_trim="$(echo "$e" | tr -d '[:space:]')"
    [ -z "$e_trim" ] && continue
    case "$e_trim" in
      *.*) EXC_FULL+=("$e_trim") ;;
      *)   EXC_SHORT+=("$e_trim") ;;
    esac
  done
fi
is_exception_topic() {
  local topic="$1"
  local base="$(echo "$topic" | awk -F'.' '{print $NF}')"
  local e
  for e in "${EXC_FULL[@]}"; do [ "$topic" = "$e" ] && return 0; done
  for e in "${EXC_SHORT[@]}"; do [ "$base" = "$e" ] && return 0; done
  return 1
}

# Announce plan
log_section "Debezium Topic Readiness Waiter"
if [ "${DEBEZIUM_WAIT_TIMEOUT_SEC}" -gt 0 ] 2>/dev/null; then
  log_line "Timeout: ${BOLD}${DEBEZIUM_WAIT_TIMEOUT_SEC}s${RESET}"
else
  log_line "Timeout: ${BOLD}none${RESET}"
fi
log_list "Expected topics" "${EXPECTED_TOPICS[@]}"
if (( ${#EXC_FULL[@]} + ${#EXC_SHORT[@]} > 0 )); then
  log_list "Exceptions (full names)" "${EXC_FULL[@]}"
  log_list "Exceptions (table names)" "${EXC_SHORT[@]}"
fi

i=0
deadline_ts=""
if [ "${DEBEZIUM_WAIT_TIMEOUT_SEC:-0}" -gt 0 ] 2>/dev/null; then
  deadline_ts=$(( $(date +%s) + DEBEZIUM_WAIT_TIMEOUT_SEC ))
fi
last_print_ts=0

while true; do
  missing=()
  notready=()
  skipped=()

  topic_list="$(kafka_list_topics)"

  for t in "${EXPECTED_TOPICS[@]}"; do
    if is_exception_topic "$t"; then
      skipped+=("$t")
      continue
    fi
    echo "$topic_list" | grep -x "$t" >/dev/null 2>&1 || { missing+=("$t"); continue; }
    if ! describe_topic_ok "$t"; then
      notready+=("$t")
      continue
    fi
    if [ "$REQUIRE_OFFSETS_READY" = "true" ]; then
      off="$(latest_offset_sum "$t")"
      [ "$off" = "-1" ] && { notready+=("$t"); continue; }
    fi
  done

  if [ ${#missing[@]} -eq 0 ] && [ ${#notready[@]} -eq 0 ]; then
    log_section "Debezium topics are ready"
    log_list "Ready (including skipped list below)" "${EXPECTED_TOPICS[@]}"
    if (( ${#skipped[@]} > 0 )); then
      log_list "Skipped by exceptions" "${skipped[@]}"
    fi
    break
  fi

  now=$(date +%s)
  if (( now - last_print_ts >= 30 )); then
    log_section "Progress"
    log_list "Still missing" "${missing[@]}"
    if [ "$REQUIRE_OFFSETS_READY" = "true" ]; then
      log_list "Present but not ready (leader/ISR/offsets)" "${notready[@]}"
    else
      log_list "Present but not ready (leader/ISR)" "${notready[@]}"
    fi
    if (( ${#skipped[@]} > 0 )); then
      log_list "Skipped (exceptions)" "${skipped[@]}"
    fi
    last_print_ts=$now
  fi

  if [ -n "$deadline_ts" ] && [ "$(date +%s)" -ge "$deadline_ts" ]; then
    log_section "Timeout reached"
    log_list "Missing topics at timeout" "${missing[@]}"
    log_list "Present but not ready at timeout" "${notready[@]}"
    if (( ${#skipped[@]} > 0 )); then
      log_list "Skipped (exceptions)" "${skipped[@]}"
    fi
    if ((${#missing[@]})) || ((${#notready[@]})); then
      log_line "${RED}Aborting: Debezium topics not ready at timeout (excluding exceptions).${RESET}"
      log_line "Hint: Increase DEBEZIUM_WAIT_TIMEOUT_SEC or trigger data changes for empty tables."
      fail_step
    fi
    break
  fi

  tick_line "Waiting for Debezium topics" "$i"
  sleep "$DEBEZIUM_WAIT_POLL_SEC"
  i=$((i+1))
done

ok_step

# =========================[ STEP 6 ]===============================
start_step 6
run "docker-compose up -d ${MEGATRON_SERVICE}"
ok_step

# ---------- END TIMER + SUMMARY ----------
END_TS=$(date +%s)
TOTAL_SECS=$(( END_TS - START_TS ))
HUMAN_TIME=$(fmt_duration "$TOTAL_SECS")

section "RUN SUMMARY"
printf "%bTotal runtime:%b %s (%s)\n" "$BOLD" "$RESET" "${TOTAL_SECS}s" "${HUMAN_TIME}" | tee -a "$LOG_DIR/run_summary.log" >/dev/null
log_ok "All steps completed successfully!"
log_info "Logs saved in: ${BOLD}$LOG_DIR${RESET}"
