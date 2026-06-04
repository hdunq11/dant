# Sample Data Generation Guide

This document explains how to generate and insert sample data into the Concert Ticket Booking system database.

## 📊 Generated Data Summary

### Files Created

1. **generate_sample_data.py** - Python script to generate SQL INSERT statements
2. **load_sample_data.py** - Django ORM script to load data directly
3. **test_apis.py** - API testing script to verify all endpoints
4. **sample_data.sql** - Pre-generated SQL INSERT file

### Data Statistics

| Table | Records | Notes |
|-------|---------|-------|
| Users | 100 | 1 admin + 99 regular users |
| Artists | 100 | Various genres (pop, rock, kpop, hip-hop, etc.) |
| Venues | 50 | Different cities and capacities |
| Concerts | 100 | Scheduled across 180 days |
| Concert-Artists | ~300 | 1-3 artists per concert |
| Seat Zones | 250 | 5 zones per venue (VIP, A, B, C, Standard) |
| Seats | ~200,000 | 4000+ seats per venue |
| **Concert Seats** | **2,000,000+** | **2000+ seats per concert** ⭐ |
| Orders | 200 | Mixed status (pending, paid, cancelled) |
| Order Items | 400-600 | 2-3 items per order |
| User Behaviors | 200 | Actions: view, click, favorite |
| Favorites | 100 | User favorite concerts |

**Total Records: 2,200,000+** (concert_seats is the largest table)

---

## 🚀 Quick Start - Choose One Method

### Method 1: Using Django Shell (RECOMMENDED for first-time setup)

**Fastest and safest method**

```bash
# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Load sample data via Django ORM
python manage.py shell < load_sample_data.py
```

**Advantages:**
- Uses Django ORM (validates data)
- Handles relationships correctly
- Respects model constraints
- No SQL syntax issues
- Works cross-database (PostgreSQL, SQLite, MySQL)

**Time:** ~2-5 minutes

---

### Method 2: Using SQL File (RECOMMENDED for PostgreSQL)

**Fastest for bulk insertion**

```bash
# Step 1: Apply migrations
python manage.py migrate

# Step 2: Load SQL file into PostgreSQL
psql -U postgres -d concert_db -f sample_data.sql
```

**Prerequisites:**
- PostgreSQL installed and running
- Database created: `createdb concert_db`
- Environment variables set:
  ```bash
  export POSTGRES_DB=concert_db
  export POSTGRES_USER=postgres
  export POSTGRES_PASSWORD=your_password
  export POSTGRES_HOST=localhost
  export POSTGRES_PORT=5432
  ```

**Advantages:**
- Much faster for large volumes
- Single batch operation
- Minimal database connections

**Time:** ~30 seconds

---

### Method 3: Generate Fresh SQL File

**If you want to regenerate data or customize it**

```bash
# Generate new sample_data.sql
python generate_sample_data.py

# Then load it
python manage.py migrate
psql -U postgres -d concert_db -f sample_data.sql
```

---

## 🧪 Testing All APIs

After loading data, test all endpoints:

```bash
# Terminal 1: Start the server
python manage.py runserver

# Terminal 2: Run API tests
python test_apis.py
```

The test script will:
- ✓ Register a new user
- ✓ Login and get JWT token
- ✓ Test all CRUD endpoints
- ✓ Verify authentication
- ✓ Check concert listing with filters
- ✓ Test seat mapping
- ✓ Verify ordering flow
- ✓ Test favorites and recommendations

---

## 📝 Manual Data Insertion (If methods above fail)

### Step 1: Start Django Shell

```bash
python manage.py shell
```

### Step 2: Create users

```python
from users.models import User

# Create admin
admin = User.objects.create_superuser(
    email='admin@example.com',
    username='admin',
    password='admin123'
)
admin.full_name = 'Admin User'
admin.save()

# Create regular user
user = User.objects.create_user(
    email='user@example.com',
    username='user1',
    password='user123',
    full_name='John Doe'
)
```

### Step 3: Create artists

```python
from artists.models import Artist

artist = Artist.objects.create(
    name='Taylor Swift',
    genre='pop',
    description='American singer-songwriter',
    image_url='https://example.com/taylor.jpg'
)
```

### Step 4: Create venues

```python
from venues.models import Venue

venue = Venue.objects.create(
    name='MyDinosaur Hall',
    city='Ho Chi Minh',
    address='123 Nguyen Hue Street',
    capacity=5000
)
```

### Step 5: Create concerts

```python
from concerts.models import Concert, ConcertArtist
from datetime import datetime, timedelta

concert = Concert.objects.create(
    title='Love Story World Tour',
    description='Taylor Swift performing greatest hits',
    start_time=datetime.now() + timedelta(days=10),
    end_time=datetime.now() + timedelta(days=10, hours=3),
    venue=venue,
    banner_url='https://example.com/banner.jpg'
)

# Add artists to concert
ConcertArtist.objects.create(concert=concert, artist=artist)
```

### Step 6: Create seat zones and seats

