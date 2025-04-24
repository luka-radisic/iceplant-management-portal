
# Application configuration
class Config:
    # Flask configuration
    SECRET_KEY = 'attendance-tracker-secret-key'  # Change this to a random string in production
    DEBUG = True
    
    # Database configuration
    DATABASE_FILE = "attendance_data.db"
    
    # Admin credentials
    ADMIN_USERNAME = "admin"
    ADMIN_PASSWORD = "4Tl4nt1$"  # Change this to a secure password

# Production configuration - override with more secure values when deploying
class ProductionConfig(Config):
    DEBUG = False
    # In production, use a more secure secret key
    SECRET_KEY = 'CHANGE_ME_IN_PRODUCTION_WITH_RANDOM_VALUE'
