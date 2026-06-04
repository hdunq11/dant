#!/bin/bash
# API Test Commands - Manual testing with curl
# Copy and paste these commands to test the API

# ================================================================
# Setup
# ================================================================

# Server running at:
SERVER="http://localhost:8000"
API="$SERVER/api"

# ================================================================
# 1. AUTHENTICATION ENDPOINTS
# ================================================================

echo "=== 1. REGISTRATION ==="
curl -X POST "$API/users/auth/register/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "testpass123",
    "password_confirm": "testpass123",
    "full_name": "Test User"
  }'

echo -e "\n\n=== 2. LOGIN ==="
curl -X POST "$API/users/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'

# Save token from response as:
# TOKEN="<your_access_token_here>"

echo -e "\n\n=== 3. GET CURRENT USER ==="
# Replace TOKEN with actual token
curl -X GET "$API/users/me/" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n=== 4. UPDATE PROFILE ==="
curl -X PUT "$API/users/me/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Updated Name",
    "avatar_url": "https://example.com/avatar.jpg"
  }'

# ================================================================
# 5. ARTIST ENDPOINTS
# ================================================================

echo -e "\n\n=== 5. LIST ARTISTS ==="
curl -X GET "$API/artists/artists/"

echo -e "\n\n=== 6. FILTER ARTISTS BY GENRE ==="
curl -X GET "$API/artists/artists/?genre=pop"

echo -e "\n\n=== 7. SEARCH ARTISTS ==="
curl -X GET "$API/artists/artists/?search=Taylor"

echo -e "\n\n=== 8. CREATE ARTIST (ADMIN ONLY) ==="
curl -X POST "$API/artists/artists/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Artist",
    "genre": "pop",
    "description": "Amazing performer",
    "image_url": "https://example.com/artist.jpg"
  }'

# ================================================================
# 9. VENUE ENDPOINTS
# ================================================================

echo -e "\n\n=== 9. LIST VENUES ==="
curl -X GET "$API/venues/venues/"

echo -e "\n\n=== 10. FILTER VENUES BY CITY ==="
curl -X GET "$API/venues/venues/?city=Ho%20Chi%20Minh"

echo -e "\n\n=== 11. CREATE VENUE (ADMIN ONLY) ==="
curl -X POST "$API/venues/venues/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Venue",
    "city": "Hanoi",
    "address": "123 Main Street",
    "capacity": 5000
  }'

# ================================================================
# 12. CONCERT ENDPOINTS
# ================================================================

echo -e "\n\n=== 12. LIST ALL CONCERTS ==="
curl -X GET "$API/concerts/concerts/"

echo -e "\n\n=== 13. FILTER CONCERTS BY GENRE ==="
curl -X GET "$API/concerts/concerts/?genre=pop"

echo -e "\n\n=== 14. FILTER BY CITY ==="
curl -X GET "$API/concerts/concerts/?city=Ho%20Chi%20Minh"

echo -e "\n\n=== 15. FILTER BY DATE ==="
curl -X GET "$API/concerts/concerts/?date=2024-06-15"

echo -e "\n\n=== 16. SEARCH CONCERTS ==="
curl -X GET "$API/concerts/concerts/?search=Tour"

echo -e "\n\n=== 17. GET CONCERT DETAILS ==="
# Replace CONCERT_ID with actual ID
curl -X GET "$API/concerts/concerts/{CONCERT_ID}/"

echo -e "\n\n=== 18. GET CONCERT ARTISTS ==="
curl -X GET "$API/concerts/concerts/{CONCERT_ID}/artists/"

echo -e "\n\n=== 19. GET CONCERT VENUE ==="
curl -X GET "$API/concerts/concerts/{CONCERT_ID}/venue/"

echo -e "\n\n=== 20. GET SEAT MAP (CRITICAL FOR UI) ==="
curl -X GET "$API/concerts/concerts/{CONCERT_ID}/seatmap/"

echo -e "\n\n=== 21. CREATE CONCERT (ADMIN ONLY) ==="
curl -X POST "$API/concerts/concerts/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Concert",
    "description": "Amazing concert",
    "start_time": "2024-07-15T19:00:00Z",
    "end_time": "2024-07-15T22:00:00Z",
    "venue_id": "{VENUE_ID}",
    "artists": ["{ARTIST_ID}"],
    "banner_url": "https://example.com/banner.jpg"
  }'

# ================================================================
# 22. SEAT & ZONE ENDPOINTS
# ================================================================

echo -e "\n\n=== 22. LIST SEAT ZONES ==="
curl -X GET "$API/seats/zones/"

echo -e "\n\n=== 23. LIST SEATS ==="
curl -X GET "$API/seats/seats/"

echo -e "\n\n=== 24. FILTER SEATS BY ZONE ==="
curl -X GET "$API/seats/seats/?zone_id={ZONE_ID}"

echo -e "\n\n=== 25. CREATE SEAT ZONE (ADMIN ONLY) ==="
curl -X POST "$API/seats/zones/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "venue_id": "{VENUE_ID}",
    "name": "VIP",
    "price": "500000",
    "color": "#FFD700"
  }'

echo -e "\n\n=== 26. AUTO-GENERATE SEATS (ADMIN ONLY) ==="
curl -X POST "$API/seats/zones/{ZONE_ID}/generate-seats/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rows": ["A", "B", "C", "D", "E"],
    "seats_per_row": 20
  }'

