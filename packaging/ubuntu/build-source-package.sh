#!/usr/bin/env bash
# Assemble an Ubuntu source package for OpenRSVP using the prebuilt
# Electron app tree from `electron-builder`. The resulting source package
# uploads to a Launchpad PPA cleanly: Launchpad's builders just unpack the
# tarball, run debian/rules, and install files. No node/Electron compile
# happens on Launchpad — that's deliberate (those builders can't reach the
# network during a build).
#
# Usage:
#   ./packaging/ubuntu/build-source-package.sh [SERIES]
#   SERIES defaults to "noble".
#
# Requires: dpkg-dev, devscripts, debhelper, fakeroot, lintian, gpg key
# matching the changelog Maintainer line.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SERIES="${1:-noble}"
NAME="openrsvp"
VERSION="$(jq -r .version "$ROOT/package.json")"
DEB_REV="0ubuntu1~${SERIES}1"
FULLVER="${VERSION}-${DEB_REV}"

PKG_ROOT="$ROOT/release/ppa/${NAME}-${VERSION}"
ORIG_TAR="$ROOT/release/ppa/${NAME}_${VERSION}.orig.tar.xz"

# Ensure the prebuilt Electron app tree exists.
APP_DIR="$ROOT/release/linux-unpacked"
if [ ! -d "$APP_DIR" ]; then
  echo "[!] $APP_DIR not found — run 'npm run dist:linux' first." >&2
  exit 1
fi

echo "[*] Building source package $NAME $FULLVER for series $SERIES"

rm -rf "$ROOT/release/ppa"
mkdir -p "$PKG_ROOT/app" "$PKG_ROOT/icons"

# 1. Stage the upstream "source" — the prebuilt app tree + icons.
cp -a "$APP_DIR/." "$PKG_ROOT/app/"
for s in 16 24 32 48 64 128 256 512; do
  cp "$ROOT/assets/icon-${s}.png" "$PKG_ROOT/icons/icon-${s}.png"
done

# 2. Pristine orig tarball (no debian/ inside).
( cd "$ROOT/release/ppa" && tar --owner=0 --group=0 -cJf "$ORIG_TAR" "${NAME}-${VERSION}" )

# 3. Drop debianization on top.
cp -a "$ROOT/packaging/ubuntu/debian" "$PKG_ROOT/debian"
chmod +x "$PKG_ROOT/debian/rules"

# 4. Patch the changelog series in case caller asked for jammy/oracular/etc.
sed -i -E "1s/\(([0-9.]+)-0ubuntu1~[a-z]+1\) [a-z]+;/(\1-${DEB_REV}) ${SERIES};/" \
    "$PKG_ROOT/debian/changelog"

# 5. Build the source package (-S = source only, -sa = include orig in .changes).
( cd "$PKG_ROOT" && dpkg-buildpackage -S -sa -d -nc )

CHANGES="$ROOT/release/ppa/${NAME}_${FULLVER}_source.changes"
echo
echo "[*] Source package built:"
ls -1 "$ROOT/release/ppa/"*"${VERSION}"* 2>/dev/null || true
echo
echo "Next steps (manual, requires gpg key for georgecottrell@email.com):"
echo "  debsign $CHANGES"
echo "  dput ppa:gcottrell/openrsvp $CHANGES"
echo
echo "Optional sanity check before signing:"
echo "  lintian -EvIL +pedantic $CHANGES"
