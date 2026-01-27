"""
Booking Service
Handles booking reservation, confirmation, and cancellation
"""
import secrets
from typing import List, Optional
from data.storage import storage


class BookingService:
    """Service for managing booking operations"""
    
    @staticmethod
    def validate_booking_request(booking_data: dict) -> bool:
        """Validate booking request has required fields"""
        required_fields = ['outboundFlightId', 'customerId', 'chargeId']
        return all(field in booking_data for field in required_fields)
    
    @staticmethod
    def reserve_booking(booking_data: dict) -> str:
        """
        Create a new booking with UNCONFIRMED status
        
        Args:
            booking_data: Dictionary containing:
                - outboundFlightId: Flight ID
                - customerId: Customer ID
                - chargeId: Payment authorization token
                - name: Optional execution name/ID
                
        Returns:
            booking_id: The newly created booking ID
            
        Raises:
            ValueError: If booking data is invalid
        """
        if not BookingService.validate_booking_request(booking_data):
            raise ValueError("Invalid booking request: missing required fields")
        
        booking = storage.create_booking(booking_data)
        return booking['id']
    
    @staticmethod
    def confirm_booking(booking_id: str) -> str:
        """
        Confirm a booking and generate booking reference
        
        Args:
            booking_id: Booking identifier
            
        Returns:
            booking_reference: Generated booking reference code
            
        Raises:
            ValueError: If booking not found
        """
        booking = storage.get_booking(booking_id)
        if not booking:
            raise ValueError(f"Invalid booking ID: {booking_id}")
        
        # Generate a booking reference
        reference = secrets.token_urlsafe(4)
        
        # Update booking status to CONFIRMED
        storage.update_booking_status(booking_id, 'CONFIRMED', reference)
        
        return reference
    
    @staticmethod
    def cancel_booking(booking_id: str) -> bool:
        """
        Cancel a booking
        
        Args:
            booking_id: Booking identifier
            
        Returns:
            True if successful
            
        Raises:
            ValueError: If booking not found
        """
        booking = storage.get_booking(booking_id)
        if not booking:
            raise ValueError(f"Invalid booking ID: {booking_id}")
        
        # Update booking status to CANCELLED
        storage.update_booking_status(booking_id, 'CANCELLED')
        
        return True
    
    @staticmethod
    def get_booking(booking_id: str) -> dict:
        """
        Get booking details
        
        Args:
            booking_id: Booking identifier
            
        Returns:
            Booking details
            
        Raises:
            ValueError: If booking not found
        """
        booking = storage.get_booking(booking_id)
        if not booking:
            raise ValueError(f"Booking {booking_id} not found")
        return booking
    
    @staticmethod
    def get_customer_bookings(customer_id: str, status: Optional[str] = None) -> List[dict]:
        """
        Get all bookings for a customer, optionally filtered by status
        
        Args:
            customer_id: Customer identifier
            status: Optional status filter (UNCONFIRMED, CONFIRMED, CANCELLED)
            
        Returns:
            List of bookings
        """
        return storage.get_bookings_by_customer(customer_id, status)
    
    @staticmethod
    def notify_booking(customer_id: str, price: float, booking_reference: Optional[str] = None) -> dict:
        """
        Simulate booking notification
        
        Args:
            customer_id: Customer identifier
            price: Booking price
            booking_reference: Booking reference (if confirmed)
            
        Returns:
            Notification details
        """
        booking_status = 'confirmed' if booking_reference else 'cancelled'
        reference_text = booking_reference or 'most recent booking'
        
        notification = {
            'notificationId': secrets.token_urlsafe(16),
            'customerId': customer_id,
            'price': price,
            'status': booking_status,
            'subject': f"Booking {booking_status} for {reference_text}"
        }
        
        return notification

