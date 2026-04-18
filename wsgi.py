"""
WSGI Configuration for PythonAnywhere deployment.
Copy this content to: /var/www/itsoftware_pythonanywhere_com_wsgi.py
"""

import sys
import os

# Add project directory to Python path
project_home = '/home/itsoftware/mysite'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Set working directory so SQLite DB is created in the right place
os.chdir(project_home)

# Import the Flask app
from app import app as application
