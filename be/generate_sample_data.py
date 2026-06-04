import uuid
import json
from datetime import datetime, timedelta
import random

# Lists for generating realistic data
GENRES = ['pop', 'rock', 'kpop', 'hip-hop', 'jazz', 'electronic', 'classical', 'country']
CITIES = ['Ho Chi Minh', 'Hanoi', 'Da Nang', 'Can Tho', 'Hai Phong', 'Nha Trang', 'Phu Quoc']
ZONES = ['VIP', 'A', 'B', 'C', 'Standard']
ZONE_COLORS = {
    'VIP': '#FFD700',
    'A': '#FF6B6B',
    'B': '#4ECDC4',
    'C': '#45B7D1',
    'Standard': '#95E1D3'
}
ZONE_PRICES = {
    'VIP': 500000,
    'A': 350000,
    'B': 250000,
    'C': 150000,
    'Standard': 100000
}

ARTIST_NAMES = [
    'Taylor Swift', 'The Weeknd', 'Ariana Grande', 'Ed Sheeran', 'Billie Eilish',
    'Harry Styles', 'Dua Lipa', 'Weeknd', 'Drake', 'Post Malone',
    'Olivia Rodrigo', 'Justin Bieber', 'Nicki Minaj', 'Eminem', 'Travis Scott',
    'BTS', 'BLACKPINK', 'EXO', 'Stray Kids', 'NewJeans',
    'Coldplay', 'The Beatles', 'Queen', 'Pink Floyd', 'Led Zeppelin'
]

VENUE_NAMES = [
    'MyDinosaur', 'Crescent Moon Theater', 'Grand Palace Hall',
    'International Convention Center', 'Sports Complex Arena',
    'Riverside Theater', 'Downtown Music Hall', 'Cultural Center',
    'National Stadium', 'Exhibition Center'
]

CONCERT_TITLES = [
    'Love Story World Tour', 'Blinding Lights Tour', 'Eternal Sunshine Tour',
    'The Eras Tour', 'Divide Tour', 'Happier Than Ever Tour', 
    'In Concert Tour', 'World Tour 2024', 'Summer Festival',
    'Greatest Hits Tour', 'Victory Tour', 'Celebration Tour'
]

def generate_users(count=100):
    """Generate user data"""
    users = []
    domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']
    
    for i in range(count):
        user = {
            'id': str(uuid.uuid4()),
            'email': f'user{i+1}@{random.choice(domains)}',
            'username': f'user{i+1}',
            'password_hash': 'hashed_password_' + str(i),
            'full_name': f'User {i+1}',
            'avatar_url': None,
            'role': 'admin' if i == 0 else 'user',
            'created_at': datetime.now() - timedelta(days=random.randint(1, 365)),
            'updated_at': datetime.now()
        }
        users.append(user)
    
    return users

def generate_artists(count=100):
    """Generate artist data"""
    artists = []
    used_names = set()
    
    for i in range(count):
        if i < len(ARTIST_NAMES):
            name = ARTIST_NAMES[i]
        else:
            name = f'Artist {i+1}'
            while name in used_names:
                name = f'Artist {i+1}_v{random.randint(1, 99)}'
        
        used_names.add(name)
        artist = {
            'id': str(uuid.uuid4()),
            'name': name,
            'genre': random.choice(GENRES),
            'description': f'Popular {random.choice(GENRES)} artist known for great performances',
            'image_url': f'https://example.com/artists/artist_{i+1}.jpg',
            'created_at': datetime.now() - timedelta(days=random.randint(1, 365)),
            'updated_at': datetime.now()
        }
        artists.append(artist)
    
    return artists

def generate_venues(count=50):
    """Generate venue data"""
    venues = []
    
    for i in range(count):
        venue = {
            'id': str(uuid.uuid4()),
            'name': f'{VENUE_NAMES[i % len(VENUE_NAMES)]} #{i+1}',
            'city': random.choice(CITIES),
            'address': f'{random.randint(1, 500)} {random.choice(["Main", "Central", "Park", "Market", "River"])} Street',
            'capacity': random.choice([5000, 10000, 15000, 20000, 30000, 50000]),
            'created_at': datetime.now() - timedelta(days=random.randint(1, 365)),
            'updated_at': datetime.now()
        }
        venues.append(venue)
    
    return venues

