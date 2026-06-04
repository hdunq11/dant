# 🚀 Backend Setup Instructions

## 1️⃣ Install All Dependencies
```bash
cd d:\datn\be
pip install -r requirements.txt
```

## 2️⃣ Create Database Migrations
```bash
python manage.py makemigrations
```

Expected output:
```
Migrations for 'users':
  users/migrations/0001_initial.py
    - Create model User
    ...
Migrations for 'artists':
  artists/migrations/0001_initial.py
    ...
[Continue for all apps]
```

## 3️⃣ Apply Migrations to PostgreSQL
```bash
python manage.py migrate
```

This will create all tables:
- users
- artists
- venues
- concerts
- concert_artists
- seat_zones
- seats
- concert_seats
- orders
- order_items
- user_behaviors
- favorites

## 4️⃣ Create Admin Superuser
```bash
python manage.py createsuperuser
```

Enter:
- Email: admin@example.com
- Password: (your choice)
- Other fields: Leave default or fill

## 5️⃣ Run Development Server
```bash
python manage.py runserver
```

Expected: `Starting development server at http://127.0.0.1:8000/`

## 6️⃣ Access Admin Panel
```
http://localhost:8000/admin/
Login with superuser credentials
```

Can manage:
- Users
- Artists
- Venues
- Concerts & Concert-Artists
- Seat Zones & Seats
- Orders & Order Items
- User Behaviors & Favorites

## 7️⃣ View API Documentation
```
http://localhost:8000/api/docs/
```

Interactive Swagger UI with:
- All endpoints
- Request/Response examples
- Try it out feature

---

## 🔧 Environment Variables (Optional)

Set these in `.env` file or export:

```
# PostgreSQL
export POSTGRES_DB=concert_db
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=your_password
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432

# Django
export DEBUG=True
export SECRET_KEY=django-insecure-...
```

---

## 📋 API Workflow Example

### Step 1: Register User
```bash
curl -X POST http://localhost:8000/api/users/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "password_confirm": "password123",
    "full_name": "John Doe"
  }'
```

### Step 2: Login
```bash
curl -X POST http://localhost:8000/api/users/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response will include `access_token` and `refresh_token`.

### Step 3: Get User Profile
```bash
curl -X GET http://localhost:8000/api/users/me/ \
  -H "Authorization: Bearer {access_token}"
```

### Step 4: Admin - Create Artist
```bash
curl -X POST http://localhost:8000/api/artists/artists/ \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Taylor Swift",
    "genre": "pop",
    "description": "Singer",
    "image_url": "https://..."
  }'
```

### Step 5: Admin - Create Venue
```bash
curl -X POST http://localhost:8000/api/venues/venues/ \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Madison Square Garden",
    "city": "New York",
    "address": "33 W 33rd St",
    "capacity": 20000
  }'
```

### Step 6: Admin - Create Concert
```bash
curl -X POST http://localhost:8000/api/concerts/concerts/ \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Eras Tour",
    "description": "Concert",
    "start_time": "2024-06-15T19:00:00Z",
    "end_time": "2024-06-15T22:00:00Z",
    "venue_id": "{venue_uuid}",
    "artists": ["{artist_uuid}"],
    "banner_url": "https://..."
  }'
```

### Step 7: Admin - Create Seat Zone
```bash
curl -X POST http://localhost:8000/api/seats/zones/ \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "venue_id": "{venue_uuid}",
    "name": "VIP",
    "price": 200.00,
    "color": "#FFD700"
  }'
```

### Step 8: Admin - Generate Seats Auto
```bash
curl -X POST http://localhost:8000/api/seats/zones/{zone_id}/generate-seats/ \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "rows": ["A", "B", "C", "D"],
    "seats_per_row": 20
  }'
```

This creates 80 seats (4 rows × 20 seats).

### Step 9: Get Concert Seat Map
```bash
curl -X GET http://localhost:8000/api/concerts/concerts/{concert_id}/seatmap/ \
  -H "Authorization: Bearer {user_token}"
```

### Step 10: Reserve Seats
```bash
curl -X POST http://localhost:8000/api/seats/booking/reserve/ \
  -H "Authorization: Bearer {user_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "concert_id": "{concert_uuid}",
    "seat_ids": ["{seat_uuid_1}", "{seat_uuid_2}"]
  }'
```

### Step 11: Create Order
```bash
curl -X POST http://localhost:8000/api/orders/orders/ \
  -H "Authorization: Bearer {user_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "concert_id": "{concert_uuid}",
    "seat_ids": ["{seat_uuid_1}", "{seat_uuid_2}"]
  }'
```

### Step 12: Mock Payment
```bash
curl -X POST http://localhost:8000/api/orders/orders/{order_id}/pay/ \
  -H "Authorization: Bearer {user_token}"
```

---

## 🧪 Testing with Postman

Import the following collection:

[CREATE A POSTMAN COLLECTION]
- All endpoints documented
- Request templates
- Example responses
- Environment variables

---

## 📊 Database Tables Created

After running `migrate`, check with:

```bash
psql -U postgres -d concert_db -c "\dt"
```

Expected tables:
```
auth_group
auth_group_permissions
auth_permission
auth_user
auth_user_groups
auth_user_user_permissions
artists
behaviors  (UserBehavior + Favorite)
concerts
concert_artists
concert_seats
concerts
orders
order_items
seats
seat_zones
users (custom User model)
venues
```

---

## 🐛 Troubleshooting

### Issue: `ModuleNotFoundError: No module named 'rest_framework'`
**Solution**: Run `pip install -r requirements.txt`

### Issue: `PostgreSQL connection: FAILED`
**Solution**: Check PostgreSQL is running
```bash
psql -U postgres
```

### Issue: Migration errors
**Solution**: Delete migrations and try again
```bash
python manage.py migrate --fake-initial
```

### Issue: CORS errors from frontend
**Solution**: Update `CORS_ALLOWED_ORIGINS` in `settings.py` with your frontend URL

---

## ✅ Quick Checklist

- [ ] Install requirements.txt
- [ ] makemigrations
- [ ] migrate
- [ ] createsuperuser
- [ ] runserver
- [ ] Access admin panel
- [ ] Access API docs (Swagger)
- [ ] Test authentication flow
- [ ] Create sample data (artists, venues, concerts)
- [ ] Generate seats for a venue
- [ ] Test booking flow

---

**Backend is ready for deployment!** 🚀

See `API_DOCUMENTATION.md` for full endpoint reference.
