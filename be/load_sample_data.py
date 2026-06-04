#!/usr/bin/env python
"""
Load sample data directly into Django models
Usage: python manage.py shell < load_sample_data.py
"""
import uuid
import json
from datetime import datetime, timedelta
import random
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from app.users.models import User
from app.artists.models import Artist
from app.venues.models import Venue
from app.concerts.models import Concert, ConcertArtist
from app.seats.models import SeatZone, Seat, ConcertSeat
from app.orders.models import Order, OrderItem
from app.behaviors.models import UserBehavior, Favorite

# Lists for generating realistic data
GENRES = ['pop', 'rock', 'kpop', 'hip-hop', 'jazz', 'electronic', 'classical', 'country']
CITIES = ['Ho Chi Minh', 'Hanoi', 'Da Nang', 'Can Tho', 'Hai Phong', 'Nha Trang', 'Phu Quoc']
ZONES = ['VIP', 'A', 'B', 'C', 'Standard']
ZONE_COLORS = {'VIP': '#FFD700', 'A': '#FF6B6B', 'B': '#4ECDC4', 'C': '#45B7D1', 'Standard': '#95E1D3'}
ZONE_PRICES = {'VIP': 500000, 'A': 350000, 'B': 250000, 'C': 150000, 'Standard': 100000}

ARTIST_NAMES = [
    'Taylor Swift', 'The Weeknd', 'Ariana Grande', 'Ed Sheeran', 'Billie Eilish',
    'Harry Styles', 'Dua Lipa', 'Drake', 'Post Malone', 'Olivia Rodrigo',
    'Justin Bieber', 'Nicki Minaj', 'Eminem', 'Travis Scott', 'BTS',
    'BLACKPINK', 'EXO', 'Stray Kids', 'NewJeans', 'Coldplay'
]

VENUE_NAMES = [
    'MyDinosaur', 'Crescent Moon Theater', 'Grand Palace Hall',
    'International Convention Center', 'Sports Complex Arena',
    'Riverside Theater', 'Downtown Music Hall', 'Cultural Center'
]

