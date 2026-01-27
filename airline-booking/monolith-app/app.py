"""
Airline Booking Monolithic Application
A traditional web application combining all booking services
"""
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.catalog import CatalogService
from services.booking import BookingService
from services.payment import PaymentService
from services.loyalty import LoyaltyService
from services.auth import AuthService, login_required, admin_required, owner_or_admin_required, booking_owner_or_admin_required
from data.storage import storage

# Configure Flask with static file serving
app = Flask(__name__, 
            static_folder='frontend/dist',
            static_url_path='')

# Enable CORS for development
CORS(app)


# Error handler
@app.errorhandler(Exception)
def handle_error(error):
    """Global error handler"""
    return jsonify({
        'error': str(error),
        'type': type(error).__name__
    }), 400 if isinstance(error, ValueError) else 500


# Catalog endpoints
@app.route('/flights/search', methods=['GET'])
def search_flights():
    """
    Search for flights
    Query params: departureCode, arrivalCode, departureDate
    """
    departure_code = request.args.get('departureCode')
    arrival_code = request.args.get('arrivalCode')
    departure_date = request.args.get('departureDate')
    
    if not all([departure_code, arrival_code, departure_date]):
        return jsonify({'error': 'Missing required parameters'}), 400
    
    flights = CatalogService.search_flights(departure_code, arrival_code, departure_date)
    return jsonify({'flights': flights})


@app.route('/flights/<flight_id>', methods=['GET'])
def get_flight(flight_id):
    """Get flight details by ID"""
    flight = CatalogService.get_flight(flight_id)
    return jsonify(flight)


@app.route('/flights/<flight_id>/reserve', methods=['POST'])
def reserve_flight_seat(flight_id):
    """Reserve a seat on a flight"""
    result = CatalogService.reserve_flight_seat(flight_id)
    return jsonify(result)


@app.route('/flights/<flight_id>/release', methods=['POST'])
def release_flight_seat(flight_id):
    """Release a seat on a flight"""
    result = CatalogService.release_flight_seat(flight_id)
    return jsonify(result)


