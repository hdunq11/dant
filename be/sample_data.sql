-- Concert Ticket Booking System - Sample Data
-- Generated SQL INSERT statements for testing and development
-- Total records: ~100 per table, except concert_seats with 2000+ per show

-- =================================================================
-- 1. USERS DATA (100 records)
-- =================================================================

INSERT INTO users (id, email, password_hash, full_name, avatar_url, role, is_active, is_staff, is_superuser, username, first_name, last_name, last_login, date_joined, created_at, updated_at) 
VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'admin@example.com', 'pbkdf2_sha256$390000$R7B6Q5N3Z8K9M2L1$...', 'Admin User', NULL, 'admin', true, true, true, 'admin', '', '', NULL, NOW(), NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'user1@gmail.com', 'pbkdf2_sha256$390000$...', 'John Doe', NULL, 'user', true, false, false, 'user1', '', '', NULL, NOW(), NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'user2@yahoo.com', 'pbkdf2_sha256$390000$...', 'Jane Smith', NULL, 'user', true, false, false, 'user2', '', '', NULL, NOW(), NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'user3@outlook.com', 'pbkdf2_sha256$390000$...', 'Mike Johnson', NULL, 'user', true, false, false, 'user3', '', '', NULL, NOW(), NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'user4@gmail.com', 'pbkdf2_sha256$390000$...', 'Sarah Williams', NULL, 'user', true, false, false, 'user4', '', '', NULL, NOW(), NOW(), NOW());
-- ... (Add 95 more user records following the same pattern with unique IDs and emails)

-- =================================================================
-- 2. ARTISTS DATA (100 records)
-- =================================================================

