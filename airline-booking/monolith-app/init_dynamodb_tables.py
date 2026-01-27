"""
DynamoDB Table Initialization Script
Creates all required DynamoDB tables for the airline booking application
"""
import boto3
import os
import sys


def create_tables(region='us-east-1', stage='dev'):
    """
    Create all DynamoDB tables required for the application
    
    Args:
        region: AWS region
        stage: Environment stage (dev, prod, etc.)
    """
    dynamodb = boto3.client('dynamodb', region_name=region)
    
    # Table names
    flight_table = f'Airline-Flight-{stage}'
    booking_table = f'Airline-Booking-{stage}'
    loyalty_table = f'Airline-Loyalty-{stage}'
    users_table = f'Airline-Users-{stage}'
    
    tables_to_create = []
    
    # Check which tables already exist
    try:
        existing_tables = dynamodb.list_tables()['TableNames']
        print(f"Existing tables: {existing_tables}")
    except Exception as e:
        print(f"Error listing tables: {str(e)}")
        existing_tables = []
    
    # 1. Flight Table
    if flight_table not in existing_tables:
        tables_to_create.append({
            'name': flight_table,
            'config': {
                'TableName': flight_table,
                'KeySchema': [
                    {'AttributeName': 'id', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'id', 'AttributeType': 'S'}
                ],
                'BillingMode': 'PAY_PER_REQUEST',
                'Tags': [
                    {'Key': 'Application', 'Value': 'AirlineBooking'},
                    {'Key': 'Stage', 'Value': stage}
                ]
            }
        })
    
    # 2. Booking Table
    if booking_table not in existing_tables:
        tables_to_create.append({
            'name': booking_table,
            'config': {
                'TableName': booking_table,
                'KeySchema': [
                    {'AttributeName': 'id', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'id', 'AttributeType': 'S'},
                    {'AttributeName': 'customer', 'AttributeType': 'S'}
                ],
                'GlobalSecondaryIndexes': [
                    {
                        'IndexName': 'customer-index',
                        'KeySchema': [
                            {'AttributeName': 'customer', 'KeyType': 'HASH'}
                        ],
                        'Projection': {'ProjectionType': 'ALL'}
                    }
                ],
                'BillingMode': 'PAY_PER_REQUEST',
                'Tags': [
                    {'Key': 'Application', 'Value': 'AirlineBooking'},
                    {'Key': 'Stage', 'Value': stage}
                ]
            }
        })
    
    # 3. Loyalty Table
    if loyalty_table not in existing_tables:
        tables_to_create.append({
            'name': loyalty_table,
            'config': {
                'TableName': loyalty_table,
                'KeySchema': [
                    {'AttributeName': 'id', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'id', 'AttributeType': 'S'},
                    {'AttributeName': 'customerId', 'AttributeType': 'S'},
                    {'AttributeName': 'flag', 'AttributeType': 'S'}
                ],
                'GlobalSecondaryIndexes': [
                    {
                        'IndexName': 'customer-flag-index',
                        'KeySchema': [
                            {'AttributeName': 'customerId', 'KeyType': 'HASH'},
                            {'AttributeName': 'flag', 'KeyType': 'RANGE'}
                        ],
                        'Projection': {'ProjectionType': 'ALL'}
                    }
                ],
                'BillingMode': 'PAY_PER_REQUEST',
                'Tags': [
                    {'Key': 'Application', 'Value': 'AirlineBooking'},
                    {'Key': 'Stage', 'Value': stage}
                ]
            }
        })
    
    # 4. Users Table (for JWT authentication)
    if users_table not in existing_tables:
        tables_to_create.append({
            'name': users_table,
            'config': {
                'TableName': users_table,
                'KeySchema': [
                    {'AttributeName': 'sub', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'sub', 'AttributeType': 'S'}
                ],
                'BillingMode': 'PAY_PER_REQUEST',
                'Tags': [
                    {'Key': 'Application', 'Value': 'AirlineBooking'},
                    {'Key': 'Stage', 'Value': stage}
                ]
            }
        })
    
    # Create tables
    if not tables_to_create:
        print("\nAll tables already exist. No tables to create.")
        return
    
    print(f"\nCreating {len(tables_to_create)} table(s)...")
    
    for table_info in tables_to_create:
        table_name = table_info['name']
        table_config = table_info['config']
        
        try:
            print(f"\nCreating table: {table_name}")
            response = dynamodb.create_table(**table_config)
            print(f"✓ Table {table_name} created successfully")
            print(f"  Status: {response['TableDescription']['TableStatus']}")
        except Exception as e:
            print(f"✗ Error creating table {table_name}: {str(e)}")
    
    print("\n" + "="*60)
    print("Table creation initiated!")
    print("="*60)
    print("\nNote: Tables are being created in the background.")
    print("It may take a few moments for them to become ACTIVE.")
    print("\nYou can check the status with:")
    print(f"  aws dynamodb describe-table --table-name <table-name> --region {region}")
    print("\nEnvironment variables to set:")
    print(f"  export AWS_REGION={region}")
    print(f"  export STAGE={stage}")
    print(f"  export FLIGHT_TABLE_NAME={flight_table}")
    print(f"  export BOOKING_TABLE_NAME={booking_table}")
    print(f"  export LOYALTY_TABLE_NAME={loyalty_table}")
    print(f"  export USERS_TABLE_NAME={users_table}")


def delete_tables(region='us-east-1', stage='dev'):
    """
    Delete all DynamoDB tables (use with caution!)
    
    Args:
        region: AWS region
        stage: Environment stage
    """
    dynamodb = boto3.client('dynamodb', region_name=region)
    
    table_names = [
        f'Airline-Flight-{stage}',
        f'Airline-Booking-{stage}',
        f'Airline-Loyalty-{stage}',
        f'Airline-Users-{stage}'
    ]
    
    print("\n" + "="*60)
    print("WARNING: This will DELETE all tables!")
    print("="*60)
    print(f"\nTables to delete in region {region}:")
    for name in table_names:
        print(f"  - {name}")
    
    confirm = input("\nType 'DELETE' to confirm: ")
    if confirm != 'DELETE':
        print("Deletion cancelled.")
        return
    
    for table_name in table_names:
        try:
            print(f"\nDeleting table: {table_name}")
            dynamodb.delete_table(TableName=table_name)
            print(f"✓ Table {table_name} deleted")
        except dynamodb.exceptions.ResourceNotFoundException:
            print(f"  Table {table_name} does not exist")
        except Exception as e:
            print(f"✗ Error deleting table {table_name}: {str(e)}")
    
    print("\nDeletion complete.")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Manage DynamoDB tables for Airline Booking App')
    parser.add_argument('--region', default='us-east-1', help='AWS region (default: us-east-1)')
    parser.add_argument('--stage', default='dev', help='Environment stage (default: dev)')
    parser.add_argument('--delete', action='store_true', help='Delete tables instead of creating')
    
    args = parser.parse_args()
    
    print("="*60)
    print("Airline Booking - DynamoDB Table Management")
    print("="*60)
    print(f"Region: {args.region}")
    print(f"Stage: {args.stage}")
    
    if args.delete:
        delete_tables(args.region, args.stage)
    else:
        create_tables(args.region, args.stage)