# Booking endpoints
@app.route('/bookings', methods=['POST'])
@login_required
def create_booking():
    """
    Create a new booking (requires authentication)
    Request body should contain:
    - outboundFlightId: Flight ID to book
    - chargeId: Payment authorization token
    - name: Optional execution name/ID
    
    Note: customerId is automatically set from authenticated user
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    # Set customerId from authenticated user
    data['customerId'] = request.current_user['sub']
    
    # Variables to track rollback state
    booking_id = None
    payment_result = None
    flight_reserved = False
    
    try:
        # Step 1: Reserve Flight Seat
        # This is an atomic DynamoDB operation (decrement seat capacity)
        try:
            CatalogService.reserve_flight_seat(data['outboundFlightId'])
            flight_reserved = True
        except ValueError as e:
            # No seat available or flight doesn't exist
            # No rollback needed - nothing was changed
            return jsonify({
                'error': f'Flight reservation failed: {str(e)}',
                'step': 'Reserve Flight'
            }), 400
        
        # Step 2: Reserve Booking
        # Create a booking record with UNCONFIRMED status
        try:
            booking_id = BookingService.reserve_booking(data)
        except ValueError as e:
            # Rollback: Release the flight seat
            try:
                CatalogService.release_flight_seat(data['outboundFlightId'])
            except Exception as rollback_error:
                print(f"Error during flight seat release rollback: {rollback_error}")
            
            return jsonify({
                'error': f'Booking reservation failed: {str(e)}',
                'step': 'Reserve Booking'
            }), 400
        
        # Step 3: Collect Payment
        # Charge the customer's payment method
        try:
            payment_result = PaymentService.collect_payment(data['chargeId'])
        except ValueError as e:
            # Rollback: Cancel booking and release flight seat
            try:
                BookingService.cancel_booking(booking_id)
            except Exception as rollback_error:
                print(f"Error during booking cancellation rollback: {rollback_error}")
            
            try:
                CatalogService.release_flight_seat(data['outboundFlightId'])
            except Exception as rollback_error:
                print(f"Error during flight seat release rollback: {rollback_error}")
            
            return jsonify({
                'error': f'Payment failed: {str(e)}',
                'step': 'Collect Payment',
                'bookingId': booking_id
            }), 400
        
        # Step 4: Confirm Booking
        # Update booking status from UNCONFIRMED to CONFIRMED
        try:
            booking_reference = BookingService.confirm_booking(booking_id)
        except Exception as e:
            # CRITICAL: Payment succeeded but confirmation failed
            # Rollback: Refund payment, cancel booking, release flight seat
            print(f"CRITICAL: Booking confirmation failed after payment: {str(e)}")
            
            # Refund the payment
            try:
                PaymentService.refund_payment(data['chargeId'])
            except Exception as rollback_error:
                print(f"CRITICAL: Payment refund failed during rollback: {rollback_error}")
            
            # Cancel the booking
            try:
                BookingService.cancel_booking(booking_id)
            except Exception as rollback_error:
                print(f"Error during booking cancellation rollback: {rollback_error}")
            
            # Release the flight seat
            try:
                CatalogService.release_flight_seat(data['outboundFlightId'])
            except Exception as rollback_error:
                print(f"Error during flight seat release rollback: {rollback_error}")
            
            return jsonify({
                'error': f'Booking confirmation failed: {str(e)}',
                'step': 'Confirm Booking',
                'bookingId': booking_id,
                'message': 'Payment has been refunded'
            }), 500
        
        # Step 5: Add Loyalty Points (optional - should not fail the booking)
        try:
            LoyaltyService.process_booking_loyalty(
                data['customerId'], 
                payment_result['price']
            )
        except Exception as e:
            # Log but don't fail the booking if loyalty points fail
            print(f"Warning: Failed to add loyalty points: {str(e)}")
        
        # Step 6: Send Notification (optional - should not fail the booking)
        try:
            notification = BookingService.notify_booking(
                data['customerId'],
                payment_result['price'],
                booking_reference
            )
        except Exception as e:
            # Log but don't fail the booking if notification fails
            print(f"Warning: Failed to send notification: {str(e)}")
            notification = {'status': 'failed', 'error': str(e)}
        
        # Success! Return the complete booking information
        return jsonify({
            'bookingId': booking_id,
            'bookingReference': booking_reference,
            'status': 'CONFIRMED',
            'payment': payment_result,
            'notification': notification
        }), 201
        
    except Exception as e:
        # Catch-all for any unexpected errors
        # Attempt to rollback everything if we have the necessary information
        print(f"UNEXPECTED ERROR in booking workflow: {str(e)}")
        
        if payment_result:
            # Payment was collected, need to refund
            try:
                PaymentService.refund_payment(data['chargeId'])
            except Exception as rollback_error:
                print(f"Error during payment refund: {rollback_error}")
        
        if booking_id:
            # Booking was created, need to cancel
            try:
                BookingService.cancel_booking(booking_id)
            except Exception as rollback_error:
                print(f"Error during booking cancellation: {rollback_error}")
        
        if flight_reserved:
            # Flight seat was reserved, need to release
            try:
                CatalogService.release_flight_seat(data['outboundFlightId'])
            except Exception as rollback_error:
                print(f"Error during flight seat release: {rollback_error}")
        
        return jsonify({
            'error': f'Unexpected error during booking: {str(e)}',
            'message': 'The booking has been rolled back. Please try again.'
        }), 500


@app.route('/bookings/<booking_id>', methods=['GET'])
@booking_owner_or_admin_required
def get_booking(booking_id):
    """Get booking details (requires authentication, owner or admin only)"""
    booking = BookingService.get_booking(booking_id)
    return jsonify(booking)


@app.route('/bookings/<booking_id>/confirm', methods=['POST'])
@booking_owner_or_admin_required
def confirm_booking(booking_id):
    """Confirm a booking (requires authentication, owner or admin only)"""
    booking_reference = BookingService.confirm_booking(booking_id)
    return jsonify({
        'bookingId': booking_id,
        'bookingReference': booking_reference,
        'status': 'CONFIRMED'
    })


@app.route('/bookings/<booking_id>/cancel', methods=['POST'])
@booking_owner_or_admin_required
def cancel_booking(booking_id):
    """Cancel a booking (requires authentication, owner or admin only)"""
    # Get booking details
    booking = BookingService.get_booking(booking_id)
    
    # Cancel the booking
    BookingService.cancel_booking(booking_id)
    
    # Release the flight seat
    try:
        CatalogService.release_flight_seat(booking['bookingOutboundFlightId'])
    except Exception as e:
        print(f"Warning: Failed to release flight seat: {str(e)}")
    
    # Refund payment
    try:
        refund_result = PaymentService.refund_payment(booking['paymentToken'])
    except Exception as e:
        print(f"Warning: Failed to refund payment: {str(e)}")
        refund_result = {'refundId': 'N/A', 'status': 'failed'}
    
    # Send notification
    notification = BookingService.notify_booking(
        booking['customer'],
        0,
        None
    )
    
    return jsonify({
        'bookingId': booking_id,
        'status': 'CANCELLED',
        'refund': refund_result,
        'notification': notification
    })


@app.route('/customers/<customer_id>/bookings', methods=['GET'])
@owner_or_admin_required
def get_customer_bookings(customer_id):
    """Get all bookings for a customer (requires authentication, owner or admin only)"""
    status = request.args.get('status')
    bookings = BookingService.get_customer_bookings(customer_id, status)
    return jsonify({'bookings': bookings})


# Payment endpoints
@app.route('/payments/collect', methods=['POST'])
def collect_payment():
    """
    Collect payment
    Request body: { "chargeId": "..." }
    """
    data = request.get_json()
    
    if not data or 'chargeId' not in data:
        return jsonify({'error': 'chargeId is required'}), 400
    
    result = PaymentService.collect_payment(data['chargeId'])
    return jsonify(result)


@app.route('/payments/refund', methods=['POST'])
def refund_payment():
    """
    Refund payment
    Request body: { "chargeId": "..." }
    """
    data = request.get_json()
    
    if not data or 'chargeId' not in data:
        return jsonify({'error': 'chargeId is required'}), 400
    
    result = PaymentService.refund_payment(data['chargeId'])
    return jsonify(result)


@app.route('/payments/<charge_id>', methods=['GET'])
def get_payment(charge_id):
    """Get payment details"""
    payment = PaymentService.get_payment(charge_id)
    return jsonify(payment)


# Loyalty endpoints
@app.route('/loyalty/<customer_id>', methods=['GET'])
@owner_or_admin_required
def get_loyalty(customer_id):
    """Get customer loyalty information (requires authentication, owner or admin only)"""
    loyalty = LoyaltyService.get_customer_loyalty(customer_id)
    return jsonify(loyalty)


@app.route('/loyalty/<customer_id>/points', methods=['POST'])
@admin_required
def add_loyalty_points(customer_id):
    """
    Add loyalty points for a customer (Admin only)
    Request body: { "points": 100 }
    """
    data = request.get_json()
    
    if not data or 'points' not in data:
        return jsonify({'error': 'points is required'}), 400
    
    result = LoyaltyService.add_loyalty_points(customer_id, data['points'])
    return jsonify(result)


# Authentication endpoints
@app.route('/auth/register', methods=['POST'])
def register():
    """
    Register a new user
    Request body: { "email": "...", "password": "...", "userId": "..." (optional) }
    """
    data = request.get_json()
    
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'error': 'email and password are required'}), 400
    
    try:
        user = AuthService.register_user(
            data['email'],
            data['password'],
            data.get('userId')
        )
        return jsonify(user), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@app.route('/auth/login', methods=['POST'])
def login():
    """
    Login and get JWT token
    Request body: { "email": "...", "password": "..." }
    """
    data = request.get_json()
    
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'error': 'email and password are required'}), 400
    
    user = AuthService.authenticate_user(data['email'], data['password'])
    
    if not user:
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Create JWT token
    access_token = AuthService.create_access_token(user)
    
    return jsonify({
        'access_token': access_token,
        'token_type': 'Bearer',
        'expires_in': AuthService.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        'user': {
            'sub': user['sub'],
            'email': user['email'],
            'groups': user.get('groups', [])
        }
    })


@app.route('/auth/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current authenticated user info"""
    user = request.current_user
    return jsonify({
        'sub': user['sub'],
        'email': user['email'],
        'groups': user.get('groups', [])
    })


