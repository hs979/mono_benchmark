"""
Loyalty Service
Handles customer loyalty points and tier management
"""
from data.storage import storage


class LoyaltyService:
    """Service for managing loyalty points and tiers"""
    
    # Loyalty tier thresholds
    TIER_GOLD = 100000
    TIER_SILVER = 50000
    TIER_BRONZE = 1
    
    @staticmethod
    def get_customer_loyalty(customer_id: str) -> dict:
        """
        Get loyalty information for a customer
        
        Args:
            customer_id: Customer identifier
            
        Returns:
            Dictionary containing:
                - points: Total loyalty points
                - level: Current tier (bronze, silver, gold)
                - remainingPoints: Points needed for next tier
        """
        total_points = storage.get_loyalty_points(customer_id)
        level = storage.get_loyalty_level(total_points)
        remaining_points = storage.get_remaining_points_to_next_tier(total_points, level)
        
        return {
            'points': total_points,
            'level': level,
            'remainingPoints': remaining_points
        }
    
    @staticmethod
    def add_loyalty_points(customer_id: str, points: int) -> dict:
        """
        Add loyalty points for a customer
        
        Args:
            customer_id: Customer identifier
            points: Number of points to add
            
        Returns:
            Success message
            
        Raises:
            ValueError: If points is invalid
        """
        if not isinstance(points, (int, float)) or points <= 0:
            raise ValueError("Points must be a positive number")
        
        storage.add_loyalty_points(customer_id, int(points))
        
        return {
            'message': 'Loyalty points added successfully',
            'customerId': customer_id,
            'pointsAdded': int(points)
        }
    
    @staticmethod
    def process_booking_loyalty(customer_id: str, price: float) -> dict:
        """
        Process loyalty points from a booking
        This is called when a booking is confirmed
        
        Args:
            customer_id: Customer identifier
            price: Booking price (converted to points)
            
        Returns:
            Result of adding loyalty points
        """
        # Convert price to points (1:1 ratio in this implementation)
        points = int(price)
        return LoyaltyService.add_loyalty_points(customer_id, points)

