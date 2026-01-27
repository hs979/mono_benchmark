"""
Application Configuration
Manages environment variables and configuration settings
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()


class Config:
    """Application configuration class"""
    
    # AWS Configuration
    AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    
    # Application Stage
    STAGE = os.environ.get('STAGE', 'dev')
    
    # DynamoDB Table Names
    FLIGHT_TABLE_NAME = os.environ.get('FLIGHT_TABLE_NAME', f'Airline-Flight-{STAGE}')
    BOOKING_TABLE_NAME = os.environ.get('BOOKING_TABLE_NAME', f'Airline-Booking-{STAGE}')
    LOYALTY_TABLE_NAME = os.environ.get('LOYALTY_TABLE_NAME', f'Airline-Loyalty-{STAGE}')
    USERS_TABLE_NAME = os.environ.get('USERS_TABLE_NAME', f'Airline-Users-{STAGE}')
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    
    # Stripe Payment Configuration
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    
    # Flask Configuration
    FLASK_ENV = os.environ.get('FLASK_ENV', 'development')
    FLASK_DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    @staticmethod
    def validate():
        """Validate that required configuration is present"""
        warnings = []
        errors = []
        
        # Check AWS credentials (warning if not set, will use IAM role/default credentials)
        if not Config.AWS_ACCESS_KEY_ID:
            warnings.append(
                "AWS_ACCESS_KEY_ID not set. Will attempt to use IAM role or default credentials."
            )
        
        if not Config.AWS_SECRET_ACCESS_KEY:
            warnings.append(
                "AWS_SECRET_ACCESS_KEY not set. Will attempt to use IAM role or default credentials."
            )
        
        # Check JWT secret key
        if not Config.JWT_SECRET_KEY:
            warnings.append(
                "JWT_SECRET_KEY not set. A random key will be generated (sessions won't persist across restarts)."
            )
        
        # Check Stripe configuration
        if not Config.STRIPE_SECRET_KEY:
            warnings.append(
                "STRIPE_SECRET_KEY not set. Payment service will run in SIMULATION MODE (no real charges)."
            )
        
        return warnings, errors
    
    @staticmethod
    def print_config():
        """Print current configuration (without sensitive data)"""
        print("\n" + "="*60)
        print("Application Configuration")
        print("="*60)
        print(f"AWS Region: {Config.AWS_REGION}")
        print(f"Stage: {Config.STAGE}")
        print(f"AWS Access Key: {'***' if Config.AWS_ACCESS_KEY_ID else 'Not Set'}")
        print(f"AWS Secret Key: {'***' if Config.AWS_SECRET_ACCESS_KEY else 'Not Set'}")
        print("\nDynamoDB Tables:")
        print(f"  Flight Table: {Config.FLIGHT_TABLE_NAME}")
        print(f"  Booking Table: {Config.BOOKING_TABLE_NAME}")
        print(f"  Loyalty Table: {Config.LOYALTY_TABLE_NAME}")
        print(f"  Users Table: {Config.USERS_TABLE_NAME}")
        print(f"\nJWT Secret Key: {'***' if Config.JWT_SECRET_KEY else 'Not Set (will auto-generate)'}")
        print(f"Stripe Secret Key: {'***' if Config.STRIPE_SECRET_KEY else 'Not Set (SIMULATION MODE)'}")
        print(f"Flask Environment: {Config.FLASK_ENV}")
        print(f"Flask Debug: {Config.FLASK_DEBUG}")
        print("="*60 + "\n")
        
        # Print warnings and errors
        warnings, errors = Config.validate()
        
        if warnings:
            print("⚠ Warnings:")
            for warning in warnings:
                print(f"  - {warning}")
            print()
        
        if errors:
            print("✗ Errors:")
            for error in errors:
                print(f"  - {error}")
            print()
            return False
        
        return True


# Initialize and validate configuration when module is imported
if __name__ == '__main__':
    Config.print_config()

