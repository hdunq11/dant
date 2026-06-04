# Concert Ticket Booking Backend - Full API Documentation

## 📋 Project Overview

This is a full-featured Django REST Framework backend for a concert ticket booking system with:
- User authentication (JWT)
- Concert & Artist management
- Venue & Seat management
- Booking & Order system
- User behavior tracking & recommendations
- Admin dashboard

## 🏗️ Project Structure

```
be/
├── config/
│   ├── settings.py          # Main settings (DRF, CORS, Auth)
│   ├── urls.py              # Main URL router
│   ├── asgi.py
│   ├── wsgi.py
│
├── users/                   # User authentication & profiles
│   ├── models.py            # User model (custom)
│   ├── views.py             # Auth, Profile, Favorites, Orders
│   ├── serializers.py
│   ├── urls.py
│   └── admin.py
│
├── artists/                 # Artists CRUD
│   ├── models.py            # Artist model
│   ├── views.py             # ArtistViewSet
│   ├── serializers.py
│   ├── urls.py
│   └── admin.py
│
├── venues/                  # Venues CRUD
│   ├── models.py            # Venue model
│   ├── views.py             # VenueViewSet
│   ├── serializers.py
│   ├── urls.py
│   └── admin.py
│
├── concerts/                # Concerts & Concert-Artists
│   ├── models.py            # Concert, ConcertArtist models
│   ├── views.py             # ConcertViewSet with search/filters
│   ├── serializers.py
│   ├── urls.py
│   └── admin.py
│
├── seats/                   # Seat management & seat maps
│   ├── models.py            # SeatZone, Seat, ConcertSeat models
│   ├── views.py             # SeatZone, Seat, Reserve endpoints
│   ├── serializers.py
│   ├── urls.py
│   └── admin.py
│
├── orders/                  # Bookings & Orders
│   ├── models.py            # Order, OrderItem models
│   ├── views.py             # Order CRUD, Payment, Cancel
│   ├── serializers.py
│   ├── urls.py
│   └── admin.py
│
├── behaviors/               # User tracking & Recommendations
│   ├── models.py            # UserBehavior, Favorite models
│   ├── views.py             # Behavior logging, Recommendations
│   ├── serializers.py
│   ├── urls.py
│   └── admin.py
│
├── manage.py
├── requirements.txt
└── db.sqlite3 / PostgreSQL
```

## 🔑 Models Overview

### 1. User Model
```python
- id: UUID (PK)
- email: String (unique)
- password_hash: String
- full_name: String
- avatar_url: String (nullable)
- role: 'user' | 'admin'
- created_at: DateTime
- updated_at: DateTime
```

### 2. Artist Model
```python
- id: UUID (PK)
- name: String
- genre: String (pop, kpop, rock, etc.)
- description: Text (nullable)
- image_url: String (nullable)
- created_at: DateTime
- updated_at: DateTime
```

### 3. Venue Model
```python
- id: UUID (PK)
- name: String
- city: String
- address: Text
- capacity: Integer
- created_at: DateTime
- updated_at: DateTime
```

### 4. Concert Model
```python
- id: UUID (PK)
- title: String
- description: Text (nullable)
- start_time: DateTime
- end_time: DateTime
- venue_id: FK → Venue
- banner_url: String (nullable)
- created_at: DateTime
- updated_at: DateTime
- Related: concert_artists (through ConcertArtist)
```

### 5. ConcertArtist Model
```python
- concert_id: FK → Concert
- artist_id: FK → Artist
- unique_together: (concert, artist)
```

### 6. SeatZone Model
```python
- id: UUID (PK)
- venue_id: FK → Venue
- name: String (VIP, A, B, C)
- price: Decimal
- color: String (hex color)
- created_at: DateTime
- updated_at: DateTime
- unique_together: (venue, name)
```

### 7. Seat Model
```python
- id: UUID (PK)
- venue_id: FK → Venue
- zone_id: FK → SeatZone
- row_label: String (A, B, C, ...)
- seat_number: Integer (1, 2, 3, ...)
- pos_x: Float (for 2D mapping)
- pos_y: Float (for 2D mapping)
- created_at: DateTime
- unique_together: (venue, row_label, seat_number)
```

