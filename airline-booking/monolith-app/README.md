# Airline Booking Monolithic Application

A full-stack monolithic web application for airline booking management. This application includes both a Vue.js frontend and Python Flask backend, with REST APIs for flight search, booking management, payment processing, and customer loyalty programs.

## 🆕 DynamoDB Version Available

This application now supports **AWS DynamoDB** for data persistence! 

- **In-Memory Version** (original): Uses Python dictionaries for data storage - perfect for development and testing
- **DynamoDB Version** (new): Uses AWS DynamoDB tables - production-ready with data persistence

For DynamoDB setup and usage, see **[README_DYNAMODB.md](README_DYNAMODB.md)**

## Features

- **Full-Stack Application**: Vue.js frontend + Flask backend in a single deployable application
- **JWT Authentication**: Secure token-based authentication for user management
- **Flight Catalog**: Search flights, view flight details, manage seat reservations
- **Booking Management**: Create, confirm, cancel bookings with owner-based access control
- **Payment Processing**: Collect payments and process refunds
- **Loyalty Program**: Track customer points and tier levels (Bronze, Silver, Gold)
- **Role-Based Authorization**: Owner and Admin access controls
- **Modern UI**: Responsive web interface built with Vue.js and Quasar framework

## Architecture

This is a traditional monolithic application with integrated frontend and backend:

```
monolith-app/
├── app.py                 # Main Flask application with REST API endpoints
├── requirements.txt       # Python dependencies
├── services/              # Business logic modules
│   ├── auth.py           # JWT authentication service
│   ├── booking.py        # Booking service
│   ├── catalog.py        # Flight catalog service
│   ├── payment.py        # Payment service
│   └── loyalty.py        # Loyalty service
├── data/                  # Data storage layer
│   └── storage.py        # DynamoDB data storage (with auto-fallback)
├── config.py             # Application configuration
├── init_dynamodb_tables.py  # DynamoDB table setup script
├── env.example           # Environment variables template
└── frontend/              # Vue.js frontend application
    ├── src/              # Vue.js source code (development)
    ├── dist/             # Built frontend static files (production)
    ├── package.json      # Frontend dependencies
    └── shared/
        └── api.js        # API service layer
```

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Node.js 14+ and npm (for frontend development)

## Authentication

This application uses **JWT (JSON Web Token)** authentication for secure user authentication and authorization.

### Default Users

| Role | Email | Password |
|------|-------|----------|
| Regular User | `user@example.com` | `password123` |
| Admin | `admin@example.com` | `admin123` |

## Installation

### Backend Setup

1. Navigate to the application directory:
```bash
cd monolith-app
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

### Frontend Setup

3. Navigate to the frontend directory:
```bash
cd frontend
```

4. Install Node.js dependencies:
```bash
npm install
```

5. Build the frontend for production:
```bash
npm run build
```

This will create a `dist` folder with the compiled frontend files that Flask will serve.

6. Return to the root directory:
```bash
cd ..
```

## Running the Application

### Full-Stack Application (Frontend + Backend)

After building the frontend, start the Flask server which will serve both the API and the frontend:

### Option 1: Using the startup script (Recommended)

```bash
python run.py
```

### Option 2: Direct execution

```bash
python app.py
```

The server will start on `http://localhost:5000`

You should see output like:
```
Starting Airline Booking Application...
Server running on http://localhost:5000
Access API documentation at http://localhost:5000/
```

### Accessing the Application

- **Frontend UI**: Open your browser and navigate to `http://localhost:5000`
- **API Documentation**: `http://localhost:5000/api`
- **API Endpoints**: All API endpoints are available at `http://localhost:5000/<endpoint>`

### Frontend Development Mode (Optional)

For frontend development with hot-reload:

1. Start the backend server:
```bash
python run.py
```

2. In a separate terminal, start the frontend development server:
```bash
cd frontend
npm run serve
```

The frontend dev server will run on `http://localhost:8080` with hot-reload enabled. It will proxy API requests to the Flask backend on port 5000.

**Note**: For production deployment, always build the frontend and serve it through Flask.

## API Endpoints

### Root
- `GET /` - API information and available endpoints

