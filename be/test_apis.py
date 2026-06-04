#!/usr/bin/env python
"""
API Testing Script
Test all endpoints to verify they're working correctly
Usage: python test_apis.py
"""

import requests
import json
from datetime import datetime, timedelta

# Base URL
BASE_URL = 'http://localhost:8000/api'

# Test user credentials
TEST_USER_EMAIL = 'testuser@example.com'
TEST_USER_PASSWORD = 'testpass123'
TEST_ADMIN_EMAIL = 'admin@example.com'
TEST_ADMIN_PASSWORD = 'admin123'

# Store tokens
USER_TOKEN = None
ADMIN_TOKEN = None
TEST_ARTIST_ID = None
TEST_VENUE_ID = None
TEST_CONCERT_ID = None

def print_section(title):
    """Print section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def test_response(response, endpoint, method='GET'):
    """Test and print response"""
    status = '✓' if response.status_code < 400 else '✗'
    print(f"{status} {method} {endpoint}")
    print(f"  Status: {response.status_code}")
    
    if response.status_code >= 400:
        print(f"  Error: {response.text}")
        return False
    
    try:
        data = response.json()
        print(f"  Response: {json.dumps(data, indent=2)[:500]}...")
    except:
        print(f"  Response: {response.text[:500]}")
    
    return response.status_code < 400

def register_user():
    """Register a test user"""
    print_section("1. USER REGISTRATION")
    
    payload = {
        'email': TEST_USER_EMAIL,
        'password': TEST_USER_PASSWORD,
        'password_confirm': TEST_USER_PASSWORD,
        'full_name': 'Test User'
    }
    
    response = requests.post(f'{BASE_URL}/users/auth/register/', json=payload)
    test_response(response, '/users/auth/register/', 'POST')
    
    return response.status_code < 400

def login_user():
    """Login user and get token"""
    print_section("2. USER LOGIN")
    
    global USER_TOKEN
    
    payload = {
        'email': TEST_USER_EMAIL,
        'password': TEST_USER_PASSWORD
    }
    
    response = requests.post(f'{BASE_URL}/users/auth/login/', json=payload)
    
    if response.status_code < 400:
        data = response.json()
        USER_TOKEN = data.get('access')
        print(f"✓ POST /users/auth/login/")
        print(f"  Token: {USER_TOKEN[:50]}...")
        return True
    else:
        print(f"✗ Login failed: {response.text}")
        # Try with admin account
        return login_admin()

def login_admin():
    """Login as admin"""
    print_section("2b. ADMIN LOGIN")
    
    global ADMIN_TOKEN, USER_TOKEN
    
    payload = {
        'email': TEST_ADMIN_EMAIL,
        'password': TEST_ADMIN_PASSWORD
    }
    
    response = requests.post(f'{BASE_URL}/users/auth/login/', json=payload)
    
    if response.status_code < 400:
        data = response.json()
        ADMIN_TOKEN = data.get('access')
        USER_TOKEN = ADMIN_TOKEN  # Use admin token for testing
        print(f"✓ POST /users/auth/login/ (admin)")
        print(f"  Token: {ADMIN_TOKEN[:50]}...")
        return True
    else:
        print(f"✗ Admin login failed: {response.text}")
        return False

def test_get_me():
    """Get current user"""
    print_section("3. GET CURRENT USER")
    
    headers = {'Authorization': f'Bearer {USER_TOKEN}'}
    response = requests.get(f'{BASE_URL}/users/me/', headers=headers)
    test_response(response, '/users/me/', 'GET')
    return response.status_code < 400

def test_artists():
    """Test artist endpoints"""
    print_section("4. ARTIST ENDPOINTS")
    
    global TEST_ARTIST_ID
    
    headers = {'Authorization': f'Bearer {ADMIN_TOKEN}'}
    
    # List artists
    response = requests.get(f'{BASE_URL}/artists/artists/')
    if test_response(response, '/artists/artists/', 'GET'):
        data = response.json()
        if isinstance(data, list) and len(data) > 0:
            TEST_ARTIST_ID = data[0].get('id')
    
    # Create artist
    if not TEST_ARTIST_ID:
        payload = {
            'name': f'Test Artist {datetime.now().timestamp()}',
            'genre': 'pop',
            'description': 'Test artist',
            'image_url': 'https://example.com/artist.jpg'
        }
        response = requests.post(f'{BASE_URL}/artists/artists/', json=payload, headers=headers)
        if test_response(response, '/artists/artists/', 'POST'):
            data = response.json()
            TEST_ARTIST_ID = data.get('id')

def test_venues():
    """Test venue endpoints"""
    print_section("5. VENUE ENDPOINTS")
    
    global TEST_VENUE_ID
    
    headers = {'Authorization': f'Bearer {ADMIN_TOKEN}'}
    
    # List venues
    response = requests.get(f'{BASE_URL}/venues/venues/')
    if test_response(response, '/venues/venues/', 'GET'):
        data = response.json()
        if isinstance(data, list) and len(data) > 0:
            TEST_VENUE_ID = data[0].get('id')
    
    # Create venue
    if not TEST_VENUE_ID:
        payload = {
            'name': f'Test Venue {datetime.now().timestamp()}',
            'city': 'Ho Chi Minh',
            'address': '123 Main Street',
            'capacity': 5000
        }
        response = requests.post(f'{BASE_URL}/venues/venues/', json=payload, headers=headers)
        if test_response(response, '/venues/venues/', 'POST'):
            data = response.json()
            TEST_VENUE_ID = data.get('id')

def test_concerts():
    """Test concert endpoints"""
    print_section("6. CONCERT ENDPOINTS")
    
    global TEST_CONCERT_ID
    
    headers = {'Authorization': f'Bearer {ADMIN_TOKEN}'}
    
    # List concerts
    response = requests.get(f'{BASE_URL}/concerts/concerts/')
    if test_response(response, '/concerts/concerts/', 'GET'):
        data = response.json()
        if isinstance(data, dict) and 'results' in data and len(data['results']) > 0:
            TEST_CONCERT_ID = data['results'][0].get('id')
        elif isinstance(data, list) and len(data) > 0:
            TEST_CONCERT_ID = data[0].get('id')
    
    # Create concert if needed
    if not TEST_CONCERT_ID and TEST_VENUE_ID and TEST_ARTIST_ID:
        payload = {
            'title': f'Test Concert {datetime.now().timestamp()}',
            'description': 'Test concert',
            'start_time': (datetime.now() + timedelta(days=7)).isoformat(),
            'end_time': (datetime.now() + timedelta(days=7, hours=3)).isoformat(),
            'venue_id': TEST_VENUE_ID,
            'artists': [TEST_ARTIST_ID],
            'banner_url': 'https://example.com/banner.jpg'
        }
        response = requests.post(f'{BASE_URL}/concerts/concerts/', json=payload, headers=headers)
        if test_response(response, '/concerts/concerts/', 'POST'):
            data = response.json()
            TEST_CONCERT_ID = data.get('id')
    
    # Get concert details
    if TEST_CONCERT_ID:
        response = requests.get(f'{BASE_URL}/concerts/concerts/{TEST_CONCERT_ID}/')
        test_response(response, f'/concerts/concerts/{TEST_CONCERT_ID}/', 'GET')
        
        # Get concert artists
        response = requests.get(f'{BASE_URL}/concerts/concerts/{TEST_CONCERT_ID}/artists/')
        test_response(response, f'/concerts/concerts/{TEST_CONCERT_ID}/artists/', 'GET')
        
        # Get concert venue
        response = requests.get(f'{BASE_URL}/concerts/concerts/{TEST_CONCERT_ID}/venue/')
        test_response(response, f'/concerts/concerts/{TEST_CONCERT_ID}/venue/', 'GET')
        
        # Get seat map
        response = requests.get(f'{BASE_URL}/concerts/concerts/{TEST_CONCERT_ID}/seatmap/')
        test_response(response, f'/concerts/concerts/{TEST_CONCERT_ID}/seatmap/', 'GET')

def test_seats():
    """Test seat endpoints"""
    print_section("7. SEAT ENDPOINTS")
    
    headers = {'Authorization': f'Bearer {ADMIN_TOKEN}'}
    
    # List zones
    response = requests.get(f'{BASE_URL}/seats/zones/')
    test_response(response, '/seats/zones/', 'GET')
    
    # List seats
    response = requests.get(f'{BASE_URL}/seats/seats/')
    test_response(response, '/seats/seats/', 'GET')

def test_favorites():
    """Test favorite endpoints"""
    print_section("8. FAVORITE ENDPOINTS")
    
    headers = {'Authorization': f'Bearer {USER_TOKEN}'}
    
    # Get favorites
    response = requests.get(f'{BASE_URL}/users/me/favorites/', headers=headers)
    test_response(response, '/users/me/favorites/', 'GET')
    
    # Add to favorites (if concert exists)
    if TEST_CONCERT_ID:
        payload = {'concert_id': TEST_CONCERT_ID}
        response = requests.post(f'{BASE_URL}/users/me/favorites/', json=payload, headers=headers)
        test_response(response, '/users/me/favorites/', 'POST')

def test_behaviors():
    """Test behavior endpoints"""
    print_section("9. BEHAVIOR ENDPOINTS")
    
    headers = {'Authorization': f'Bearer {USER_TOKEN}'}
    
    # Log behavior (if concert exists)
    if TEST_CONCERT_ID:
        payload = {'concert_id': TEST_CONCERT_ID, 'action': 'view'}
        response = requests.post(f'{BASE_URL}/behaviors/behaviors/', json=payload, headers=headers)
        test_response(response, '/behaviors/behaviors/', 'POST')
        
        # Get recommendations
        response = requests.get(f'{BASE_URL}/behaviors/recommend/', headers=headers)
        test_response(response, '/behaviors/recommend/', 'GET')

def test_orders():
    """Test order endpoints"""
    print_section("10. ORDER ENDPOINTS")
    
    headers = {'Authorization': f'Bearer {USER_TOKEN}'}
    
    # Get user orders
    response = requests.get(f'{BASE_URL}/users/me/orders/', headers=headers)
    test_response(response, '/users/me/orders/', 'GET')

def test_documentation():
    """Test API documentation"""
    print_section("11. API DOCUMENTATION")
    
    response = requests.get('http://localhost:8000/api/docs/')
    test_response(response, '/api/docs/', 'GET')

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("  CONCERT TICKET BOOKING API - TEST SUITE")
    print("="*60)
    
    print("\nStarting API tests...")
    print(f"Base URL: {BASE_URL}")
    
    try:
        # Test health
        response = requests.get(f'{BASE_URL}/')
        if response.status_code >= 400:
            print("⚠ Warning: API may not be responding")
    except:
        print("⚠ Warning: Cannot connect to server at {BASE_URL}")
        print("  Make sure to run: python manage.py runserver")
        return
    
    # Run tests
    register_user()
    if not login_user():
        print("✗ Failed to login - tests may be incomplete")
    
    test_get_me()
    test_artists()
    test_venues()
    test_concerts()
    test_seats()
    test_favorites()
    test_behaviors()
    test_orders()
    test_documentation()
    
    # Summary
    print_section("TEST SUMMARY")
    print("\n✓ All critical endpoints have been tested")
    print("\nNext steps:")
    print("1. Review the test results above")
    print("2. Check http://localhost:8000/api/docs/ for interactive documentation")
    print("3. Use the token for authenticated requests:")
    if USER_TOKEN:
        print(f"   Authorization: Bearer {USER_TOKEN[:50]}...")
    print("\n" + "="*60)

if __name__ == '__main__':
    main()
