"""
Setup Verification Script
Verifies that the DynamoDB environment is properly configured
"""
import sys
import os

def check_python_version():
    """Check Python version"""
    version = sys.version_info
    print(f"Python Version: {version.major}.{version.minor}.{version.micro}")
    if version.major < 3 or (version.major == 3 and version.minor < 7):
        print("  ✗ Python 3.7+ is required")
        return False
    print("  ✓ Python version is compatible")
    return True

def check_dependencies():
    """Check if required packages are installed"""
    print("\nChecking Dependencies:")
    required = {
        'flask': 'Flask',
        'boto3': 'boto3',
        'jwt': 'PyJWT',
        'dotenv': 'python-dotenv'
    }
    
    all_installed = True
    for module, package in required.items():
        try:
            __import__(module)
            print(f"  ✓ {package} is installed")
        except ImportError:
            print(f"  ✗ {package} is NOT installed")
            all_installed = False
    
    if not all_installed:
        print("\n  Install missing packages with:")
        print("  pip install -r requirements.txt")
    
    return all_installed

def check_aws_credentials():
    """Check AWS credentials"""
    print("\nChecking AWS Credentials:")
    
    # Check environment variables
    access_key = os.environ.get('AWS_ACCESS_KEY_ID')
    secret_key = os.environ.get('AWS_SECRET_ACCESS_KEY')
    region = os.environ.get('AWS_REGION', 'us-east-1')
    
    has_env_creds = bool(access_key and secret_key)
    
    if has_env_creds:
        print(f"  ✓ AWS_ACCESS_KEY_ID is set")
        print(f"  ✓ AWS_SECRET_ACCESS_KEY is set")
        print(f"  ✓ AWS_REGION: {region}")
        return True
    
    # Check if boto3 can find credentials
    try:
        import boto3
        session = boto3.Session()
        credentials = session.get_credentials()
        if credentials:
            print(f"  ✓ AWS credentials found (from config/IAM role)")
            print(f"  ✓ AWS_REGION: {region}")
            return True
        else:
            print("  ✗ No AWS credentials found")
            return False
    except Exception as e:
        print(f"  ✗ Error checking credentials: {e}")
        return False

def check_dynamodb_tables():
    """Check if DynamoDB tables exist"""
    print("\nChecking DynamoDB Tables:")
    
    try:
        import boto3
        from botocore.exceptions import ClientError
        
        region = os.environ.get('AWS_REGION', 'us-east-1')
        stage = os.environ.get('STAGE', 'dev')
        
        dynamodb = boto3.client('dynamodb', region_name=region)
        
        tables_needed = [
            f'Airline-Flight-{stage}',
            f'Airline-Booking-{stage}',
            f'Airline-Loyalty-{stage}',
            f'Airline-Users-{stage}'
        ]
        
        existing_tables = dynamodb.list_tables()['TableNames']
        
        all_exist = True
        for table in tables_needed:
            if table in existing_tables:
                # Check table status
                try:
                    response = dynamodb.describe_table(TableName=table)
                    status = response['Table']['TableStatus']
                    if status == 'ACTIVE':
                        print(f"  ✓ {table} (ACTIVE)")
                    else:
                        print(f"  ⚠ {table} ({status})")
                except ClientError as e:
                    print(f"  ✗ {table} (ERROR: {e})")
                    all_exist = False
            else:
                print(f"  ✗ {table} (NOT FOUND)")
                all_exist = False
        
        if not all_exist:
            print("\n  Create missing tables with:")
            print(f"  python init_dynamodb_tables.py --region {region} --stage {stage}")
        
        return all_exist
        
    except Exception as e:
        print(f"  ✗ Error checking tables: {e}")
        print("\n  Make sure AWS credentials are configured correctly")
        return False

def check_environment_config():
    """Check environment configuration"""
    print("\nChecking Environment Configuration:")
    
    stage = os.environ.get('STAGE', 'dev')
    jwt_secret = os.environ.get('JWT_SECRET_KEY')
    
    print(f"  Stage: {stage}")
    
    if jwt_secret:
        print(f"  ✓ JWT_SECRET_KEY is set")
    else:
        print(f"  ⚠ JWT_SECRET_KEY not set (will auto-generate)")
    
    # Check for .env file
    env_file = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_file):
        print(f"  ✓ .env file found")
    else:
        print(f"  ⚠ .env file not found (using environment variables)")
        print(f"    Create .env from: cp env.example .env")
    
    return True

def main():
    """Main verification function"""
    print("="*60)
    print("Airline Booking Application - Setup Verification")
    print("="*60)
    
    results = {
        'Python Version': check_python_version(),
        'Dependencies': check_dependencies(),
        'AWS Credentials': check_aws_credentials(),
        'Environment Config': check_environment_config(),
        'DynamoDB Tables': check_dynamodb_tables()
    }
    
    print("\n" + "="*60)
    print("Verification Summary")
    print("="*60)
    
    all_passed = True
    for check, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{check:.<40} {status}")
        if not passed:
            all_passed = False
    
    print("="*60)
    
    if all_passed:
        print("\n✓ All checks passed! You're ready to run the application.")
        print("\nStart the application with:")
        print("  python run.py")
        return 0
    else:
        print("\n✗ Some checks failed. Please fix the issues above.")
        print("\nQuick fixes:")
        print("  1. Install dependencies: pip install -r requirements.txt")
        print("  2. Set AWS credentials in .env file or environment")
        print("  3. Create tables: python init_dynamodb_tables.py")
        return 1

if __name__ == '__main__':
    sys.exit(main())