### Flight Catalog
- `GET /flights/search` - Search for flights
  - Query params: `departureCode`, `arrivalCode`, `departureDate`
- `GET /flights/<flight_id>` - Get flight details
- `POST /flights/<flight_id>/reserve` - Reserve a seat
- `POST /flights/<flight_id>/release` - Release a seat

### Bookings
- `POST /bookings` - Create a new booking
- `GET /bookings/<booking_id>` - Get booking details
- `POST /bookings/<booking_id>/confirm` - Confirm a booking
- `POST /bookings/<booking_id>/cancel` - Cancel a booking
- `GET /customers/<customer_id>/bookings` - Get customer bookings

### Payments
- `POST /payments/collect` - Collect payment
- `POST /payments/refund` - Refund payment
- `GET /payments/<charge_id>` - Get payment details

### Loyalty
- `GET /loyalty/<customer_id>` - Get customer loyalty information
- `POST /loyalty/<customer_id>/points` - Add loyalty points

## Testing the Application

### 1. Business Logic Testing (No Server Required)

Test all core business logic without starting the server:

```bash
python test_business_logic.py
```

This will test:
- All service methods
- Data validation
- Error handling
- Complete booking and cancellation workflows

✅ **All 25 business logic tests passed**

### 2. Authentication Testing (Requires Server)

Test JWT authentication and authorization:

```bash
# Terminal 1: Start the server
python run.py

# Terminal 2: Run authentication tests
python test_auth.py
```

This will test:
- User registration and login
- Token validation
- Owner-based access control
- Admin role permissions

### 3. REST API Testing (Requires Server)

Test all API endpoints with authentication:

```bash
# Make sure requests library is installed
pip install requests

# Run the API test script
python test_api.py
```

**Note**: The API tests now require authentication. See [AUTH_GUIDE.md](AUTH_GUIDE.md) for examples.

### Manual Testing with curl

### 1. View API Documentation
```bash
curl http://localhost:5000/
```

### 2. Search for Flights
```bash
curl "http://localhost:5000/flights/search?departureCode=LAX&arrivalCode=SFO&departureDate=2025-11-10"
```

### 3. Get Flight Details
```bash
curl http://localhost:5000/flights/FL001
```

### 4. Login to Get Authentication Token
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Save the `access_token` from the response.

### 5. Create a Complete Booking (Requires Authentication)
```bash
# Replace <TOKEN> with your actual access token
curl -X POST http://localhost:5000/bookings \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "outboundFlightId": "FL001",
    "chargeId": "ch_test_12345"
  }'
```

**Note**: `customerId` is automatically set from your authenticated user token.

This single request will:
- Reserve a seat on the flight
- Create and confirm the booking
- Process the payment
- Add loyalty points to the customer
- Send a booking notification

### 6. Get Booking Details (Requires Authentication)
```bash
curl http://localhost:5000/bookings/<booking_id> \
  -H "Authorization: Bearer <TOKEN>"
```
Replace `<booking_id>` with the ID returned from the create booking request.

### 7. Get Your Bookings (Requires Authentication)
```bash
# First get your user ID
USER_ID=$(curl -s http://localhost:5000/auth/me \
  -H "Authorization: Bearer <TOKEN>" | jq -r '.sub')

# Then get your bookings
curl http://localhost:5000/customers/$USER_ID/bookings \
  -H "Authorization: Bearer <TOKEN>"
```

### 8. Check Your Loyalty Points (Requires Authentication)
```bash
curl http://localhost:5000/loyalty/$USER_ID \
  -H "Authorization: Bearer <TOKEN>"
```

### 9. Cancel a Booking (Requires Authentication)
```bash
curl -X POST http://localhost:5000/bookings/<booking_id>/cancel \
  -H "Authorization: Bearer <TOKEN>"
```

This will:
- Cancel the booking
- Release the flight seat
- Refund the payment
- Send a cancellation notification

### 10. Admin: Manually Add Loyalty Points (Admin Only)
```bash
# Login as admin first
ADMIN_TOKEN=$(curl -s -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }' | jq -r '.access_token')

# Add points
curl -X POST http://localhost:5000/loyalty/user123/points \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"points": 5000}'
```

