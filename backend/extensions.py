# backend/extensions.py
from flask_caching import Cache
from flask_migrate  import Migrate

# Create the cache object here
cache = Cache()
migrate = Migrate()