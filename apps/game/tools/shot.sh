#!/bin/zsh
# Renders the by-eye screenshots into apps/game/shots/ (git-ignored): farm, house and Lowmere at Low, Medium and High
# in spring and in winter (12 PNGs), plus a night farm (window glow) and a rainy farm on Medium. Each shot is one
# windowed Godot run of tools/shot.gd through `pnpm game:shot`. Extra args are passed to every shot (e.g. perf=1).
# Usage: apps/game/tools/shot.sh [key=value ...]   ONLY="farm-low-spring ..." limits the set.
set -u
cd "$(dirname "$0")/../../.."
OUT="$PWD/apps/game/shots"
mkdir -p "$OUT"
# Godot must not import the PNGs as project assets.
touch "$OUT/.gdignore"
ONLY=${ONLY:-}
failed=0
shot() { # name scene tier season [extra key=value ...]
  local name=$1 scene=$2 tier=$3 season=$4
  shift 4
  [[ -n "$ONLY" && " $ONLY " != *" $name "* ]] && return
  rm -f "$OUT/$name.png"
  pnpm -s game:shot -- scene=$scene tier=$tier season=$season "$@" ${=EXTRA} out="$OUT/$name.png" \
    >"$OUT/$name.log" 2>&1
  if [ -f "$OUT/$name.png" ]; then echo "ok     $name"; else echo "FAILED $name (see $name.log)"; failed=1; fi
}
EXTRA="$*"
for scene in farm house lowmere; do
  for tier in low medium high; do
    shot "$scene-$tier-spring" $scene $tier spring
    shot "$scene-$tier-winter" $scene $tier winter weather=snow
  done
done
shot title-medium title medium spring
shot farm-medium-night farm medium spring minute=1320
shot farm-medium-rain farm medium spring weather=rain
exit $failed
