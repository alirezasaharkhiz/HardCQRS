#!/usr/bin/env bash
set -euo pipefail

GREEN="\x1b[32m"; RED="\x1b[31m"; BLUE="\x1b[34m"; BOLD="\x1b[1m"; RESET="\x1b[0m"
DIM="\x1b[2m"

# ---- .env (optional) ----
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
fi

# ---- CONFIG (env overrides) ----
SHUTDOWN_LOG_DIR="${SHUTDOWN_LOG_DIR:-./shutdown_logs}"
SHUTDOWN_LOG_FILE="${SHUTDOWN_LOG_FILE:-$SHUTDOWN_LOG_DIR/allspark_shutdown.log}"
  
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-}"            
COMPOSE_FILES="${COMPOSE_FILES:-}"                        
DOCKER_CONTEXT="${DOCKER_CONTEXT:-}"                        
SERVICES_TO_STOP="${SERVICES_TO_STOP:-}"                   

DOWN_TIMEOUT="${DOWN_TIMEOUT:-30}"
REMOVE_ORPHANS="${REMOVE_ORPHANS:-true}"
REMOVE_VOLUMES="${REMOVE_VOLUMES:-false}"                    
REMOVE_IMAGES_LOCAL="${REMOVE_IMAGES_LOCAL:-false}" 
REMOVE_IMAGES_ALL="${REMOVE_IMAGES_ALL:-false}"  

# ---- PREPARE ----
mkdir -p "$SHUTDOWN_LOG_DIR"
echo -e "\n${BOLD}==> Starting shutdown sequence at $(date '+%Y-%m-%d %H:%M:%S')${RESET}" | tee -a "$SHUTDOWN_LOG_FILE"

# ---- TIMER ----
START_TS=$(date +%s)
fmt_duration() {
  local T=$1 d h m s
  d=$(( T/86400 )); h=$(( (T%86400)/3600 )); m=$(( (T%3600)/60 )); s=$(( T%60 ))
  if (( d > 0 )); then printf "%dd %02dh %02dm %02ds" "$d" "$h" "$m" "$s"; else printf "%02dh %02dm %02ds" "$h" "$m" "$s"; fi
}

# ---- COMMAND EXECUTION ----
log_run() {
  local cmd="$*"
  echo -e "${DIM}\$ ${cmd}${RESET}" | tee -a "$SHUTDOWN_LOG_FILE"
  ( set -o pipefail; bash -c "$cmd" ) 2>&1 | tee -a "$SHUTDOWN_LOG_FILE"
}

# ---- Compose args ----
compose_args=()
[ -n "$DOCKER_CONTEXT" ]       && compose_args+=(--context "$DOCKER_CONTEXT")
[ -n "$COMPOSE_PROJECT_NAME" ] && compose_args+=(-p "$COMPOSE_PROJECT_NAME")
# shellcheck disable=SC2086
[ -n "$COMPOSE_FILES" ]        && compose_args+=($COMPOSE_FILES)

# ---- SHUTDOWN (Compose-scoped) ----
if [ -n "$SERVICES_TO_STOP" ]; then
  # Stop/remove only specific services of this project
  log_run "docker compose ${compose_args[*]} stop $SERVICES_TO_STOP"
  log_run "docker compose ${compose_args[*]} rm -f $SERVICES_TO_STOP"
else
  # Bring the whole project down (no host-wide prune)
  orphans_flag=""; [ "$REMOVE_ORPHANS" = "true" ] && orphans_flag="--remove-orphans"
  vol_flag="";     [ "$REMOVE_VOLUMES" = "true" ] && vol_flag="-v"

  rmi_flag=""
  if [ "$REMOVE_IMAGES_ALL" = "true" ]; then
    rmi_flag="--rmi all"
  elif [ "$REMOVE_IMAGES_LOCAL" = "true" ]; then
    rmi_flag="--rmi local"
  fi

  log_run "docker compose ${compose_args[*]} down -t $DOWN_TIMEOUT $orphans_flag $vol_flag $rmi_flag"
fi

# ---- FINISH ----
END_TS=$(date +%s)
RUNTIME=$((END_TS - START_TS))
HUMAN_TIME=$(fmt_duration "$RUNTIME")

echo -e "${GREEN}✔ Shutdown completed successfully.${RESET}" | tee -a "$SHUTDOWN_LOG_FILE"
echo -e "${BLUE}Runtime:${RESET} ${BOLD}${RUNTIME}s (${HUMAN_TIME})${RESET}" | tee -a "$SHUTDOWN_LOG_FILE"
echo -e "Finished at: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$SHUTDOWN_LOG_FILE"
echo -e "Logs saved in: ${BOLD}${SHUTDOWN_LOG_FILE}${RESET}"
