#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Stop Hook: Validate Todo List Completion                                     #
# This hook prevents Claude Code from stopping if there are incomplete todos   #
# Reads from JSONL transcript to get actual TodoWrite state                    #
################################################################################

# Logging function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] STOP_HOOK: $*" >> ~/.claude/stop-hook.log
}

# Read JSON input from stdin
INPUT="$(cat)"

# Log that the hook was triggered
log "=== STOP HOOK TRIGGERED ==="
log "Input received: $(echo "$INPUT" | head -c 200)..."

# Check if this is already a stop hook continuation to prevent infinite loops
if command -v jq &>/dev/null; then
  STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
else
  # Fallback: check for stop_hook_active in input
  if echo "$INPUT" | grep -q '"stop_hook_active":true'; then
    STOP_HOOK_ACTIVE="true"
  else
    STOP_HOOK_ACTIVE="false"
  fi
fi

# If stop hook is already active, allow the stop to prevent infinite loop
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  log "Stop hook already active, allowing stop to prevent infinite loop"
  exit 0
fi

# Read the transcript to analyze todo status
if command -v jq &>/dev/null; then
  TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty')
else
  # Fallback: extract transcript_path using sed
  TRANSCRIPT_PATH=$(echo "$INPUT" | sed -n 's/.*"transcript_path":"\([^"]*\)".*/\1/p' | head -1)
fi

# Expand ~ to home directory if present
TRANSCRIPT_PATH="${TRANSCRIPT_PATH/#\~/$HOME}"

# Exit if no transcript path found
if [ -z "$TRANSCRIPT_PATH" ]; then
  log "No transcript path found, allowing stop"
  exit 0
fi

if [ ! -f "$TRANSCRIPT_PATH" ]; then
  log "Transcript file not found: $TRANSCRIPT_PATH, allowing stop"
  exit 0
fi

log "Reading transcript from: $TRANSCRIPT_PATH"

# Find the most recent TodoWrite tool use in the transcript
# We look for the last occurrence of todos in the transcript
LAST_TODO_STATE=""
TODO_FOUND=false

# Read the JSONL file line by line from the end to find the most recent todo state
if command -v tac &>/dev/null; then
  # Use tac if available (reverse cat)
  READER="tac"
else
  # Fallback to tail -r on macOS
  READER="tail -r"
fi

while IFS= read -r line; do
  # Check if this line contains a TodoWrite tool result
  if echo "$line" | grep -q '"toolUseResult"' && echo "$line" | grep -q '"newTodos"'; then
    # Extract the newTodos array from the toolUseResult
    if command -v jq &>/dev/null; then
      TODOS=$(echo "$line" | jq -r '.toolUseResult.newTodos // empty' 2>/dev/null || true)
      if [ -n "$TODOS" ] && [ "$TODOS" != "null" ] && [ "$TODOS" != "[]" ]; then
        LAST_TODO_STATE="$TODOS"
        TODO_FOUND=true
        break
      fi
    fi
  fi
done < <($READER "$TRANSCRIPT_PATH" 2>/dev/null || cat "$TRANSCRIPT_PATH")

# If no todos found, allow stop
if [ "$TODO_FOUND" = "false" ]; then
  log "No TodoWrite entries found in transcript, allowing stop"
  exit 0
fi

log "Found TodoWrite state: $(echo "$LAST_TODO_STATE" | head -c 100)..."

# Parse the todo state to check for incomplete items
INCOMPLETE_COUNT=0
INCOMPLETE_TODOS=""

if command -v jq &>/dev/null && [ -n "$LAST_TODO_STATE" ]; then
  # Count todos that are not completed
  INCOMPLETE_COUNT=$(echo "$LAST_TODO_STATE" | jq '[.[] | select(.status != "completed")] | length' 2>/dev/null || echo "0")
  
  # Get list of incomplete todos
  INCOMPLETE_TODOS=$(echo "$LAST_TODO_STATE" | jq -r '.[] | select(.status != "completed") | "  - [\(.status)] \(.content)"' 2>/dev/null || true)
fi

# If there are incomplete todos, block the stop
if [ "$INCOMPLETE_COUNT" -gt 0 ]; then
  log "BLOCKING STOP: Found $INCOMPLETE_COUNT incomplete todos"
  log "Incomplete todos: $INCOMPLETE_TODOS"
  
  # Return JSON to block stopping with reason for Claude
  cat <<EOF
{
  "decision": "block",
  "reason": "You have $INCOMPLETE_COUNT incomplete todo items. You must complete all tasks before stopping:\n\n$INCOMPLETE_TODOS\n\nUse TodoRead to see the current status, then complete all remaining tasks. Mark each task as completed using TodoWrite as you finish them."
}
EOF
  exit 0
fi

# All todos are complete or no todos exist - allow stop
log "All todos complete, allowing stop (incomplete_count: $INCOMPLETE_COUNT)"
exit 0