def generate_concerts(venues, artists, count=100):
    """Generate concert data"""
    concerts = []
    
    for i in range(count):
        venue = random.choice(venues)
        start_time = datetime.now() + timedelta(days=random.randint(1, 180))
        end_time = start_time + timedelta(hours=random.randint(2, 4))
        
        concert = {
            'id': str(uuid.uuid4()),
            'title': random.choice(CONCERT_TITLES) + f' ({i+1})',
            'description': f'An amazing concert experience featuring world-class performances',
            'start_time': start_time,
            'end_time': end_time,
            'venue_id': venue['id'],
            'banner_url': f'https://example.com/concerts/concert_{i+1}.jpg',
            'created_at': datetime.now() - timedelta(days=random.randint(1, 30)),
            'updated_at': datetime.now()
        }
        concerts.append(concert)
    
    return concerts

def generate_concert_artists(concerts, artists):
    """Generate concert-artist relationships"""
    concert_artists = []
    
    for concert in concerts:
        # Each concert has 1-3 artists
        num_artists = random.randint(1, 3)
        selected_artists = random.sample(artists, min(num_artists, len(artists)))
        
        for artist in selected_artists:
            ca = {
                'concert_id': concert['id'],
                'artist_id': artist['id']
            }
            concert_artists.append(ca)
    
    return concert_artists

