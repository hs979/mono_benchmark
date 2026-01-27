"""
DynamoDB data storage layer
Provides database operations using AWS DynamoDB
"""
import uuid
import os
from datetime import datetime
from typing import Dict, List, Optional
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Key, Attr


class DataStorage:
    """DynamoDB data storage for flights, bookings, and loyalty points"""
    
    def __init__(self):
        # Get AWS configuration from environment variables
        aws_region = os.environ.get('AWS_REGION', 'us-east-1')
        
        # Initialize DynamoDB client
        # If AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set in environment,
        # boto3 will automatically use them. Otherwise, it will use IAM role or default credentials.
        self.dynamodb = boto3.resource('dynamodb', region_name=aws_region)
        
        # Get table names from environment or use defaults
        stage = os.environ.get('STAGE', 'dev')
        self.flight_table_name = os.environ.get('FLIGHT_TABLE_NAME', f'Airline-Flight-{stage}')
        self.booking_table_name = os.environ.get('BOOKING_TABLE_NAME', f'Airline-Booking-{stage}')
        self.loyalty_table_name = os.environ.get('LOYALTY_TABLE_NAME', f'Airline-Loyalty-{stage}')
        
        # Get table references
        self.flight_table = self.dynamodb.Table(self.flight_table_name)
        self.booking_table = self.dynamodb.Table(self.booking_table_name)
        self.loyalty_table = self.dynamodb.Table(self.loyalty_table_name)
        
        # Initialize sample data
        self._init_sample_data()
    
    def _python_obj_to_dynamodb(self, obj):
        """Convert Python objects to DynamoDB compatible format (float to Decimal)"""
        if isinstance(obj, float):
            return Decimal(str(obj))
        elif isinstance(obj, dict):
            return {k: self._python_obj_to_dynamodb(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._python_obj_to_dynamodb(item) for item in obj]
        return obj
    
    def _dynamodb_to_python_obj(self, obj):
        """Convert DynamoDB objects to Python format (Decimal to int/float)"""
        if isinstance(obj, Decimal):
            # Convert to int if it's a whole number, otherwise float
            if obj % 1 == 0:
                return int(obj)
            return float(obj)
        elif isinstance(obj, dict):
            return {k: self._dynamodb_to_python_obj(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._dynamodb_to_python_obj(item) for item in obj]
        return obj
    
    def _init_sample_data(self):
        """Initialize with sample flight data if table is empty"""
        try:
            # Check if flights already exist
            response = self.flight_table.scan(Limit=1)
            if response.get('Items'):
                # Data already exists, skip initialization
                return
            
            sample_flights = [
                {
                    'id': 'FL001',
                    'departureDate': '2025-11-10',
                    'departureAirportCode': 'LAX',
                    'departureAirportName': 'Los Angeles International',
                    'departureCity': 'Los Angeles',
                    'departureLocale': 'America/Los_Angeles',
                    'arrivalDate': '2025-11-10',
                    'arrivalAirportCode': 'SFO',
                    'arrivalAirportName': 'San Francisco International',
                    'arrivalCity': 'San Francisco',
                    'arrivalLocale': 'America/Los_Angeles',
                    'ticketPrice': 150,
                    'ticketCurrency': 'USD',
                    'flightNumber': 1001,
                    'seatCapacity': 100,
                    'maximumSeating': 100
                },
                {
                    'id': 'FL002',
                    'departureDate': '2025-11-12',
                    'departureAirportCode': 'JFK',
                    'departureAirportName': 'John F Kennedy International',
                    'departureCity': 'New York',
                    'departureLocale': 'America/New_York',
                    'arrivalDate': '2025-11-12',
                    'arrivalAirportCode': 'LAX',
                    'arrivalAirportName': 'Los Angeles International',
                    'arrivalCity': 'Los Angeles',
                    'arrivalLocale': 'America/Los_Angeles',
                    'ticketPrice': 300,
                    'ticketCurrency': 'USD',
                    'flightNumber': 2002,
                    'seatCapacity': 150,
                    'maximumSeating': 150
                }
            ]
            
            # Insert sample flights
            for flight in sample_flights:
                flight_item = self._python_obj_to_dynamodb(flight)
                self.flight_table.put_item(Item=flight_item)
                
        except Exception as e:
            print(f"Warning: Could not initialize sample data: {str(e)}")
    
    # Flight operations
    def get_flight(self, flight_id: str) -> Optional[dict]:
        """Get flight by ID"""
        try:
            response = self.flight_table.get_item(Key={'id': flight_id})
            if 'Item' in response:
                return self._dynamodb_to_python_obj(response['Item'])
            return None
        except Exception as e:
            print(f"Error getting flight {flight_id}: {str(e)}")
            return None
    
    def get_flights_by_schedule(self, departure_code: str, arrival_code: str, 
                                departure_date: str) -> List[dict]:
        """Get flights matching schedule criteria"""
        try:
            # Use scan with filter expression (for small datasets)
            # For production, consider using GSI (Global Secondary Index)
            response = self.flight_table.scan(
                FilterExpression=Attr('departureAirportCode').eq(departure_code) &
                                Attr('arrivalAirportCode').eq(arrival_code) &
                                Attr('departureDate').eq(departure_date)
            )
            
            items = response.get('Items', [])
            return [self._dynamodb_to_python_obj(item) for item in items]
        except Exception as e:
            print(f"Error searching flights: {str(e)}")
            return []
    
    def reserve_flight_seat(self, flight_id: str) -> bool:
        """Decrease available seat capacity"""
        try:
            # Use atomic counter decrement with condition
            response = self.flight_table.update_item(
                Key={'id': flight_id},
                UpdateExpression='SET seatCapacity = seatCapacity - :dec',
                ConditionExpression='seatCapacity > :zero AND attribute_exists(id)',
                ExpressionAttributeValues={
                    ':dec': 1,
                    ':zero': 0
                },
                ReturnValues='UPDATED_NEW'
            )
            return True
        except self.dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
            raise ValueError(f"Flight {flight_id} is fully booked or does not exist")
        except Exception as e:
            raise ValueError(f"Failed to reserve seat: {str(e)}")
    
    def release_flight_seat(self, flight_id: str) -> bool:
        """Increase available seat capacity"""
        try:
            # First get the flight to check maximum capacity
            flight = self.get_flight(flight_id)
            if not flight:
                raise ValueError(f"Flight {flight_id} does not exist")
            
            # Use atomic counter increment with condition
            response = self.flight_table.update_item(
                Key={'id': flight_id},
                UpdateExpression='SET seatCapacity = seatCapacity + :inc',
                ConditionExpression='seatCapacity < :max',
                ExpressionAttributeValues={
                    ':inc': 1,
                    ':max': flight['maximumSeating']
                },
                ReturnValues='UPDATED_NEW'
            )
            return True
        except self.dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
            raise ValueError(f"Cannot release seat, already at maximum capacity")
        except Exception as e:
            raise ValueError(f"Failed to release seat: {str(e)}")
    
    # Booking operations
    def create_booking(self, booking_data: dict) -> dict:
        """Create a new booking"""
        booking_id = str(uuid.uuid4())
        booking = {
            'id': booking_id,
            'stateExecutionId': booking_data.get('stateExecutionId', ''),
            '__typename': 'Booking',
            'bookingOutboundFlightId': booking_data['outboundFlightId'],
            'checkedIn': False,
            'customer': booking_data['customerId'],
            'paymentToken': booking_data['chargeId'],
            'status': 'UNCONFIRMED',
            'createdAt': datetime.now().isoformat(),
            'bookingReference': None
        }
        
        try:
            booking_item = self._python_obj_to_dynamodb(booking)
            self.booking_table.put_item(Item=booking_item)
            return self._dynamodb_to_python_obj(booking)
        except Exception as e:
            raise ValueError(f"Failed to create booking: {str(e)}")
    
    def get_booking(self, booking_id: str) -> Optional[dict]:
        """Get booking by ID"""
        try:
            response = self.booking_table.get_item(Key={'id': booking_id})
            if 'Item' in response:
                return self._dynamodb_to_python_obj(response['Item'])
            return None
        except Exception as e:
            print(f"Error getting booking {booking_id}: {str(e)}")
            return None
    
    def update_booking_status(self, booking_id: str, status: str, 
                             booking_reference: Optional[str] = None) -> dict:
        """Update booking status"""
        try:
            update_expr = 'SET #status = :status'
            expr_attr_names = {'#status': 'status'}
            expr_attr_values = {':status': status}
            
            if booking_reference:
                update_expr += ', bookingReference = :ref'
                expr_attr_values[':ref'] = booking_reference
            
            response = self.booking_table.update_item(
                Key={'id': booking_id},
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_attr_names,
                ExpressionAttributeValues=expr_attr_values,
                ConditionExpression='attribute_exists(id)',
                ReturnValues='ALL_NEW'
            )
            
            return self._dynamodb_to_python_obj(response['Attributes'])
        except self.dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
            raise ValueError(f"Booking {booking_id} not found")
        except Exception as e:
            raise ValueError(f"Failed to update booking: {str(e)}")
    
    def get_bookings_by_customer(self, customer_id: str, status: Optional[str] = None) -> List[dict]:
        """Get bookings for a customer, optionally filtered by status"""
        try:
            # Use scan with filter (for small datasets)
            # For production, consider using GSI on customer field
            filter_expr = Attr('customer').eq(customer_id)
            if status:
                filter_expr = filter_expr & Attr('status').eq(status)
            
            response = self.booking_table.scan(FilterExpression=filter_expr)
            
            items = response.get('Items', [])
            return [self._dynamodb_to_python_obj(item) for item in items]
        except Exception as e:
            print(f"Error getting bookings for customer {customer_id}: {str(e)}")
            return []
    
    # Loyalty operations
    def add_loyalty_points(self, customer_id: str, points: int) -> dict:
        """Add loyalty points for a customer"""
        loyalty_id = str(uuid.uuid4())
        loyalty_entry = {
            'id': loyalty_id,
            'customerId': customer_id,
            'points': points,
            'flag': 'active',
            'date': datetime.now().isoformat()
        }
        
        try:
            loyalty_item = self._python_obj_to_dynamodb(loyalty_entry)
            self.loyalty_table.put_item(Item=loyalty_item)
            return self._dynamodb_to_python_obj(loyalty_entry)
        except Exception as e:
            raise ValueError(f"Failed to add loyalty points: {str(e)}")
    
    def get_loyalty_points(self, customer_id: str) -> int:
        """Get total active loyalty points for a customer"""
        try:
            # Use scan with filter
            # For production, use GSI on customerId-flag
            response = self.loyalty_table.scan(
                FilterExpression=Attr('customerId').eq(customer_id) &
                                Attr('flag').eq('active')
            )
            
            items = response.get('Items', [])
            total = 0
            for item in items:
                points = item.get('points', 0)
                if isinstance(points, Decimal):
                    total += int(points)
                else:
                    total += int(points)
            
            return total
        except Exception as e:
            print(f"Error getting loyalty points for {customer_id}: {str(e)}")
            return 0
    
    def get_loyalty_level(self, points: int) -> str:
        """Calculate loyalty level based on points"""
        if points >= 100000:
            return 'gold'
        elif points >= 50000:
            return 'silver'
        else:
            return 'bronze'
    
    def get_remaining_points_to_next_tier(self, points: int, level: str) -> int:
        """Calculate points needed for next tier"""
        if level == 'bronze':
            return 50000 - points
        elif level == 'silver':
            return 100000 - points
        else:
            return 0


# Global storage instance
storage = DataStorage()
