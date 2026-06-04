# 🎫 Concert Ticket Booking Backend

A full-featured Django REST Framework backend for a concert ticket booking system with advanced features including seat mapping, booking flow, user authentication, and AI recommendations.

## 🎯 Key Features

✅ **User Authentication** - JWT-based auth with register/login  
✅ **Artist & Venue Management** - Full CRUD with admin controls  
✅ **Concert Management** - Advanced search & filtering (genre, city, date)  
✅ **Seat Management** - 2D seat positioning with automatic generation  
✅ **Booking System** - Complete flow: Reserve → Order → Pay → Cancel  
✅ **Anti-Double-Booking** - Unique constraints on concert_seats  
✅ **Favorites System** - Users can save favorite concerts  
✅ **Behavior Tracking** - Log user actions (view, click, favorite)  
✅ **Recommendations** - AI-based concert recommendations  
✅ **Admin Dashboard** - Full management panel  
✅ **API Documentation** - Interactive Swagger UI  
✅ **PostgreSQL** - Scalable relational database  

## 📊 Database Models

```
11 Core Models:
├── User (Custom Django User)
├── Artist
├── Venue
├── Concert + ConcertArtist (M2M)
├── SeatZone + Seat + ConcertSeat
├── Order + OrderItem
├── UserBehavior + Favorite
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 3. Create Superuser
```bash
python manage.py createsuperuser
```

### 4. Start Server
```bash
python manage.py runserver
```

### 5. Access Endpoints
- **API Docs**: http://localhost:8000/api/docs/
- **Admin Panel**: http://localhost:8000/admin/
- **API Base**: http://localhost:8000/api/

## 📡 API Endpoints

### Authentication
```
POST   /api/users/auth/register/
POST   /api/users/auth/login/
GET    /api/users/me/
PUT    /api/users/me/
```

### Artists
```
GET    /api/artists/artists/
POST   /api/artists/artists/          (Admin)
PUT    /api/artists/artists/{id}/     (Admin)
DELETE /api/artists/artists/{id}/     (Admin)
```

### Venues
```
GET    /api/venues/venues/
POST   /api/venues/venues/            (Admin)
PUT    /api/venues/venues/{id}/       (Admin)
DELETE /api/venues/venues/{id}/       (Admin)
```

### Concerts
```
GET    /api/concerts/concerts/        (with filters: search, genre, city, date)
GET    /api/concerts/concerts/{id}/
GET    /api/concerts/concerts/{id}/artists/
GET    /api/concerts/concerts/{id}/venue/
GET    /api/concerts/concerts/{id}/seatmap/  (Critical for VR/Web UI)
POST   /api/concerts/concerts/        (Admin)
PUT    /api/concerts/concerts/{id}/   (Admin)
DELETE /api/concerts/concerts/{id}/   (Admin)
```

### Seats & Booking
```
GET    /api/seats/zones/
POST   /api/seats/zones/              (Admin)
POST   /api/seats/zones/{id}/generate-seats/  (Auto-generate seats!)
GET    /api/seats/seats/
POST   /api/seats/booking/reserve/    (10-minute timeout)
```

### Orders
```
GET    /api/orders/orders/            (User orders)
POST   /api/orders/orders/            (Create order)
POST   /api/orders/orders/{id}/pay/   (Mock payment)
POST   /api/orders/orders/{id}/cancel/ (Cancel order)
```

### Favorites
```
GET    /api/users/me/favorites/
POST   /api/users/me/favorites/       (Add to favorites)
```

### Behaviors & Recommendations
```
POST   /api/behaviors/behaviors/      (Log behavior)
GET    /api/behaviors/recommend/      (Get recommendations)
```

## 🔐 Authentication

- **JWT Tokens** - Stateless authentication
- **Token Refresh** - Automatic token renewal
- **Role-Based Access** - `user` and `admin` roles
- **Permissions** - AllowAny, IsAuthenticated, IsAdminUser

## 📋 Booking Flow

```
1. Reserve Seats (10 min timeout)
   ↓
2. Create Order (pending status)
   ↓
3. Payment (pending → paid)
   ↓
4. Seats Marked as Sold
```

## 📁 Project Structure

```
be/
├── config/              # Django settings & URLs
├── users/               # User auth & profiles
├── artists/             # Artist CRUD
├── venues/              # Venue CRUD
├── concerts/            # Concert management
├── seats/               # Seat & booking system
├── orders/              # Order management
├── behaviors/           # Tracking & recommendations
├── manage.py
├── requirements.txt
├── API_DOCUMENTATION.md # Detailed API reference
├── SETUP_INSTRUCTIONS.md # Step-by-step setup
└── README.md
```

## 🔧 Environment Setup

Set PostgreSQL environment variables:

```bash
export POSTGRES_DB=concert_db
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=your_password
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
```

Or create `.env` file and use `python-decouple`.

## 📚 Documentation

- **Full API Reference**: See [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Setup Guide**: See [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)
- **Interactive Docs**: http://localhost:8000/api/docs/ (Swagger UI)

## 🧪 Testing

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test users

# With coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report
```

## 🛠️ Technology Stack

- **Framework**: Django 6.0.4
- **API**: Django REST Framework 3.14.0
- **Database**: PostgreSQL
- **Authentication**: Simple JWT
- **Documentation**: drf-spectacular (Swagger)
- **CORS**: django-cors-headers

## 📦 Dependencies

```
Django==6.0.4
psycopg2-binary
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.2
django-cors-headers==4.3.0
drf-spectacular==0.27.0
django-filter==23.5
```

## 🚀 Deployment

### Production Checklist
- [ ] Set DEBUG=False
- [ ] Generate SECRET_KEY
- [ ] Configure ALLOWED_HOSTS
- [ ] Set up PostgreSQL (not SQLite)
- [ ] Collect static files: `python manage.py collectstatic`
- [ ] Use Gunicorn/uWSGI + Nginx
- [ ] Enable HTTPS
- [ ] Configure CORS for frontend domain

### Deploy to Heroku
```bash
heroku create
heroku config:set POSTGRES_HOST=...
git push heroku main
heroku run python manage.py migrate
```

## 🤝 Integration with Frontend

Frontend should use:
- **Auth**: POST /api/users/auth/login/ → Get JWT token
- **Concerts**: GET /api/concerts/concerts/ (with filters)
- **Seatmap**: GET /api/concerts/{id}/seatmap/ (for VR/Web UI)
- **Booking**: POST /api/seats/booking/reserve/ → POST /api/orders/orders/ → POST /api/orders/{id}/pay/

## 📞 Support

For issues or questions:
1. Check [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
2. Check [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)
3. Review Django docs: https://docs.djangoproject.com/
4. Check DRF docs: https://www.django-rest-framework.org/

---

**Backend ready for Web, Mobile, and VR frontend integration!** 🎉


```
python manage.py runserver
```

The server will start at http://127.0.0.1:8000/

## Database

The project uses SQLite by default.

## Project Structure

- `manage.py`: Django management script
- `config/`: Main project directory with settings, URLs, etc.