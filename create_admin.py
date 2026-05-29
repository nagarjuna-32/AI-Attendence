from backend.db.database import SessionLocal, engine, Base
from backend.db.models import Admin
from backend.core.security import get_password_hash

def create_initial_admin():
    db = SessionLocal()
    admin = db.query(Admin).filter(Admin.username == "admin").first()
    if not admin:
        new_admin = Admin(username="admin", password_hash=get_password_hash("admin123"))
        db.add(new_admin)
        db.commit()
        print("Admin user created! Username: admin | Password: admin123")
    else:
        print("Admin user already exists.")
    db.close()

if __name__ == "__main__":
    create_initial_admin()
