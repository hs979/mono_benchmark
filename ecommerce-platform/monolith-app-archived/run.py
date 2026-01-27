"""
Application Startup Script
Simple script to start the ecommerce monolith application
"""

import os
import sys

def check_dependencies():
    """Check if all required dependencies are installed"""
    required_packages = [
        'flask',
        'flask_cors',
        'jsonschema',
        'requests'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    
    if missing:
        print("ERROR: Missing required packages:")
        for package in missing:
            print(f"  - {package}")
        print("\nPlease install dependencies with:")
        print("  pip install -r requirements.txt")
        return False
    
    return True

def main():
    """Main entry point"""
    print("="*60)
    print("Ecommerce Monolith Application")
    print("="*60)
    
    # Check dependencies
    print("\nChecking dependencies...")
    if not check_dependencies():
        sys.exit(1)
    print("All dependencies found!")
    
    # Check if database exists
    db_exists = os.path.exists('ecommerce.db')
    if db_exists:
        print("\nDatabase file found: ecommerce.db")
    else:
        print("\nDatabase file not found. Will be created on first run.")
    
    # Import and run app
    print("\nStarting application on http://localhost:5000")
    print("Press CTRL+C to stop the server\n")
    print("="*60)
    
    try:
        from app import app
        app.run(host='0.0.0.0', port=5000, debug=True)
    except KeyboardInterrupt:
        print("\n\nServer stopped by user")
    except Exception as e:
        print(f"\nERROR: Failed to start application: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

