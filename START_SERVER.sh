#!/bin/bash
# HealthGuard PWA Server – Mac/Linux launcher
# Double-click this file or run: bash START_SERVER.sh

cd "$(dirname "$0")"

if command -v python3 &>/dev/null; then
    python3 serve.py
elif command -v python &>/dev/null; then
    python serve.py
else
    echo "ERROR: Python not found. Please install Python 3."
    exit 1
fi
