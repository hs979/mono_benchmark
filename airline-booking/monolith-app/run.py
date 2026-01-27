"""
Startup script for Airline Booking Application
"""
import subprocess
import sys
import os

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = ['flask', 'boto3', 'jwt']
    missing_packages = []
    
    for package in required_packages:
        try:
            if package == 'jwt':
                __import__('jwt')
            else:
                __import__(package)
            print(f"✓ {package} is installed")
        except ImportError:
            print(f"✗ {package} is not installed")
            missing_packages.append(package)
    
    if missing_packages:
        print("\nPlease install dependencies first:")
        print("  pip install -r requirements.txt")
        return False
    
    return True

def check_config():
    """Check configuration and display warnings"""
    try:
        from config import Config
        return Config.print_config()
    except Exception as e:
        print(f"⚠ Warning: Could not load configuration: {e}")
        print("Continuing with default configuration...\n")
        return True

def main():
    """Main entry point"""
    print("\n" + "="*60)
    print("Airline Booking Monolithic Application")
    print("="*60 + "\n")
    
    if not check_dependencies():
        sys.exit(1)
    
    print()
    if not check_config():
        print("\n✗ Configuration errors detected. Please fix them before starting.")
        sys.exit(1)
    
    print("\nStarting application...")
    print("Server will be available at: http://localhost:5000")
    print("API documentation at: http://localhost:5000/api")
    print("\nPress Ctrl+C to stop the server\n")
    
    # Import and run the app
    try:
        from app import app
        app.run(host='0.0.0.0', port=5000, debug=True)
    except KeyboardInterrupt:
        print("\n\nShutting down application...")
        print("Goodbye!")
    except Exception as e:
        print(f"\n✗ Error starting application: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

