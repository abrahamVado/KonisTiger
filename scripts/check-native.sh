#!/usr/bin/env bash
set -euo pipefail
echo "[check-native] Listing embedded native binaries (*.node)"
grep -R --null -l "\.node" node_modules || true
echo "[check-native] If none listed, you're likely all JS or packed differently. Ensure build.asarUnpack matches."
