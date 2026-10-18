#!/bin/sh
cd "$(dirname "$0")"
if [ ! -f toplethos_ide.py ]; then
  echo "toplethos_ide.py missing — git pull" >&2
  exit 1
fi
export PYTHONPATH="$(pwd):${PYTHONPATH:-}"
exec python3 toplethos_ide.py "$@"