## Sample Data

The application comes pre-loaded with sample flight data:

**Flight FL001**
- Route: LAX (Los Angeles) → SFO (San Francisco)
- Date: 2025-11-10
- Price: $150
- Capacity: 100 seats

**Flight FL002**
- Route: JFK (New York) → LAX (Los Angeles)
- Date: 2025-11-12
- Price: $300
- Capacity: 150 seats

## Loyalty Tiers

- **Bronze**: 1 - 49,999 points
- **Silver**: 50,000 - 99,999 points
- **Gold**: 100,000+ points

Points are earned based on booking price (1:1 ratio).

## Data Storage

This application uses in-memory data storage. All data is stored in memory and will be lost when the application stops. This design keeps the application simple and dependency-free.

For production use, you would replace the in-memory storage with a proper database (e.g., PostgreSQL, MySQL, MongoDB).

## Error Handling

The application includes comprehensive error handling. All errors return JSON responses with appropriate HTTP status codes:

- `400 Bad Request` - Invalid input or business logic errors
- `500 Internal Server Error` - Unexpected server errors

Example error response:
```json
{
  "error": "Flight FL999 does not exist",
  "type": "ValueError"
}
```

## Troubleshooting

### Frontend Display Issues - Flights Not Showing

**问题症状**: 在搜索航班页面(例如 `http://localhost:5000/#/search/results`)能看到"Select your flight"标题,但是航班信息显示白板,控制台报错 `RangeError: Invalid time zone specified: en_US`

**问题原因**: 
- 前端 `FlightClass.js` 使用 `departureLocale` 和 `arrivalLocale` 作为时区参数传递给 JavaScript 的 `Date.toLocaleString()` 方法
- 但数据中使用了 `'en_US'` 这样的locale标识符,而不是有效的IANA时区名称(如 `'America/Los_Angeles'`)
- JavaScript的时区参数必须是标准的IANA时区名称

**解决方案**:
已经在 `data/storage.py` 中修复,将所有的 `departureLocale` 和 `arrivalLocale` 从locale标识符(如 `'en_US'`)改为正确的IANA时区名称(如 `'America/Los_Angeles'`, `'America/New_York'`)。重启应用后问题即可解决。

**常见的时区名称映射**:
- LAX (洛杉矶) → `America/Los_Angeles`
- SFO (旧金山) → `America/Los_Angeles`
- JFK (纽约) → `America/New_York`
- LHR (伦敦) → `Europe/London`
- CDG (巴黎) → `Europe/Paris`

### Port Already in Use
If port 5000 is already in use, you can modify the port in `app.py`:
```python
app.run(host='0.0.0.0', port=8080, debug=True)
```

### Module Import Errors
Ensure you're running the application from the `monolith-app` directory and all dependencies are installed.

### Python Version Issues
This application requires Python 3.8+. Check your version:
```bash
python --version
```

## Development

To modify the application:

1. **Add new endpoints**: Edit `app.py` to add new Flask routes
2. **Modify business logic**: Update files in the `services/` directory
3. **Change data models**: Modify `data/storage.py`

The application runs in debug mode by default, so changes to Python files will automatically reload the server.

## Technology Stack

### Backend
- **Flask**: Python web framework
- **Flask-CORS**: Cross-Origin Resource Sharing support
- **PyJWT**: JSON Web Token authentication
- **Python 3.8+**: Programming language

### Frontend
- **Vue.js 2.6**: Progressive JavaScript framework
- **Quasar Framework**: Vue.js UI framework
- **Vuex**: State management
- **Vue Router**: Client-side routing
- **Axios**: HTTP client for API calls


## Notes

- This is a simplified implementation for demonstration purposes
- **JWT Authentication**: Fully implemented with token-based authentication
- **Authorization**: Owner-based and role-based access control implemented
- **Full-Stack**: Frontend and backend integrated in a single deployable application
- Payment processing is simulated and does not connect to real payment providers
- Notifications are logged but not actually sent
- All data is stored in memory and is not persistent (including users and tokens)
- For production use, replace in-memory storage with a proper database