### 8. ConcertSeat Model (Critical - Prevents Double Booking)
```python
- id: UUID (PK)
- concert_id: FK → Concert
- seat_id: FK → Seat
- status: 'available' | 'reserved' | 'sold'
- reserved_until: DateTime (nullable, for reservation timeout)
- created_at: DateTime
- updated_at: DateTime
- unique_together: (concert, seat)
```

### 9. Order Model
```python
- id: UUID (PK)
- user_id: FK → User
- concert_id: FK → Concert
- total_price: Decimal
- status: 'pending' | 'paid' | 'cancelled'
- created_at: DateTime
- updated_at: DateTime
```

### 10. OrderItem Model
```python
- id: UUID (PK)
- order_id: FK → Order
- seat_id: FK → Seat
- price: Decimal
- created_at: DateTime
```

### 11. UserBehavior Model
```python
- id: UUID (PK)
- user_id: FK → User
- concert_id: FK → Concert
- action: 'view' | 'click' | 'favorite'
- created_at: DateTime
- Indexes: (user, created_at), (concert, action)
```

### 12. Favorite Model
```python
- user_id: FK → User
- concert_id: FK → Concert
- created_at: DateTime
- unique_together: (user, concert)
```

---

## 🔐 Authentication & Authorization

### Auth Strategy
- **JWT (JSON Web Tokens)** for stateless authentication
- **SimpleJWT** library for token management
- **Token Refresh** endpoint for renewing access tokens

### Permissions
- **AllowAny**: Registration, Login, Concert Listing
- **IsAuthenticated**: User Profile, Orders, Favorites, Booking
- **IsAdminUser**: Artist/Venue/Concert CRUD, Admin Dashboard

### User Roles
- `user`: Regular user (can browse, book)
- `admin`: Full access (can manage all resources)

---

## 📡 API Endpoints

### 🔓 Authentication APIs

#### Register
```
POST /api/users/auth/register/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "password_confirm": "secure_password",
  "full_name": "John Doe"
}

Response: 201 Created
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "avatar_url": null,
  "role": "user",
  "created_at": "2024-05-06T10:00:00Z"
}
```

#### Login
```
POST /api/users/auth/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}

Response: 200 OK
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": { ... }
}
```

#### Get Current User
```
GET /api/users/me/
Authorization: Bearer <access_token>

Response: 200 OK
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "avatar_url": null,
  "role": "user",
  "created_at": "2024-05-06T10:00:00Z"
}
```

#### Update Profile
```
PUT /api/users/me/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "full_name": "Jane Doe",
  "avatar_url": "https://example.com/avatar.jpg"
}

Response: 200 OK
```

---

### 🎤 Artist APIs

#### List Artists
```
GET /api/artists/artists/
Query: ?genre=pop&search=Taylor

Response: 200 OK
{
  "count": 100,
  "next": "...",
  "results": [
    {
      "id": "uuid",
      "name": "Taylor Swift",
      "genre": "pop",
      "description": "...",
      "image_url": "...",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

#### Create Artist (Admin)
```
POST /api/artists/artists/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Taylor Swift",
  "genre": "pop",
  "description": "American singer-songwriter",
  "image_url": "https://example.com/taylor.jpg"
}

Response: 201 Created
```

#### Update Artist (Admin)
```
PUT /api/artists/artists/{id}/
Authorization: Bearer <admin_token>
```

#### Delete Artist (Admin)
```
DELETE /api/artists/artists/{id}/
Authorization: Bearer <admin_token>
```

---

### 🏟️ Venue APIs

#### List Venues
```
GET /api/venues/venues/
Query: ?city=New York

Response: 200 OK
```

#### Create Venue (Admin)
```
POST /api/venues/venues/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Madison Square Garden",
  "city": "New York",
  "address": "33 W 33rd St, New York, NY 10001",
  "capacity": 20000
}

Response: 201 Created
```

---

### 🎫 Concert APIs

#### List Concerts (with Filters)
```
GET /api/concerts/concerts/
Query Parameters:
  ?search=Taylor
  ?genre=pop
  ?city=New York
  ?date=2024-06-15
  ?ordering=-start_time