@app.route('/auth/users', methods=['GET'])
@admin_required
def list_users():
    """List all users (Admin only)"""
    users = AuthService.get_all_users()
    return jsonify({'users': users})


# API Information endpoint
@app.route('/api', methods=['GET'])
def api_index():
    """API information"""
    return jsonify({
        'service': 'Airline Booking Application',
        'version': '1.0.0',
        'authentication': {
            'type': 'JWT Bearer Token',
            'header': 'Authorization: Bearer <token>',
            'note': 'Most endpoints require authentication'
        },
        'endpoints': {
            'auth': {
                'register': 'POST /auth/register',
                'login': 'POST /auth/login',
                'me': 'GET /auth/me [Auth Required]',
                'list_users': 'GET /auth/users [Admin Required]'
            },
            'flights': {
                'search': 'GET /flights/search?departureCode=&arrivalCode=&departureDate=',
                'get': 'GET /flights/<flight_id>',
                'reserve': 'POST /flights/<flight_id>/reserve',
                'release': 'POST /flights/<flight_id>/release'
            },
            'bookings': {
                'create': 'POST /bookings [Auth Required]',
                'get': 'GET /bookings/<booking_id> [Owner/Admin Required]',
                'confirm': 'POST /bookings/<booking_id>/confirm [Owner/Admin Required]',
                'cancel': 'POST /bookings/<booking_id>/cancel [Owner/Admin Required]',
                'customer_bookings': 'GET /customers/<customer_id>/bookings [Owner/Admin Required]'
            },
            'payments': {
                'collect': 'POST /payments/collect',
                'refund': 'POST /payments/refund',
                'get': 'GET /payments/<charge_id>'
            },
            'loyalty': {
                'get': 'GET /loyalty/<customer_id> [Owner/Admin Required]',
                'add_points': 'POST /loyalty/<customer_id>/points [Admin Required]'
            }
        },
        'default_users': {
            'regular_user': {'email': 'user@example.com', 'password': 'password123'},
            'admin_user': {'email': 'admin@example.com', 'password': 'admin123'}
        }
    })


