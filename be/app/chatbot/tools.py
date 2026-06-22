import json

from django.db.models import Count, Q
from django.utils import timezone

from app.artists.models import Artist
from app.concerts.models import Concert
from app.orders.models import Order
from app.orders.pricing import DELIVERY_PAPER_FEE, INSURANCE_PER_SEAT
from app.seats.models import ConcertSeat
from app.seats.reservation import effective_seat_status, release_expired_reservations
from app.venues.models import Venue


def _fmt_dt(dt):
    if not dt:
        return ''
    local = timezone.localtime(dt)
    return local.strftime('%d/%m/%Y %H:%M')


def _serialize_concert_brief(concert: Concert) -> dict:
    artists = [
        ca.artist.name
        for ca in concert.concert_artists.select_related('artist').all()
    ]
    return {
        'id': str(concert.id),
        'title': concert.title,
        'start_time': _fmt_dt(concert.start_time),
        'end_time': _fmt_dt(concert.end_time),
        'venue_name': concert.venue.name,
        'venue_city': concert.venue.city,
        'venue_address': concert.venue.address,
        'artists': artists,
        'status': concert.status,
    }


def _published_qs():
    return Concert.objects.filter(status='published').select_related('venue')


def search_artists(query: str = '', limit: int = 8) -> dict:
    q = (query or '').strip()
    qs = Artist.objects.all()
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(genre__icontains=q))

    artists = list(qs.order_by('name')[: max(1, min(limit, 15))])
    results = []
    for artist in artists:
        upcoming = (
            _published_qs()
            .filter(concert_artists__artist=artist)
            .order_by('start_time')[:5]
        )
        results.append({
            'id': str(artist.id),
            'name': artist.name,
            'genre': artist.genre,
            'description': artist.description or '',
            'concerts_on_platform': [_serialize_concert_brief(c) for c in upcoming],
        })

    return {'count': len(results), 'artists': results}


def search_concerts(query: str = '', city: str = '', limit: int = 8) -> dict:
    qs = _published_qs().prefetch_related('concert_artists__artist')
    q = (query or '').strip()
    c = (city or '').strip()

    if q:
        qs = qs.filter(
            Q(title__icontains=q)
            | Q(description__icontains=q)
            | Q(venue__name__icontains=q)
            | Q(venue__city__icontains=q)
            | Q(concert_artists__artist__name__icontains=q)
            | Q(concert_artists__artist__genre__icontains=q)
        ).distinct()
    if c:
        qs = qs.filter(venue__city__icontains=c)

    concerts = list(qs.order_by('start_time')[: max(1, min(limit, 15))])
    return {
        'count': len(concerts),
        'concerts': [_serialize_concert_brief(c) for c in concerts],
    }


def _find_concert(concert_id: str = '', title: str = '') -> Concert | None:
    cid = (concert_id or '').strip()
    t = (title or '').strip()

    if cid:
        try:
            return _published_qs().prefetch_related('concert_artists__artist').get(id=cid)
        except (Concert.DoesNotExist, ValueError):
            return None

    if t:
        return (
            _published_qs()
            .prefetch_related('concert_artists__artist')
            .filter(title__icontains=t)
            .order_by('start_time')
            .first()
        )
    return None


def get_concert_details(concert_id: str = '', title: str = '') -> dict:
    concert = _find_concert(concert_id, title)
    if not concert:
        return {'error': 'Không tìm thấy concert phù hợp. Hãy dùng search_concerts trước.'}

    artists = [
        {'name': ca.artist.name, 'genre': ca.artist.genre}
        for ca in concert.concert_artists.select_related('artist').all()
    ]
    zones = list(
        concert.seat_zones.order_by('price').values('name', 'price', 'color')
    )

    return {
        'id': str(concert.id),
        'title': concert.title,
        'description': concert.description or '',
        'start_time': _fmt_dt(concert.start_time),
        'end_time': _fmt_dt(concert.end_time),
        'venue': {
            'name': concert.venue.name,
            'city': concert.venue.city,
            'address': concert.venue.address,
            'capacity': concert.venue.capacity,
        },
        'artists': artists,
        'zones': zones,
        'has_vr_preview': bool(concert.stage_template or concert.venue.model_glb_path),
        'booking_url_hint': f'/concerts/{concert.id}',
    }