Response: 200 OK
{
  "count": 50,
  "results": [
    {
      "id": "uuid",
      "title": "Eras Tour",
      "description": "...",
      "start_time": "2024-06-15T19:00:00Z",
      "end_time": "2024-06-15T22:00:00Z",
      "venue": { ... },
      "banner_url": "...",
      "concert_artists": [
        {
          "artist": {
            "id": "uuid",
            "name": "Taylor Swift",
            ...
          }
        }
      ],
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

#### Get Concert Details
```
GET /api/concerts/concerts/{id}/
```

#### Get Concert Artists
```
GET /api/concerts/concerts/{id}/artists/
Response: Array of Artist objects
```

#### Get Concert Venue
```
GET /api/concerts/concerts/{id}/venue/
Response: Venue object
```

#### Get Seat Map (CRITICAL for VR/Web UI)
```
GET /api/concerts/concerts/{id}/seatmap/

Response: 200 OK
{
  "zones": [
    {
      "zone_id": "uuid",
      "name": "VIP",
      "price": 200.00,
      "color": "#FFD700",
      "seats": [
        {
          "seat_id": "uuid",
          "row": "A",
          "number": 1,
          "status": "available",
          "pos_x": 10.0,
          "pos_y": 0.0
        },
        {
          "seat_id": "uuid",
          "row": "A",
          "number": 2,
          "status": "sold",
          "pos_x": 20.0,
          "pos_y": 0.0
        }
      ]
    },
    {
      "zone_id": "uuid",
      "name": "A",
      "price": 150.00,
      "color": "#FF6B6B",
      "seats": [ ... ]
    }
  ]
}
```

#### Create Concert (Admin)
```
POST /api/concerts/concerts/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Eras Tour",
  "description": "Taylor Swift's Eras Tour",
  "start_time": "2024-06-15T19:00:00Z",
  "end_time": "2024-06-15T22:00:00Z",
  "venue_id": "uuid",
  "artists": ["artist_uuid_1", "artist_uuid_2"],
  "banner_url": "https://example.com/banner.jpg"
}

Response: 201 Created
```

---

### 💺 Seat Management APIs

#### Create Seat Zone (Admin)
```
POST /api/seats/zones/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "venue_id": "uuid",
  "name": "VIP",
  "price": 200.00,
  "color": "#FFD700"
}

Response: 201 Created
```

#### Generate Seats Auto (Admin - CRITICAL!)
```
POST /api/seats/zones/{zone_id}/generate-seats/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "rows": ["A", "B", "C", "D"],
  "seats_per_row": 20
}

Response: 201 Created
{
  "message": "Generated 80 seats",
  "count": 80
}
```

**This endpoint automatically creates 80 seats (4 rows × 20 per row) instead of manual entry!**

#### List Seats
```
GET /api/seats/seats/
Query: ?zone_id=uuid
```

---

### 🎫 Booking Flow APIs

#### 1. Reserve Seats (10-minute timeout)
```
POST /api/seats/booking/reserve/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "concert_id": "uuid",
  "seat_ids": ["seat_uuid_1", "seat_uuid_2"]
}

Response: 200 OK
{
  "message": "Reserved 2 seats",
  "reserved_until": "2024-05-06T10:10:00Z"
}

Status becomes: 'reserved' (with 10-min timeout)
```

#### 2. Create Order
```
POST /api/orders/orders/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "concert_id": "uuid",
  "seat_ids": ["seat_uuid_1", "seat_uuid_2"]
}

Response: 201 Created
{
  "id": "uuid",
  "user": "uuid",
  "concert": "uuid",
  "total_price": 400.00,
  "status": "pending",
  "items": [
    {
      "id": "uuid",
      "seat": { ... },
      "price": 200.00,
      "created_at": "..."
    }
  ],
  "created_at": "...",
  "updated_at": "..."
}
```

#### 3. Mock Payment (Confirm & Finalize)
```
POST /api/orders/orders/{order_id}/pay/
Authorization: Bearer <access_token>

Response: 200 OK
{
  "message": "Payment successful",
  "order": { ... }
}

Order Status: pending → paid
Seat Status: reserved → sold
```

#### 4. Cancel Order
```
POST /api/orders/orders/{order_id}/cancel/
Authorization: Bearer <access_token>

Response: 200 OK
{
  "message": "Order cancelled"
}

Order Status: pending/paid → cancelled
Seat Status: reserved → available (if not sold)
```

#### Get User Orders
```
GET /api/users/me/orders/
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": "uuid",
    "concert_title": "Eras Tour",
    "total_price": 400.00,
    "status": "paid",
    "created_at": "..."
  }
]
```

---

### ❤️ Favorites APIs

#### Get Favorites
```
GET /api/users/me/favorites/
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": "uuid",
    "title": "Eras Tour",
    "start_time": "2024-06-15T19:00:00Z",
    "banner_url": "..."
  }
]
```

#### Add to Favorites
```
POST /api/users/me/favorites/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "concert_id": "uuid"
}

Response: 201 Created
{
  "message": "Added to favorites"
}
```

#### Remove from Favorites
```
DELETE /api/users/me/favorites/{concert_id}/
Authorization: Bearer <access_token>

Response: 204 No Content
```

---

### 🤖 Behavior & Recommendation APIs

#### Log User Behavior
```
POST /api/behaviors/behaviors/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "concert_id": "uuid",
  "action": "view"  // or "click", "favorite"
}

Response: 201 Created
{
  "id": "uuid",
  "user": "uuid",
  "concert": "uuid",
  "action": "view",
  "created_at": "..."
}
```

#### Get Recommended Concerts
```
GET /api/behaviors/recommend/?concert_id=uuid
Authorization: Bearer <access_token>

Response: 200 OK
{
  "recommendedConcerts": [ ... ],
  "recommendedZone": "VIP"
}
```

---

### 👑 Admin Dashboard APIs (Optional - Can Extend)

```
GET /admin/dashboard/stats/
Authorization: Bearer <admin_token>

Response:
{
  "total_users": 1000,
  "total_orders": 500,
  "revenue": 150000.00,
  "popular_concerts": [ ... ]
}
```

---

## 🚀 Setup & Installation

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Create Migrations
```bash
python manage.py makemigrations
```

### 3. Apply Migrations
```bash
python manage.py migrate
```

### 4. Create Superuser (Admin)
```bash
python manage.py createsuperuser
```

### 5. Run Development Server
```bash
python manage.py runserver
```

### 6. Access Admin Panel
```
http://localhost:8000/admin/
```

### 7. API Documentation (Swagger UI)
```
http://localhost:8000/api/docs/
```

---

## 📊 Database Schema Relationships

```
User ──→ Order ──→ Concert ──→ Venue
         ↓              ↓           ↓
      OrderItem      ConcertArtist   SeatZone
         ↓                           ↓
        Seat ←─────────────── ConcertSeat
                                    ↑
                              Favorite
                              UserBehavior
```

---

## 🔒 Security Features

- ✅ JWT Authentication
- ✅ CORS Configuration
- ✅ Password Hashing (Django default)
- ✅ Permission Classes (IsAuthenticated, IsAdminUser)
- ✅ Atomic Transactions (for bookings)
- ✅ Unique Constraints (prevents double-booking via concert_seats unique(concert, seat))

---

## 📝 Technology Stack

- **Framework**: Django 6.0.4
- **API**: Django REST Framework 3.14.0
- **Database**: PostgreSQL
- **Authentication**: Simple JWT
- **Documentation**: drf-spectacular (Swagger UI)
- **CORS**: django-cors-headers

---

## 🎯 Key Features Implemented

✅ User Authentication (Register, Login, Profile)
✅ Concert Management with Filters (search, genre, city, date)
✅ Artist & Venue CRUD
✅ Advanced Seat Management with 2D positioning
✅ Complete Booking Flow (Reserve → Order → Pay → Cancel)
✅ Double-Booking Prevention via concert_seats model
✅ Favorites System
✅ User Behavior Tracking
✅ AI-based Recommendations
✅ Admin Dashboard Ready
✅ Full API Documentation

---

**Backend is ready for frontend (Web, Mobile, VR) integration!** 🚀
