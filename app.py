from flask import Flask
from flask_login import login_required
from backend.config import LocalDevelopmentConfig
from backend.models import db, User, Role
from flask_security import Security, SQLAlchemyUserDatastore, auth_required
from backend.resources import api

from flask_caching import Cache
from backend.celery.celery_factory import celery_init_app
import flask_excel as excel
from backend.extensions import cache,migrate

def createApp():
    # --- THIS IS THE CORRECTED LINE ---
    # It now correctly points to your backend templates folder.
    app = Flask(__name__, template_folder='backend/templates', static_folder='frontend', static_url_path='/static')

    app.config.from_object(LocalDevelopmentConfig)

    # ... (rest of the function is the same) ...
    db.init_app(app)
    api.init_app(app)
    cache.init_app(app)
    migrate.init_app(app,db)


    datastore = SQLAlchemyUserDatastore(db, User, Role)
    app.cache = cache
    app.security = Security(app, datastore=datastore, register_blueprint=False)
    app.app_context().push()

    return app

app = createApp()

import backend.routes

celery_app = celery_init_app(app)

excel.init_excel(app)

if (__name__ == '__main__'):
    app.run(debug=True)