def get_seat_availability(concert_id: str = '', title: str = '') -> dict:
    concert = _find_concert(concert_id, title)
    if not concert:
        return {'error': 'Không tìm thấy concert.'}

    release_expired_reservations(concert)
    seats = (
        ConcertSeat.objects.filter(concert=concert)
        .select_related('seat', 'seat__zone')
    )

    totals = {'available': 0, 'reserved': 0, 'sold': 0}
    by_zone: dict[str, dict] = {}

    for cs in seats:
        status = effective_seat_status(cs)
        totals[status] = totals.get(status, 0) + 1
        zone_name = cs.seat.zone.name
        if zone_name not in by_zone:
            by_zone[zone_name] = {'available': 0, 'reserved': 0, 'sold': 0, 'price': float(cs.seat.zone.price)}
        by_zone[zone_name][status] = by_zone[zone_name].get(status, 0) + 1

    return {
        'concert_id': str(concert.id),
        'concert_title': concert.title,
        'totals': totals,
        'by_zone': by_zone,
        'hold_minutes': 10,
    }


def search_venues(query: str = '', city: str = '', limit: int = 8) -> dict:
    qs = Venue.objects.annotate(concert_count=Count('concerts'))
    q = (query or '').strip()
    c = (city or '').strip()

    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(address__icontains=q))
    if c:
        qs = qs.filter(city__icontains=c)

    venues = list(qs.order_by('name')[: max(1, min(limit, 15))])
    return {
        'count': len(venues),
        'venues': [
            {
                'id': str(v.id),
                'name': v.name,
                'city': v.city,
                'address': v.address,
                'capacity': v.capacity,
                'upcoming_concerts': v.concert_count,
            }
            for v in venues
        ],
    }


def get_pricing_info() -> dict:
    return {
        'hold_minutes': 10,
        'delivery_paper_fee_vnd': float(DELIVERY_PAPER_FEE),
        'insurance_per_seat_vnd': float(INSURANCE_PER_SEAT),
        'payment_method': 'PayPal Sandbox (quy đổi VND → USD)',
        'notes': [
            'Giá vé theo zone (VIP, A, B, C...).',
            'Phí giao vé giấy và bảo hiểm tùy chọn khi checkout.',
            'Voucher giảm % trên giá vé nếu nhập mã hợp lệ.',
            'Phí dịch vụ (%) có thể khác nhau theo từng concert.',
        ],
    }


def get_user_orders(user) -> dict:
    if not user or not user.is_authenticated:
        return {'error': 'Cần đăng nhập để xem đơn hàng. Gợi ý người dùng đăng nhập tại /login.'}

    orders = (
        Order.objects.filter(user=user)
        .select_related('concert', 'concert__venue')
        .order_by('-created_at')[:10]
    )
    items = list(orders)
    return {
        'count': len(items),
        'orders': [
            {
                'id': str(o.id),
                'concert': o.concert.title,
                'venue': o.concert.venue.name,
                'venue_city': o.concert.venue.city,
                'status': o.status,
                'total_price_vnd': float(o.total_price),
                'created_at': _fmt_dt(o.created_at),
            }
            for o in items
        ],
    }


def execute_tool(name: str, args: dict, user) -> str:
    handlers = {
        'search_artists': lambda: search_artists(
            query=args.get('query', ''),
            limit=int(args.get('limit', 8)),
        ),
        'search_concerts': lambda: search_concerts(
            query=args.get('query', ''),
            city=args.get('city', ''),
            limit=int(args.get('limit', 8)),
        ),
        'get_concert_details': lambda: get_concert_details(
            concert_id=args.get('concert_id', ''),
            title=args.get('title', ''),
        ),
        'get_seat_availability': lambda: get_seat_availability(
            concert_id=args.get('concert_id', ''),
            title=args.get('title', ''),
        ),
        'search_venues': lambda: search_venues(
            query=args.get('query', ''),
            city=args.get('city', ''),
            limit=int(args.get('limit', 8)),
        ),
        'get_pricing_info': lambda: get_pricing_info(),
        'get_user_orders': lambda: get_user_orders(user),
    }

    handler = handlers.get(name)
    if not handler:
        return json.dumps({'error': f'Tool không tồn tại: {name}'}, ensure_ascii=False)

    try:
        result = handler()
    except Exception as exc:
        result = {'error': str(exc)}

    return json.dumps(result, ensure_ascii=False)