# ================================================================
# 27. BOOKING FLOW ENDPOINTS
# ================================================================

echo -e "\n\n=== 27. RESERVE SEATS (10-minute timeout) ==="
curl -X POST "$API/seats/booking/reserve/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "concert_id": "{CONCERT_ID}",
    "seat_ids": ["{SEAT_ID_1}", "{SEAT_ID_2}"]
  }'

echo -e "\n\n=== 28. CREATE ORDER ==="
curl -X POST "$API/orders/orders/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "concert_id": "{CONCERT_ID}",
    "seat_ids": ["{SEAT_ID_1}", "{SEAT_ID_2}"]
  }'

echo -e "\n\n=== 29. PROCESS PAYMENT (MOCK) ==="
curl -X POST "$API/orders/orders/{ORDER_ID}/pay/" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n=== 30. CANCEL ORDER ==="
curl -X POST "$API/orders/orders/{ORDER_ID}/cancel/" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n=== 31. GET USER ORDERS ==="
curl -X GET "$API/users/me/orders/" \
  -H "Authorization: Bearer $TOKEN"

# ================================================================
# 32. FAVORITES ENDPOINTS
# ================================================================

echo -e "\n\n=== 32. GET FAVORITES ==="
curl -X GET "$API/users/me/favorites/" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n=== 33. ADD TO FAVORITES ==="
curl -X POST "$API/users/me/favorites/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "concert_id": "{CONCERT_ID}"
  }'

echo -e "\n\n=== 34. REMOVE FROM FAVORITES ==="
curl -X DELETE "$API/users/me/favorites/{CONCERT_ID}/" \
  -H "Authorization: Bearer $TOKEN"

# ================================================================
# 35. USER BEHAVIOR & RECOMMENDATIONS
# ================================================================

echo -e "\n\n=== 35. LOG USER BEHAVIOR ==="
curl -X POST "$API/behaviors/behaviors/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "concert_id": "{CONCERT_ID}",
    "action": "view"
  }'

echo -e "\n\n=== 36. GET RECOMMENDATIONS ==="
curl -X GET "$API/behaviors/recommend/" \
  -H "Authorization: Bearer $TOKEN"

# ================================================================
# 37. API DOCUMENTATION
# ================================================================

echo -e "\n\n=== 37. SWAGGER UI (INTERACTIVE DOCS) ==="
echo "Open in browser: $SERVER/api/docs/"

# ================================================================
# RESPONSE EXAMPLES
# ================================================================

cat <<'EOF'

=================================================================
RESPONSE EXAMPLES
=================================================================

1. LOGIN RESPONSE:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "User Name",
    "role": "user"
  }
}

2. LIST CONCERTS RESPONSE:
{
  "count": 100,
  "next": "http://localhost:8000/api/concerts/concerts/?page=2",
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "title": "Concert Title",
      "start_time": "2024-06-15T19:00:00Z",
      "end_time": "2024-06-15T22:00:00Z",
      "venue": {
        "id": "uuid",
        "name": "Venue Name",
        "city": "Ho Chi Minh"
      },
      "concert_artists": [
        {
          "artist": {
            "id": "uuid",
            "name": "Artist Name",
            "genre": "pop"
          }
        }
      ]
    }
  ]
}

3. SEAT MAP RESPONSE:
{
  "zones": [
    {
      "zone_id": "uuid",
      "name": "VIP",
      "price": 500000,
      "color": "#FFD700",
      "seats": [
        {
          "seat_id": "uuid",
          "row": "A",
          "number": 1,
          "status": "available",
          "pos_x": 10.0,
          "pos_y": 0.0
        }
      ]
    }
  ]
}

4. ORDER RESPONSE:
{
  "id": "uuid",
  "user": "uuid",
  "concert": "uuid",
  "total_price": 1000000,
  "status": "pending",
  "items": [
    {
      "id": "uuid",
      "seat": {...},
      "price": 500000
    }
  ]
}

=================================================================
ERROR RESPONSES
=================================================================

400 - Bad Request:
{
  "error": "Invalid request data",
  "details": {"field": ["error message"]}
}

401 - Unauthorized:
{
  "detail": "Invalid token or missing authorization header"
}

403 - Forbidden:
{
  "detail": "You do not have permission to perform this action"
}

404 - Not Found:
{
  "detail": "Resource not found"
}

500 - Server Error:
{
  "detail": "Internal server error"
}

=================================================================
TIPS FOR TESTING
=================================================================

1. Save token in environment variable:
   export TOKEN=$(curl -s -X POST "http://localhost:8000/api/users/auth/login/" \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"admin123"}' | grep -o '"access":"[^"]*' | cut -d'"' -f4)
   echo $TOKEN

2. Use jq to format JSON responses:
   curl ... | jq

3. Save pretty-printed responses:
   curl ... | jq > response.json

4. Test paginated results:
   curl "$API/concerts/concerts/?page=1&page_size=10"

5. Test sorting:
   curl "$API/concerts/concerts/?ordering=-start_time"

6. View all error details:
   curl ... -i  # Include headers

7. Debug requests:
   curl -v ...  # Verbose mode

EOF
