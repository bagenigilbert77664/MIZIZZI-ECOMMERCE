import os
from app import create_app, db
from flask_migrate import Migrate

app = create_app()

migrate = Migrate(app, db)

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
