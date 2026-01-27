"""
Payment Service
Handles payment collection and refund operations using Stripe
"""
import os
import secrets
from typing import Dict

try:
    import stripe
    STRIPE_AVAILABLE = True
except ImportError:
    STRIPE_AVAILABLE = False
    print("Warning: stripe library not installed. Payment service will run in simulation mode.")


class PaymentService:
    """Service for managing payment operations"""
    
    # Simulated payment storage (used in simulation mode)
    _payments: Dict[str, dict] = {}
    _refunds: Dict[str, dict] = {}
    
    # Stripe configuration
    _stripe_configured = False
    
    @staticmethod
    def _configure_stripe():
        """Configure Stripe API with secret key from environment"""
        if PaymentService._stripe_configured:
            return
        
        if not STRIPE_AVAILABLE:
            print("Stripe library not available - running in simulation mode")
            return
        
        stripe_secret_key = os.environ.get('STRIPE_SECRET_KEY')
        
        if stripe_secret_key:
            stripe.api_key = stripe_secret_key
            PaymentService._stripe_configured = True
            print("Stripe payment gateway configured successfully")
        else:
            print("STRIPE_SECRET_KEY not found in environment - running in simulation mode")
    
    @staticmethod
    def _is_using_real_stripe() -> bool:
        """Check if real Stripe integration is available and configured"""
        PaymentService._configure_stripe()
        return STRIPE_AVAILABLE and PaymentService._stripe_configured
    
    @staticmethod
    def collect_payment(charge_id: str) -> dict:
        """
        Collect payment from a pre-authorized charge
        
        In production mode (when STRIPE_SECRET_KEY is set):
        - Captures a payment intent or charge using Stripe API
        
        In simulation mode (when STRIPE_SECRET_KEY is not set):
        - Simulates payment collection for testing
        
        Args:
            charge_id: Pre-authorization charge ID or payment intent ID
            
        Returns:
            Dictionary containing:
                - receiptUrl: Receipt URL
                - price: Amount collected (in cents for Stripe, or base unit)
                
        Raises:
            ValueError: If charge ID is invalid or payment fails
        """
        if not charge_id:
            raise ValueError("Invalid Charge ID")
        
        # Real Stripe implementation
        if PaymentService._is_using_real_stripe():
            try:
                # Check if this is a PaymentIntent or a Charge ID
                if charge_id.startswith('pi_'):
                    # This is a PaymentIntent - capture it
                    payment_intent = stripe.PaymentIntent.capture(charge_id)
                    
                    payment_record = {
                        'chargeId': charge_id,
                        'receiptUrl': f"https://dashboard.stripe.com/payments/{payment_intent.id}",
                        'price': payment_intent.amount,  # Amount in cents
                        'status': payment_intent.status,
                        'currency': payment_intent.currency
                    }
                    
                    PaymentService._payments[charge_id] = payment_record
                    
                    return {
                        'receiptUrl': payment_record['receiptUrl'],
                        'price': payment_record['price'] / 100  # Convert cents to dollars
                    }
                    
                elif charge_id.startswith('ch_'):
                    # This is a Charge ID - capture it
                    charge = stripe.Charge.capture(charge_id)
                    
                    payment_record = {
                        'chargeId': charge_id,
                        'receiptUrl': charge.receipt_url or f"https://dashboard.stripe.com/payments/{charge.id}",
                        'price': charge.amount,  # Amount in cents
                        'status': charge.status,
                        'currency': charge.currency
                    }
                    
                    PaymentService._payments[charge_id] = payment_record
                    
                    return {
                        'receiptUrl': payment_record['receiptUrl'],
                        'price': payment_record['price'] / 100  # Convert cents to dollars
                    }
                else:
                    # Assume it's a test token or other ID - try to create a charge
                    # This is for backward compatibility with test scenarios
                    charge = stripe.Charge.create(
                        amount=15000,  # $150.00 in cents
                        currency='usd',
                        source=charge_id,
                        description='Airline booking payment'
                    )
                    
                    payment_record = {
                        'chargeId': charge.id,
                        'receiptUrl': charge.receipt_url or f"https://dashboard.stripe.com/payments/{charge.id}",
                        'price': charge.amount,
                        'status': charge.status,
                        'currency': charge.currency
                    }
                    
                    PaymentService._payments[charge.id] = payment_record
                    
                    return {
                        'receiptUrl': payment_record['receiptUrl'],
                        'price': payment_record['price'] / 100
                    }
                    
            except stripe.error.CardError as e:
                # Card was declined
                raise ValueError(f"Card declined: {e.user_message}")
            except stripe.error.InvalidRequestError as e:
                # Invalid parameters
                raise ValueError(f"Invalid payment request: {str(e)}")
            except stripe.error.AuthenticationError as e:
                # Authentication with Stripe failed
                raise ValueError(f"Stripe authentication failed: {str(e)}")
            except stripe.error.APIConnectionError as e:
                # Network communication failed
                raise ValueError(f"Network error: {str(e)}")
            except stripe.error.StripeError as e:
                # Generic Stripe error
                raise ValueError(f"Payment error: {str(e)}")
            except Exception as e:
                raise ValueError(f"Unexpected payment error: {str(e)}")
        
        # Simulation mode
        else:
            print(f"[SIMULATION] Collecting payment for charge: {charge_id}")
            
            # Simulate payment collection
            receipt_url = f"https://payment.example.com/receipts/{charge_id}"
            price = 150  # Simulated price
            
            payment_record = {
                'chargeId': charge_id,
                'receiptUrl': receipt_url,
                'price': price,
                'status': 'captured',
                'mode': 'simulation'
            }
            
            PaymentService._payments[charge_id] = payment_record
            
            return {
                'receiptUrl': receipt_url,
                'price': price
            }
    
    @staticmethod
    def refund_payment(charge_id: str) -> dict:
        """
        Refund a payment from a given charge ID
        
        In production mode (when STRIPE_SECRET_KEY is set):
        - Creates a refund using Stripe API
        
        In simulation mode (when STRIPE_SECRET_KEY is not set):
        - Simulates refund for testing
        
        Args:
            charge_id: Pre-authorization charge ID or payment intent ID
            
        Returns:
            Dictionary containing refund ID
            
        Raises:
            ValueError: If charge ID is invalid or refund fails
        """
        if not charge_id:
            raise ValueError("Invalid Charge ID")
        
        # Real Stripe implementation
        if PaymentService._is_using_real_stripe():
            try:
                # Check if this is a PaymentIntent or a Charge ID
                if charge_id.startswith('pi_'):
                    # Get the PaymentIntent to find the charge
                    payment_intent = stripe.PaymentIntent.retrieve(charge_id)
                    
                    # Get the latest charge from the payment intent
                    if payment_intent.latest_charge:
                        charge_id_to_refund = payment_intent.latest_charge
                    else:
                        raise ValueError(f"No charge found for payment intent: {charge_id}")
                else:
                    charge_id_to_refund = charge_id
                
                # Create the refund
                refund = stripe.Refund.create(charge=charge_id_to_refund)
                
                refund_record = {
                    'refundId': refund.id,
                    'chargeId': charge_id_to_refund,
                    'amount': refund.amount,
                    'status': refund.status,
                    'currency': refund.currency
                }
                
                PaymentService._refunds[refund.id] = refund_record
                
                # Update payment status if exists
                if charge_id in PaymentService._payments:
                    PaymentService._payments[charge_id]['status'] = 'refunded'
                
                return {
                    'refundId': refund.id
                }
                
            except stripe.error.InvalidRequestError as e:
                # Invalid parameters or charge not found
                raise ValueError(f"Invalid refund request: {str(e)}")
            except stripe.error.AuthenticationError as e:
                # Authentication with Stripe failed
                raise ValueError(f"Stripe authentication failed: {str(e)}")
            except stripe.error.APIConnectionError as e:
                # Network communication failed
                raise ValueError(f"Network error: {str(e)}")
            except stripe.error.StripeError as e:
                # Generic Stripe error
                raise ValueError(f"Refund error: {str(e)}")
            except Exception as e:
                raise ValueError(f"Unexpected refund error: {str(e)}")
        
        # Simulation mode
        else:
            print(f"[SIMULATION] Refunding payment for charge: {charge_id}")
            
            # Simulate refund processing
            refund_id = secrets.token_urlsafe(16)
            
            refund_record = {
                'refundId': refund_id,
                'chargeId': charge_id,
                'status': 'refunded',
                'mode': 'simulation'
            }
            
            PaymentService._refunds[refund_id] = refund_record
            
            # Update payment status if exists
            if charge_id in PaymentService._payments:
                PaymentService._payments[charge_id]['status'] = 'refunded'
            
            return {
                'refundId': refund_id
            }
    
    @staticmethod
    def get_payment(charge_id: str) -> dict:
        """
        Get payment details
        
        Args:
            charge_id: Charge identifier
            
        Returns:
            Payment details
            
        Raises:
            ValueError: If payment not found
        """
        # Try to get from local cache first
        payment = PaymentService._payments.get(charge_id)
        if payment:
            return payment
        
        # If using real Stripe, try to retrieve from Stripe API
        if PaymentService._is_using_real_stripe():
            try:
                if charge_id.startswith('pi_'):
                    payment_intent = stripe.PaymentIntent.retrieve(charge_id)
                    return {
                        'chargeId': payment_intent.id,
                        'amount': payment_intent.amount,
                        'status': payment_intent.status,
                        'currency': payment_intent.currency
                    }
                elif charge_id.startswith('ch_'):
                    charge = stripe.Charge.retrieve(charge_id)
                    return {
                        'chargeId': charge.id,
                        'amount': charge.amount,
                        'status': charge.status,
                        'currency': charge.currency,
                        'receiptUrl': charge.receipt_url
                    }
            except stripe.error.StripeError:
                pass
        
        raise ValueError(f"Payment {charge_id} not found")
