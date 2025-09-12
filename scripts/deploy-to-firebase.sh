#!/usr/bin/env bash
# Bolt -> Single-step deploy script for HiPat (deploy to hipat.app)
# This script is self-contained. Paste it into ONE Bolt step and run.

set -euo pipefail

# ===============================
# BOLT: SINGLE-STEP DEPLOY SCRIPT
# ===============================
# Purpose:
#   Build and deploy the HiPat app to Firebase Hosting (hipat.app) from BOLT.
#   Safely PATCH firebase.json (do not overwrite rewrites/headers/redirects),
#   guarantee tooling (firebase-tools, jq), and health-check the live site.
#
# BOLT prerequisites (configure once):
#   • Secret:  FIREBASE_TOKEN  -> paste the token from `firebase login:ci`
#   • Env:     FIREBASE_PROJECT=hipatapp          # Firebase Project ID
#   • Env:     FIREBASE_SITE=hipatapp             # Hosting site ID
#   • Env:     BUILD_CMD="npm run build"          # Your build command
#   • Env:     BUILD_DIR="dist"                   # Where BUILD_CMD outputs
#   • Env:     HEALTHCHECK_URLS="https://hipat.app https://www.hipat.app"
#
# Notes:
#   - If your app builds to a different folder, set BUILD_DIR accordingly.
#   - If your build command differs, set BUILD_CMD accordingly.
#   - This step is idempotent. It only patches the needed keys in firebase.json.
#
# ===============================
# 0) Strict mode + echo helpers
# ===============================
say()  { printf "\n\033[1;34m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✖ %s\033[0m\n" "$*"; exit 1; }

# ===============================
# 1) Validate inputs
# ===============================
: "${FIREBASE_TOKEN:?Missing FIREBASE_TOKEN (add as BOLT secret)}"
: "${FIREBASE_PROJECT:=hipatapp}"
: "${FIREBASE_SITE:=hipatapp}"
: "${BUILD_CMD:=npm run build}"
: "${BUILD_DIR:=dist}"
: "${HEALTHCHECK_URLS:=https://hipat.app https://www.hipat.app}"

say "Using project=$FIREBASE_PROJECT site=$FIREBASE_SITE buildDir=$BUILD_DIR"
say "Health checks: $HEALTHCHECK_URLS"

# ===============================
# 2) Tooling (node, npm, firebase, jq)
# ===============================
say "Ensuring required CLIs are available…"

# Print versions if present (do not fail if not found yet)
command -v node >/dev/null 2>&1 && node -v || true
command -v npm  >/dev/null 2>&1 && npm -v  || true

# Install / upgrade Firebase CLI
npm i -g firebase-tools@latest >/dev/null 2>&1 || npm i -g firebase-tools@latest
firebase --version || fail "firebase-tools failed to install"

# jq is required for safe PATCH of firebase.json; install if missing
if ! command -v jq >/dev/null 2>&1; then
  say "Installing jq…"
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -y && sudo apt-get install -y jq
  else
    # Fallback: install via npm (ships a bundled jq-like binary 'node-jq')
    npm i -g node-jq
    # Create a tiny shim so 'jq' resolves to node-jq
    cat <<'SHIM' >/usr/local/bin/jq
#!/usr/bin/env bash
node-jq "$@"
SHIM
    chmod +x /usr/local/bin/jq
  fi
fi
jq --version || fail "jq is required but was not found"

ok "Tooling ready"

# ===============================
# 3) Install deps + build
# ===============================
say "Installing dependencies (npm ci)…"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

say "Running build: $BUILD_CMD"
eval "$BUILD_CMD"
[ -d "$BUILD_DIR" ] || fail "Build directory '$BUILD_DIR' does not exist after build"

ok "Build complete"

# ===============================
# 4) Ensure Firebase config files
# ===============================
say "Ensuring .firebaserc and firebase.json exist and are valid…"

# .firebaserc: set default project (non-destructive if already correct)
if [ ! -f .firebaserc ]; then
  cat > .firebaserc <<JSON
{
  "projects": {
    "default": "$FIREBASE_PROJECT"
  }
}
JSON
else
  # Patch default project if needed
  jq --arg proj "$FIREBASE_PROJECT" \
     '.projects.default = $proj' \
     .firebaserc > .firebaserc.tmp && mv .firebaserc.tmp .firebaserc
fi
ok ".firebaserc prepared"

# firebase.json: create minimal if missing (but we prefer to patch existing)
if [ ! -f firebase.json ]; then
  cat > firebase.json <<JSON
{
  "hosting": {
    "site": "$FIREBASE_SITE",
    "public": "$BUILD_DIR",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  }
}
JSON
  ok "firebase.json created (minimal)"
fi

# PATCH firebase.json safely:
# - If 'hosting' is an object: update .hosting.site and .hosting.public only.
# - If 'hosting' is an array: update entry with matching .site; else append one.
# - Preserve rewrites/headers/redirects/caching rules and anything else.
say "Patching firebase.json…"
jq \
  --arg site "$FIREBASE_SITE" \
  --arg pub  "$BUILD_DIR" '
  def ensureIgnore(h):
    if (h.ignore|type? == "array") then h
    else h + {ignore: ["firebase.json","**/.*","**/node_modules/**"]}
    end;

  if (.hosting|type == "object") then
    .hosting |= ensureIgnore(.hosting) | .hosting.site = $site | .hosting.public = $pub
  elif (.hosting|type == "array") then
    .hosting |= (
      if any(.site == $site) then
        map(if .site == $site then (ensureIgnore(.) | .public = $pub) else . end)
      else
        . + [ {"site": $site, "public": $pub, "ignore": ["firebase.json","**/.*","**/node_modules/**"]} ]
      end
    )
  else
    . + { "hosting": { "site": $site, "public": $pub, "ignore": ["firebase.json","**/.*","**/node_modules/**"] } }
  end
' firebase.json > firebase.json.tmp && mv firebase.json.tmp firebase.json

ok "firebase.json patched"

# ===============================
# 5) Deploy to Firebase Hosting
# ===============================
say "Deploying to Firebase Hosting…"
firebase deploy \
  --only "hosting:$FIREBASE_SITE" \
  --project "$FIREBASE_PROJECT" \
  --non-interactive \
  --token "$FIREBASE_TOKEN"

ok "Firebase deploy complete"

# ===============================
# 6) Post-deploy health checks
# ===============================
say "Running health checks…"
for url in $HEALTHCHECK_URLS; do
  printf "  • %s … " "$url"
  if curl -sSfL -o /dev/null -w "%{http_code}" "$url" | grep -E '^(2|3)[0-9]{2}$' >/dev/null; then
    ok "OK"
  else
    fail "Health check failed for $url"
  fi
done

ok "Deployment complete and healthy ✅"