```python
from seats.models import SeatZone, Seat

zone = SeatZone.objects.create(
    venue=venue,
    name='VIP',
    price=500000,
    color='#FFD700'
)

# Generate seats
for row_idx in range(5):
    row_label = chr(65 + row_idx)  # A, B, C, D, E
    for seat_num in range(1, 21):  # 20 seats per row
        Seat.objects.create(
            venue=venue,
            zone=zone,
            row_label=row_label,
            seat_number=seat_num,
            pos_x=float(seat_num * 10),
            pos_y=float(row_idx * 15)
        )
```

### Step 7: Create concert seats

```python
from seats.models import ConcertSeat
import random

seats = Seat.objects.all()[:2000]

for seat in seats:
    statuses = ['available'] * 70 + ['sold'] * 25 + ['reserved'] * 5
    ConcertSeat.objects.create(
        concert=concert,
        seat=seat,
        status=random.choice(statuses)
    )
```

---

## 🔍 Verify Data Was Loaded

```bash
python manage.py shell
```

```python
# Check record counts
from django.apps import apps

for model in apps.get_models():
    count = model.objects.count()
    print(f"{model.__name__}: {count}")

# Expected output:
# User: 100
# Artist: 100
# Venue: 50
# Concert: 100
# ConcertArtist: ~300
# SeatZone: 250
# Seat: ~200,000
# ConcertSeat: 2,000,000+
# Order: 200
# OrderItem: 400-600
# UserBehavior: 200
# Favorite: 100
```

---

## 🔑 Default Test Credentials

After loading data, use these to test login:

```
Email: admin@example.com
Password: admin123
```

Or use a regular user:
```
Email: user1@gmail.com
Password: password1
```

---

## 🗄️ Database Size Expectations

### SQLite
- Total size: ~500MB - 1GB
- Concert seats table alone: ~400MB

### PostgreSQL
- Total size: ~200-300MB
- More efficient compression
- Better performance for large queries

---

## ⚙️ Customizing Data

Edit these constants in `generate_sample_data.py`:

```python
GENRES = ['pop', 'rock', 'kpop', ...]  # Add/remove genres
CITIES = ['Ho Chi Minh', 'Hanoi', ...]  # Add/remove cities
ARTIST_NAMES = [...]  # Add/remove artist names
VENUE_NAMES = [...]   # Add/remove venues
```

Then regenerate:
```bash
python generate_sample_data.py
```

---

## 🚨 Troubleshooting

### Error: "django.db.utils.IntegrityError"
- Cause: Data already exists or migration issues
- Fix: Clear database and remigrate
  ```bash
  python manage.py flush  # WARNING: Deletes all data!
  python manage.py migrate
  python manage.py shell < load_sample_data.py
  ```

### Error: "psycopg2.OperationalError"
- Cause: PostgreSQL not running or wrong credentials
- Fix: Check connection parameters
  ```bash
  psql -U postgres -d concert_db  # Test connection
  ```

### Error: "ModuleNotFoundError"
- Cause: Django not in Python path
- Fix: Run from project root
  ```bash
  cd d:\datn\be
  python manage.py shell < load_sample_data.py
  ```

### Data incomplete after loading
- Some data might be skipped due to unique constraints
- This is normal - check counts
- Run: `python manage.py shell < load_sample_data.py` again

---

## 📊 Performance Tips

### For PostgreSQL (Recommended)

```sql
-- Disable indexes during bulk insert
ALTER TABLE concert_seats DISABLE TRIGGER ALL;

-- Load data
COPY concert_seats (...) FROM '/path/to/data.csv';

-- Re-enable
ALTER TABLE concert_seats ENABLE TRIGGER ALL;

-- Create indexes
CREATE INDEX idx_concert_seats_concert_id ON concert_seats(concert_id);
```

### For Django ORM

```python
# Batch insert (faster than one-by-one)
from django.db.models import bulk_create

objects = [ConcertSeat(...) for _ in range(2000)]
ConcertSeat.objects.bulk_create(objects, batch_size=500)
```

---

## 🎯 API Endpoints to Test

```bash
# Start server
python manage.py runserver

# Test in another terminal
curl http://localhost:8000/api/concerts/concerts/
curl http://localhost:8000/api/artists/artists/
curl http://localhost:8000/api/venues/venues/
curl http://localhost:8000/api/docs/  # Swagger UI
```

---

## 📚 Next Steps

1. ✅ Load sample data (choose Method 1 or 2)
2. ✅ Verify data with `python manage.py shell`
3. ✅ Run `python test_apis.py` to test APIs
4. ✅ Access http://localhost:8000/api/docs/ for interactive API docs
5. ✅ Start building your frontend!

---

## 📞 Support

If data loading fails:
1. Check migration status: `python manage.py showmigrations`
2. Run migrations: `python manage.py migrate`
3. Check database connection: `python manage.py dbshell`
4. Review Django logs for errors

For API testing issues, see API_DOCUMENTATION.md
