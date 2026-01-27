"""
Catalog Service
Handles flight search and seat reservation/release operations
"""
from typing import List
from data.storage import storage


class CatalogService:
    """Service for managing flight catalog operations"""
    
    @staticmethod
    def search_flights(departure_code: str, arrival_code: str, departure_date: str) -> List[dict]:
        """
        Search for flights by schedule
        
        Args:
            departure_code: Departure airport code
            arrival_code: Arrival airport code
            departure_date: Departure date (YYYY-MM-DD)
            
        Returns:
            List of matching flights
        """
        flights = storage.get_flights_by_schedule(
            departure_code, arrival_code, departure_date
        )
        return flights
    
    @staticmethod
    def get_flight(flight_id: str) -> dict:
        """
        Get flight details by ID
        
        Args:
            flight_id: Flight identifier
            
        Returns:
            Flight details
            
        Raises:
            ValueError: If flight not found
        """
        flight = storage.get_flight(flight_id)
        if not flight:
            raise ValueError(f"Flight with ID {flight_id} not found")
        return flight
    
    @staticmethod
    def reserve_flight_seat(flight_id: str) -> dict:
        """
        Reserve a seat on a flight (decrease seat capacity)
        
        Args:
            flight_id: Flight identifier
            
        Returns:
            Success status
            
        Raises:
            ValueError: If flight is fully booked or doesn't exist
        """
        try:
            storage.reserve_flight_seat(flight_id)
            return {'status': 'SUCCESS'}
        except ValueError as e:
            raise ValueError(str(e))
    
    @staticmethod
    def release_flight_seat(flight_id: str) -> dict:
        """
        Release a seat on a flight (increase seat capacity)
        
        Args:
            flight_id: Flight identifier
            
        Returns:
            Success status
            
        Raises:
            ValueError: If flight doesn't exist or at maximum capacity
        """
        try:
            storage.release_flight_seat(flight_id)
            return {'status': 'SUCCESS'}
        except ValueError as e:
            raise ValueError(str(e))