def create_sample_data():
    """Create sample data in database"""
    print("Loading sample data into Django models...")
    
    # Clear existing data (optional - uncomment if needed)
    # User.objects.all().delete()
    # Artist.objects.all().delete()
    # Venue.objects.all().delete()
    
    # 1. Create Users (100)
    print("Creating users...")
    users = []
    domains = ['gmail.com', 'yahoo.com', 'outlook.com']
    
    # Create admin user first
    admin_user, _ = User.objects.get_or_create(
        email='admin@example.com',
        defaults={
            'username': 'admin',
            'full_name': 'Admin User',
            'role': 'admin',
            'is_staff': True,
            'is_superuser': True
        }
    )
    admin_user.set_password('admin123')
    admin_user.save()
    users.append(admin_user)
    
    for i in range(1, 100):
        email = f'user{i}@{random.choice(domains)}'
        user, created = User.objects.get_or_create(
            username=f'user{i}',
            defaults={
                'email': email,
                'full_name': f'User {i}',
                'role': 'user',
                'is_staff': False,
                'is_superuser': False,
            },
        )
        if created:
            user.set_password(f'password{i}')
            user.save()
        users.append(user)
    
    print(f"✓ Created/retrieved {len(users)} users")
    
    # 2. Create Artists (100)
    print("Creating artists...")
    artists = []
    
    for i, name in enumerate(ARTIST_NAMES):
        artist, created = Artist.objects.get_or_create(
            name=name,
            defaults={
                'genre': random.choice(GENRES),
                'description': f'Popular {random.choice(GENRES)} artist',
                'image_url': f'https://example.com/artists/artist_{i+1}.jpg'
            }
        )
        artists.append(artist)
    
    # Add more artists to reach 100
    for i in range(len(ARTIST_NAMES), 100):
        artist, created = Artist.objects.get_or_create(
            name=f'Artist {i}',
            defaults={
                'genre': random.choice(GENRES),
                'description': f'Amazing performer',
                'image_url': f'https://example.com/artists/artist_{i}.jpg'
            }
        )
        if created:
            artists.append(artist)
    
    print(f"✓ Created/retrieved {len(artists)} artists")
    
    # 3. Create Venues (50)
    print("Creating venues...")
    venues = []
    
    for i in range(50):
        venue, created = Venue.objects.get_or_create(
            name=f'{VENUE_NAMES[i % len(VENUE_NAMES)]} #{i+1}',
            defaults={
                'city': random.choice(CITIES),
                'address': f'{random.randint(1, 500)} Main Street',
                'capacity': random.choice([5000, 10000, 15000, 20000, 30000, 50000])
            }
        )
        venues.append(venue)
    
    print(f"✓ Created/retrieved {len(venues)} venues")
    
    # 4. Create Concerts (100)
    print("Creating concerts...")
    concerts = []
    
    for i in range(100):
        venue = random.choice(venues)
        start_time = datetime.now() + timedelta(days=random.randint(1, 180))
        end_time = start_time + timedelta(hours=3)
        
        concert, created = Concert.objects.get_or_create(
            title=f'Concert {i+1}',
            start_time=start_time,
            venue=venue,
            defaults={
                'description': f'Amazing concert',
                'end_time': end_time,
                'banner_url': f'https://example.com/concerts/{i+1}.jpg'
            }
        )
        concerts.append(concert)
        
        # Add 1-3 artists to each concert
        for artist in random.sample(artists, random.randint(1, 3)):
            ConcertArtist.objects.get_or_create(concert=concert, artist=artist)
    
    print(f"✓ Created/retrieved {len(concerts)} concerts")
    
    # 5. Create Seat Zones and Seats
    # unique_together on Seat is (venue, row_label, seat_number) — row labels must be unique per venue across all zones
    print("Creating seat zones and seats...")
    seats_per_row = 20
    seats_created = 0

    for venue in venues:
        row_offset = 0
        for zone_name in ZONES:
            zone, _ = SeatZone.objects.get_or_create(
                venue=venue,
                name=zone_name,
                defaults={
                    'price': ZONE_PRICES[zone_name],
                    'color': ZONE_COLORS[zone_name],
                },
            )

            if Seat.objects.filter(zone=zone).exists():
                row_offset += 5 if zone_name == 'VIP' else 10
                continue

            rows = 5 if zone_name == 'VIP' else 10
            for row_idx in range(rows):
                row_label = chr(65 + row_offset + row_idx)
                for seat_num in range(1, seats_per_row + 1):
                    _, created = Seat.objects.get_or_create(
                        venue=venue,
                        row_label=row_label,
                        seat_number=seat_num,
                        defaults={
                            'zone': zone,
                            'pos_x': float(seat_num * 10),
                            'pos_y': float((row_offset + row_idx) * 15),
                        },
                    )
                    if created:
                        seats_created += 1
            row_offset += rows

    print(f"✓ Created {seats_created} new seats ({Seat.objects.count()} total)")
    
    # 6. Create Concert Seats (2000+ per concert)
    print("Creating concert seats...")
    
    all_seats = Seat.objects.all()
    seat_count = 0
    
    for concert in concerts:
        # Create 2000 concert seats per show
        selected_seats = random.sample(list(all_seats), min(2000, len(all_seats)))
        
        for seat in selected_seats:
            statuses = ['available'] * 70 + ['sold'] * 25 + ['reserved'] * 5
            status = random.choice(statuses)
            
            reserved_until = None
            if status == 'reserved':
                reserved_until = datetime.now() + timedelta(minutes=10)
            
            ConcertSeat.objects.get_or_create(
                concert=concert,
                seat=seat,
                defaults={
                    'status': status,
                    'reserved_until': reserved_until
                }
            )
            seat_count += 1
    
    print(f"✓ Created {seat_count} concert seats")
    
    # 7. Create Orders (200)
    print("Creating orders...")
    orders = []
    
    for i in range(200):
        user = random.choice(users)
        concert = random.choice(concerts)
        
        statuses = ['pending'] * 30 + ['paid'] * 60 + ['cancelled'] * 10
        status = random.choice(statuses)
        
        order, created = Order.objects.get_or_create(
            user=user,
            concert=concert,
            defaults={
                'total_price': random.choice([100000, 250000, 350000, 500000]),
                'status': status
            }
        )
        if created:
            orders.append(order)
    
    print(f"✓ Created {len(orders)} orders")
    
    # 8. Create Order Items
    print("Creating order items...")
    
    for order in orders:
        num_items = random.randint(1, 3)
        concert_seats = list(order.concert.concert_seats.filter(status='available')[:num_items])
        
        for cs in concert_seats:
            OrderItem.objects.get_or_create(
                order=order,
                seat=cs.seat,
                defaults={'price': cs.seat.zone.price}
            )
    
    print(f"✓ Created order items")
    
    # 9. Create User Behaviors (200)
    print("Creating user behaviors...")
    actions = ['view', 'click', 'favorite']
    
    for i in range(200):
        UserBehavior.objects.create(
            user=random.choice(users),
            concert=random.choice(concerts),
            action=random.choice(actions)
        )
    
    print("✓ Created 200 user behaviors")
    
    # 10. Create Favorites (100)
    print("Creating favorites...")
    
    for i in range(100):
        user = random.choice(users)
        concert = random.choice(concerts)
        
        Favorite.objects.get_or_create(
            user=user,
            concert=concert
        )
    
    print("✓ Created 100 favorites")
    
    print("\n=== SAMPLE DATA LOADED SUCCESSFULLY ===")
    print(f"✓ Users: {User.objects.count()}")
    print(f"✓ Artists: {Artist.objects.count()}")
    print(f"✓ Venues: {Venue.objects.count()}")
    print(f"✓ Concerts: {Concert.objects.count()}")
    print(f"✓ Seat Zones: {SeatZone.objects.count()}")
    print(f"✓ Seats: {Seat.objects.count()}")
    print(f"✓ Concert Seats: {ConcertSeat.objects.count()}")
    print(f"✓ Orders: {Order.objects.count()}")
    print(f"✓ Order Items: {OrderItem.objects.count()}")
    print(f"✓ User Behaviors: {UserBehavior.objects.count()}")
    print(f"✓ Favorites: {Favorite.objects.count()}")

if __name__ == '__main__':
    create_sample_data()