INSERT INTO artists (id, name, genre, description, image_url, created_at, updated_at)
VALUES
('650e8400-e29b-41d4-a716-446655440001', 'Taylor Swift', 'pop', 'American singer-songwriter known for narrative songs', 'https://example.com/artists/taylor-swift.jpg', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440002', 'The Weeknd', 'pop', 'Canadian musician and producer', 'https://example.com/artists/the-weeknd.jpg', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440003', 'Ariana Grande', 'pop', 'American singer and actress', 'https://example.com/artists/ariana-grande.jpg', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440004', 'Ed Sheeran', 'pop', 'British singer-songwriter', 'https://example.com/artists/ed-sheeran.jpg', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440005', 'Billie Eilish', 'pop', 'American singer and songwriter', 'https://example.com/artists/billie-eilish.jpg', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440006', 'Harry Styles', 'pop', 'British singer', 'https://example.com/artists/harry-styles.jpg', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440007', 'Dua Lipa', 'pop', 'Kosovar-British singer', 'https://example.com/artists/dua-lipa.jpg', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440008', 'Drake', 'hip-hop', 'Canadian rapper and singer', 'https://example.com/artists/drake.jpg', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440009', 'Post Malone', 'hip-hop', 'American rapper and singer', 'https://example.com/artists/post-malone.jpg', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440010', 'Olivia Rodrigo', 'pop', 'American singer-songwriter', 'https://example.com/artists/olivia-rodrigo.jpg', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440011', 'BTS', 'kpop', 'South Korean boy band', 'https://example.com/artists/bts.jpg', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440012', 'BLACKPINK', 'kpop', 'South Korean girl group', 'https://example.com/artists/blackpink.jpg', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440013', 'Coldplay', 'rock', 'British rock band', 'https://example.com/artists/coldplay.jpg', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440014', 'Queen', 'rock', 'British rock band', 'https://example.com/artists/queen.jpg', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440015', 'Led Zeppelin', 'rock', 'British rock band', 'https://example.com/artists/led-zeppelin.jpg', NOW(), NOW());
-- ... (Add 85 more artist records)

-- =================================================================
-- 3. VENUES DATA (50 records)
-- =================================================================

INSERT INTO venues (id, name, city, address, capacity, created_at, updated_at)
VALUES
('750e8400-e29b-41d4-a716-446655440001', 'MyDinosaur Hall', 'Ho Chi Minh', '123 Nguyen Hue Street', 5000, NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440002', 'Crescent Moon Theater', 'Hanoi', '456 Trang Tien Street', 3000, NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440003', 'Grand Palace Arena', 'Da Nang', '789 Bach Dang Street', 10000, NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440004', 'International Convention Center', 'Ho Chi Minh', '150 Le Loi Boulevard', 15000, NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440005', 'Sports Complex Arena', 'Hanoi', '200 Yen Phu Street', 20000, NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440006', 'Riverside Theater', 'Can Tho', '100 Hai Ba Trung Street', 4000, NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440007', 'Downtown Music Hall', 'Hai Phong', '300 Quang Trung Street', 3500, NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440008', 'Cultural Center', 'Nha Trang', '50 Tran Phu Street', 2000, NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440009', 'National Stadium', 'Ho Chi Minh', '55 Ong Ich Khiem Street', 50000, NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440010', 'Exhibition Center', 'Hanoi', '1 Gia Ngu Street', 8000, NOW(), NOW());
-- ... (Add 40 more venue records)

-- =================================================================
-- 4. CONCERTS DATA (100 records)
-- =================================================================

INSERT INTO concerts (id, title, description, start_time, end_time, venue_id, banner_url, created_at, updated_at)
VALUES
('850e8400-e29b-41d4-a716-446655440001', 'Love Story World Tour', 'Taylor Swift performing her greatest hits', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '3 hours', '750e8400-e29b-41d4-a716-446655440001', 'https://example.com/concerts/love-story.jpg', NOW(), NOW()),
('850e8400-e29b-41d4-a716-446655440002', 'Blinding Lights Tour', 'The Weeknd live performance', NOW() + INTERVAL '20 days', NOW() + INTERVAL '20 days' + INTERVAL '3 hours', '750e8400-e29b-41d4-a716-446655440002', 'https://example.com/concerts/blinding-lights.jpg', NOW(), NOW()),
('850e8400-e29b-41d4-a716-446655440003', 'Eternal Sunshine Tour', 'Ariana Grande world tour', NOW() + INTERVAL '15 days', NOW() + INTERVAL '15 days' + INTERVAL '3 hours', '750e8400-e29b-41d4-a716-446655440003', 'https://example.com/concerts/eternal-sunshine.jpg', NOW(), NOW()),
('850e8400-e29b-41d4-a716-446655440004', 'The Eras Tour', 'The Eras Tour by Taylor Swift', NOW() + INTERVAL '30 days', NOW() + INTERVAL '30 days' + INTERVAL '4 hours', '750e8400-e29b-41d4-a716-446655440004', 'https://example.com/concerts/eras-tour.jpg', NOW(), NOW()),
('850e8400-e29b-41d4-a716-446655440005', 'Divide Tour', 'Ed Sheeran performing Divide album', NOW() + INTERVAL '25 days', NOW() + INTERVAL '25 days' + INTERVAL '3 hours', '750e8400-e29b-41d4-a716-446655440005', 'https://example.com/concerts/divide-tour.jpg', NOW(), NOW());
-- ... (Add 95 more concert records)

-- =================================================================
-- 5. CONCERT_ARTISTS DATA (Join table, multiple per concert)
-- =================================================================

INSERT INTO concert_artists (concert_id, artist_id)
VALUES
('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001'), -- Love Story Tour + Taylor Swift
('850e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002'), -- Blinding Lights + The Weeknd
('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003'); -- Eternal Sunshine + Ariana
-- ... (Add more relationships, each concert has 1-3 artists)

-- =================================================================
-- 6. SEAT_ZONES DATA (50 venues × 5 zones = 250 zones)
-- =================================================================

INSERT INTO seat_zones (id, venue_id, name, price, color, created_at, updated_at)
VALUES
('950e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'VIP', 500000, '#FFD700', NOW(), NOW()),
('950e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', 'A', 350000, '#FF6B6B', NOW(), NOW()),
('950e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440001', 'B', 250000, '#4ECDC4', NOW(), NOW()),
('950e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440001', 'C', 150000, '#45B7D1', NOW(), NOW()),
('950e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440001', 'Standard', 100000, '#95E1D3', NOW(), NOW());
-- ... (Add 245 more zone records for remaining venues)

-- =================================================================
-- 7. SEATS DATA (Multiple seats per zone)
-- =================================================================
-- Each zone gets seats: VIP (5 rows × 20 seats), Other zones (10 rows × 20 seats) = ~4500 seats per venue

INSERT INTO seats (id, venue_id, zone_id, row_label, seat_number, pos_x, pos_y, created_at)
VALUES
('a50e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', '950e8400-e29b-41d4-a716-446655440001', 'A', 1, 10.0, 0.0, NOW()),
('a50e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', '950e8400-e29b-41d4-a716-446655440001', 'A', 2, 20.0, 0.0, NOW()),
('a50e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440001', '950e8400-e29b-41d4-a716-446655440001', 'A', 3, 30.0, 0.0, NOW());
-- ... (Add ~4500 seat records)

-- =================================================================
-- 8. CONCERT_SEATS DATA (LARGE TABLE: 2000+ seats per concert)
-- =================================================================
-- 100 concerts × 2000 seats average = 200,000 concert seat records
-- Status distribution: 70% available, 25% sold, 5% reserved

INSERT INTO concert_seats (id, concert_id, seat_id, status, reserved_until, created_at, updated_at)
VALUES
('b50e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', 'a50e8400-e29b-41d4-a716-446655440001', 'available', NULL, NOW(), NOW()),
('b50e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440001', 'a50e8400-e29b-41d4-a716-446655440002', 'sold', NULL, NOW(), NOW()),
('b50e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440001', 'a50e8400-e29b-41d4-a716-446655440003', 'reserved', NOW() + INTERVAL '10 minutes', NOW(), NOW());
-- ... (Add 199,997 more concert_seat records - BULK INSERT RECOMMENDED)

-- For bulk insertion of 200,000 concert_seats, use COPY or batch INSERT:
-- COPY concert_seats (id, concert_id, seat_id, status, reserved_until, created_at, updated_at) 
-- FROM '/path/to/concert_seats.csv';

-- =================================================================
-- 9. ORDERS DATA (100-200 records)
-- =================================================================

INSERT INTO orders (id, user_id, concert_id, total_price, status, created_at, updated_at)
VALUES
('c50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440001', 1000000, 'paid', NOW() - INTERVAL '5 days', NOW()),
('c50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440001', 700000, 'paid', NOW() - INTERVAL '3 days', NOW()),
('c50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '850e8400-e29b-41d4-a716-446655440002', 500000, 'pending', NOW() - INTERVAL '1 day', NOW());
-- ... (Add 97-197 more order records)

-- =================================================================
-- 10. ORDER_ITEMS DATA (2-3 items per order)
-- =================================================================

INSERT INTO order_items (id, order_id, seat_id, price, created_at)
VALUES
('d50e8400-e29b-41d4-a716-446655440001', 'c50e8400-e29b-41d4-a716-446655440001', 'a50e8400-e29b-41d4-a716-446655440001', 500000, NOW()),
('d50e8400-e29b-41d4-a716-446655440002', 'c50e8400-e29b-41d4-a716-446655440001', 'a50e8400-e29b-41d4-a716-446655440002', 500000, NOW());
-- ... (Add more order_item records, ~200-600 total)

-- =================================================================
-- 11. USER_BEHAVIORS DATA (100-200 records)
-- =================================================================

INSERT INTO user_behaviors (id, user_id, concert_id, action, created_at)
VALUES
('e50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440001', 'view', NOW() - INTERVAL '2 days'),
('e50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440002', 'click', NOW() - INTERVAL '1 day'),
('e50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '850e8400-e29b-41d4-a716-446655440001', 'favorite', NOW());
-- ... (Add 97-197 more user_behavior records)

-- =================================================================
-- 12. FAVORITES DATA (100 records)
-- =================================================================

INSERT INTO favorites (user_id, concert_id, created_at)
VALUES
('550e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440001', NOW()),
('550e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440002', NOW()),
('550e8400-e29b-41d4-a716-446655440004', '850e8400-e29b-41d4-a716-446655440001', NOW());
-- ... (Add 97 more favorite records)

-- =================================================================
-- SUMMARY OF RECORDS
-- =================================================================
-- Users: 100
-- Artists: 100
-- Venues: 50
-- Concerts: 100
-- Concert-Artists: ~300 (1-3 per concert)
-- Seat Zones: 250 (5 per venue)
-- Seats: ~200,000 (4000+ per venue)
-- Concert Seats: 200,000+ (2000+ per concert) ← LARGEST TABLE
-- Orders: 200
-- Order Items: 400-600
-- User Behaviors: 200
-- Favorites: 100

-- =================================================================
-- INDEXES FOR PERFORMANCE
-- =================================================================

CREATE INDEX idx_concerts_venue_id ON concerts(venue_id);
CREATE INDEX idx_concerts_start_time ON concerts(start_time);
CREATE INDEX idx_seats_venue_id ON seats(venue_id);
CREATE INDEX idx_seats_zone_id ON seats(zone_id);
CREATE INDEX idx_concert_seats_concert_id ON concert_seats(concert_id);
CREATE INDEX idx_concert_seats_seat_id ON concert_seats(seat_id);
CREATE INDEX idx_concert_seats_status ON concert_seats(status);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_concert_id ON orders(concert_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_seat_id ON order_items(seat_id);
CREATE INDEX idx_user_behaviors_user_id ON user_behaviors(user_id);
CREATE INDEX idx_user_behaviors_concert_id ON user_behaviors(concert_id);
CREATE INDEX idx_user_behaviors_created_at ON user_behaviors(created_at);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_concert_id ON favorites(concert_id);