def generate_seat_zones(venues):
    """Generate seat zones"""
    zones = []
    
    for venue in venues:
        for zone_name in ZONES:
            zone = {
                'id': str(uuid.uuid4()),
                'venue_id': venue['id'],
                'name': zone_name,
                'price': ZONE_PRICES[zone_name],
                'color': ZONE_COLORS[zone_name],
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
            zones.append(zone)
    
    return zones

def generate_seats(venues, seat_zones):
    """Generate seats for venues"""
    seats = []
    
    for venue in venues:
        venue_zones = [z for z in seat_zones if z['venue_id'] == venue['id']]
        
        for zone in venue_zones:
            rows = 10 if zone['name'] != 'VIP' else 5
            seats_per_row = 20
            
            for row_idx in range(rows):
                row_label = chr(65 + row_idx)  # A, B, C, ...
                for seat_num in range(1, seats_per_row + 1):
                    seat = {
                        'id': str(uuid.uuid4()),
                        'venue_id': venue['id'],
                        'zone_id': zone['id'],
                        'row_label': row_label,
                        'seat_number': seat_num,
                        'pos_x': float(seat_num * 10),
                        'pos_y': float(row_idx * 15),
                        'created_at': datetime.now()
                    }
                    seats.append(seat)
    
    return seats

def generate_concert_seats(concerts, seats, count_per_concert=500):
    """Generate concert seats (limited to reasonable amount)"""
    concert_seats = []
    
    for concert in concerts:
        # Get random seats
        selected_seats = random.sample(seats, min(count_per_concert, len(seats)))
        
        for seat in selected_seats:
            statuses = ['available'] * 70 + ['sold'] * 25 + ['reserved'] * 5
            status = random.choice(statuses)
            
            cs = {
                'id': str(uuid.uuid4()),
                'concert_id': concert['id'],
                'seat_id': seat['id'],
                'status': status,
                'reserved_until': datetime.now() + timedelta(minutes=10) if status == 'reserved' else None,
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
            concert_seats.append(cs)
    
    return concert_seats

def generate_orders(users, concerts, count=200):
    """Generate orders"""
    orders = []
    
    for i in range(count):
        user = random.choice(users)
        concert = random.choice(concerts)
        
        statuses = ['pending'] * 30 + ['paid'] * 60 + ['cancelled'] * 10
        status = random.choice(statuses)
        
        order = {
            'id': str(uuid.uuid4()),
            'user_id': user['id'],
            'concert_id': concert['id'],
            'total_price': random.choice([100000, 250000, 350000, 500000]),
            'status': status,
            'created_at': datetime.now() - timedelta(days=random.randint(0, 30)),
            'updated_at': datetime.now()
        }
        orders.append(order)
    
    return orders

def generate_order_items(orders, seats, count_per_order=2):
    """Generate order items"""
    order_items = []
    
    for order in orders:
        num_items = random.randint(1, count_per_order)
        selected_seats = random.sample(seats, min(num_items, len(seats)))
        
        for seat in selected_seats:
            item = {
                'id': str(uuid.uuid4()),
                'order_id': order['id'],
                'seat_id': seat['id'],
                'price': random.choice([100000, 150000, 250000, 350000, 500000]),
                'created_at': datetime.now()
            }
            order_items.append(item)
    
    return order_items

def generate_user_behaviors(users, concerts, count=200):
    """Generate user behaviors"""
    behaviors = []
    actions = ['view', 'click', 'favorite']
    
    for i in range(count):
        behavior = {
            'id': str(uuid.uuid4()),
            'user_id': random.choice(users)['id'],
            'concert_id': random.choice(concerts)['id'],
            'action': random.choice(actions),
            'created_at': datetime.now() - timedelta(days=random.randint(0, 30))
        }
        behaviors.append(behavior)
    
    return behaviors

def generate_favorites(users, concerts, count=100):
    """Generate favorites"""
    favorites = []
    used_pairs = set()
    
    for i in range(count):
        user = random.choice(users)
        concert = random.choice(concerts)
        
        pair = (user['id'], concert['id'])
        if pair not in used_pairs:
            favorite = {
                'user_id': user['id'],
                'concert_id': concert['id'],
                'created_at': datetime.now() - timedelta(days=random.randint(0, 30))
            }
            favorites.append(favorite)
            used_pairs.add(pair)
    
    return favorites

def generate_sql_insert(table_name, data):
    """Generate SQL INSERT statements"""
    if not data:
        return ""
    
    # Get column names from first record
    columns = list(data[0].keys())
    column_names = ', '.join(columns)
    
    sql_lines = [f"-- Inserting {len(data)} rows into {table_name}"]
    
    for record in data:
        values = []
        for col in columns:
            val = record[col]
            if val is None:
                values.append('NULL')
            elif isinstance(val, str):
                # Escape single quotes
                escaped = val.replace("'", "''")
                values.append(f"'{escaped}'")
            elif isinstance(val, datetime):
                values.append(f"'{val.isoformat()}'")
            elif isinstance(val, bool):
                values.append('TRUE' if val else 'FALSE')
            else:
                values.append(str(val))
        
        value_str = ', '.join(values)
        sql_lines.append(f"INSERT INTO {table_name} ({column_names}) VALUES ({value_str});")
    
    return '\n'.join(sql_lines)

def main():
    print("Generating sample data...")
    
    # Generate all data
    users = generate_users(100)
    artists = generate_artists(100)
    venues = generate_venues(50)
    concerts = generate_concerts(venues, artists, 100)
    concert_artists = generate_concert_artists(concerts, artists)
    seat_zones = generate_seat_zones(venues)
    seats = generate_seats(venues, seat_zones)
    
    # For concert seats, we'll create 2000 per show (demonstration)
    concert_seats_list = []
    for concert in concerts:
        concert_specific_seats = random.sample(seats, min(2000, len(seats)))
        concert_seats = []
        for seat in concert_specific_seats:
            statuses = ['available'] * 70 + ['sold'] * 25 + ['reserved'] * 5
            status = random.choice(statuses)
            
            cs = {
                'id': str(uuid.uuid4()),
                'concert_id': concert['id'],
                'seat_id': seat['id'],
                'status': status,
                'reserved_until': datetime.now() + timedelta(minutes=10) if status == 'reserved' else None,
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
            concert_seats.append(cs)
        concert_seats_list.extend(concert_seats)
    
    orders = generate_orders(users, concerts, 200)
    order_items = generate_order_items(orders, seats, 2)
    user_behaviors = generate_user_behaviors(users, concerts, 200)
    favorites = generate_favorites(users, concerts, 100)
    
    # Generate SQL files
    sql_content = []
    
    sql_content.append("""-- Concert Ticket Booking System - Sample Data
-- Generated sample data for testing and development
-- Tables: users, artists, venues, concerts, concert_artists, seat_zones, seats, concert_seats, orders, order_items, user_behaviors, favorites

""")
    
    # Insert users
    sql_content.append(generate_sql_insert('auth_user', [
        {
            'username': u['username'],
            'first_name': '',
            'last_name': '',
            'email': u['email'],
            'password': u['password_hash'],
            'is_staff': True if u['role'] == 'admin' else False,
            'is_active': True,
            'is_superuser': False,
            'last_login': None,
            'date_joined': u['created_at']
        } for u in users
    ]))
    
    sql_content.append("\n\n-- Insert Users (Custom fields)\n")
    for u in users:
        sql_content.append(f"""INSERT INTO users (id, email, password_hash, full_name, avatar_url, role, created_at, updated_at, is_active, is_superuser, is_staff, username, first_name, last_name, last_login, date_joined)
VALUES ('{u['id']}', '{u['email']}', '{u['password_hash']}', '{u['full_name']}', {u['avatar_url']}, '{u['role']}', '{u['created_at'].isoformat()}', '{u['updated_at'].isoformat()}', true, false, {True if u['role'] == 'admin' else False}, '{u['username']}', '', '', NULL, '{u['created_at'].isoformat()}');""")
    
    sql_content.append("\n\n")
    sql_content.append(generate_sql_insert('artists', artists))
    
    sql_content.append("\n\n")
    sql_content.append(generate_sql_insert('venues', venues))
    
    sql_content.append("\n\n")
    sql_content.append(generate_sql_insert('concerts', concerts))
    
    sql_content.append("\n\n")
    sql_content.append(generate_sql_insert('concert_artists', concert_artists))
    
    sql_content.append("\n\n")
    sql_content.append(generate_sql_insert('seat_zones', seat_zones))
    
    sql_content.append("\n\n")
    sql_content.append(generate_sql_insert('seats', seats))
    
    sql_content.append("\n\n-- Concert Seats (2000+ per concert)\n")
    sql_content.append(generate_sql_insert('concert_seats', concert_seats_list))
    
    sql_content.append("\n\n")
    sql_content.append(generate_sql_insert('orders', orders))
    
    sql_content.append("\n\n")
    sql_content.append(generate_sql_insert('order_items', order_items))
    
    sql_content.append("\n\n")
    sql_content.append(generate_sql_insert('user_behaviors', user_behaviors))
    
    sql_content.append("\n\n")
    sql_content.append(generate_sql_insert('favorites', favorites))
    
    # Write to file
    with open('sample_data.sql', 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_content))
    
    print("✓ Generated sample_data.sql")
    
    # Also create a summary
    summary = f"""
=== SAMPLE DATA GENERATION SUMMARY ===

Generated files:
- sample_data.sql: SQL INSERT statements for all tables

Statistics:
- Users: {len(users)}
- Artists: {len(artists)}
- Venues: {len(venues)}
- Concerts: {len(concerts)}
- Concert-Artist relationships: {len(concert_artists)}
- Seat Zones: {len(seat_zones)}
- Seats: {len(seats)}
- Concert Seats: {len(concert_seats_list)} (≈{len(concert_seats_list)//len(concerts)} per concert)
- Orders: {len(orders)}
- Order Items: {len(order_items)}
- User Behaviors: {len(user_behaviors)}
- Favorites: {len(favorites)}

Tables affected:
✓ users (auth_user + users table fields)
✓ artists
✓ venues
✓ concerts
✓ concert_artists
✓ seat_zones
✓ seats
✓ concert_seats
✓ orders
✓ order_items
✓ user_behaviors
✓ favorites
"""
    
    print(summary)
    
    # Write summary
    with open('DATA_GENERATION_SUMMARY.txt', 'w', encoding='utf-8') as f:
        f.write(summary)
    
    print("\n✓ Data generation complete!")
    print("Next steps:")
    print("1. Run: python manage.py migrate")
    print("2. Run: psql -U postgres -d concert_db -f sample_data.sql")
    print("   OR")
    print("   Run: python manage.py shell < load_sample_data.py")

if __name__ == '__main__':
    main()
