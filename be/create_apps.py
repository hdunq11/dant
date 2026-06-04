import subprocess
import sys

apps = ['users', 'artists', 'venues', 'concerts', 'seats', 'orders', 'behaviors']

for app in apps:
    subprocess.run([sys.executable, 'manage.py', 'startapp', app], cwd='.')
    print(f"✓ Created app: {app}")
