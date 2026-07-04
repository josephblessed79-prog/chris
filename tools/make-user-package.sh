#!/bin/sh
# make-user-package.sh — builds the clean end-user package (ZIP) from this
# repository: only what officers need to run the system, none of the
# developer, test or sample-source files. Run from the repository root:
#   sh tools/make-user-package.sh
# Produces MOD-Procurement-System.zip beside the repository.
set -e
PKG="MOD-Procurement-System"
rm -rf "../$PKG" "../$PKG.zip"
mkdir -p "../$PKG"
cp -r index.html css js styles vendor USER-GUIDE.md README.md README-IT.md ASSUMPTIONS.md "../$PKG/"
printf 'HOW TO START\r\n============\r\n1. Open this folder.\r\n2. Double-click the file named  index.html\r\n3. The system opens in your web browser (Edge or Chrome). No internet is needed.\r\n\r\nYour work is saved as small .json case files using the Save Case button.\r\nRead USER-GUIDE.md for a walk-through in plain language.\r\n' > "../$PKG/START-HERE.txt"
(cd .. && zip -qr "$PKG.zip" "$PKG")
echo "Built ../$PKG.zip"
