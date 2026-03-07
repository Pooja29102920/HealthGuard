#!/usr/bin/env python3
"""
HealthGuard – Local PWA Server
===============================
Run this script to serve HealthGuard as a proper installable phone app.

Usage:
  python3 serve.py

Then open http://localhost:8080 in Chrome/Edge on your phone or computer.
On Android: tap the "Install App" / "Add to Home Screen" banner.
On iOS Safari: tap Share → Add to Home Screen.
"""

import http.server
import socketserver
import socket
import os
import sys
import webbrowser
import threading
import time

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# MIME types for PWA
MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
}

class PWAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        return MIME_TYPES.get(ext, 'application/octet-stream')

    def end_headers(self):
        # Required headers for PWA / service worker
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Service-Worker-Allowed', '/')
        super().end_headers()

    def log_message(self, format, *args):
        pass  # Suppress request logs for cleaner output

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def open_browser():
    time.sleep(1.2)
    webbrowser.open(f'http://localhost:{PORT}')

if __name__ == '__main__':
    os.chdir(DIRECTORY)
    local_ip = get_local_ip()

    print('\n' + '='*54)
    print('  🏥  HealthGuard PWA Server')
    print('='*54)
    print(f'\n  ✅  Server running at:')
    print(f'      📱  http://{local_ip}:{PORT}   ← open on your phone')
    print(f'      💻  http://localhost:{PORT}    ← open on this computer')
    print('\n  📲  To install on Android:')
    print('      1. Open the phone URL above in Chrome')
    print('      2. Tap ⋮ menu → "Add to Home Screen" or')
    print('         tap the install banner that appears')
    print('\n  📱  To install on iPhone:')
    print('      1. Open the phone URL above in Safari')
    print('      2. Tap Share → "Add to Home Screen"')
    print('\n  ⚠️   Make sure your phone & computer are on')
    print('      the same Wi-Fi network!')
    print('\n  Press Ctrl+C to stop the server\n')
    print('='*54 + '\n')

    # Open browser automatically
    threading.Thread(target=open_browser, daemon=True).start()

    with socketserver.TCPServer(('', PORT), PWAHandler) as httpd:
        httpd.allow_reuse_address = True
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n\n  Server stopped. Goodbye! 👋\n')
            sys.exit(0)
