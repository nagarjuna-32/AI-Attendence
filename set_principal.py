import sys
import os

# Add parent directory to path so we can import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.db.database import SessionLocal
from backend.db import models
from backend.core.security import get_password_hash

def set_credentials():
    db = SessionLocal()
    try:
        principal = db.query(models.Principal).first()
        if not principal:
            principal = models.Principal(
                username="principal",
                password_hash=get_password_hash("principal")
            )
            db.add(principal)
            print("No Principal found. Created new Principal account:")
        else:
            principal.username = "principal"
            principal.password_hash = get_password_hash("principal")
            print("Updated existing Principal account:")
            
        db.commit()
        print(f"Username set to: '{principal.username}'")
        print("Password set to: 'principal'")
    finally:
        db.close()

if __name__ == "__main__":
    set_credentials()