# Serve frontend static files
@app.route('/')
def serve_frontend():
    """Serve the frontend application"""
    dist_dir = os.path.join(app.root_path, 'frontend', 'dist')
    if os.path.exists(os.path.join(dist_dir, 'index.html')):
        return send_file(os.path.join(dist_dir, 'index.html'))
    else:
        return jsonify({
            'message': 'Frontend not built yet',
            'instructions': 'Please run: cd frontend && npm install && npm run build'
        })


# Catch-all route for frontend routing (must be last)
@app.route('/<path:path>')
def catch_all(path):
    """Catch-all route to serve frontend routes or static files"""
    dist_dir = os.path.join(app.root_path, 'frontend', 'dist')
    file_path = os.path.join(dist_dir, path)
    
    # If it's a file that exists, serve it
    if os.path.isfile(file_path):
        return send_file(file_path)
    
    # If path starts with 'api/', return 404 for API routes
    if path.startswith('api/'):
        return jsonify({'error': 'API endpoint not found'}), 404
    
    # Otherwise, serve index.html for frontend routing
    if os.path.exists(os.path.join(dist_dir, 'index.html')):
        return send_file(os.path.join(dist_dir, 'index.html'))
    else:
        return jsonify({
            'message': 'Frontend not built yet',
            'instructions': 'Please run: cd frontend && npm install && npm run build'
        })


if __name__ == '__main__':
    print("Starting Airline Booking Application...")
    print("Server running on http://localhost:5000")
    print("Access API documentation at http://localhost:5000/")
    app.run(host='0.0.0.0', port=5000, debug=True)

