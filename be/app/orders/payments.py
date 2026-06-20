import base64
import json
import urllib.error
import urllib.request
from decimal import Decimal

from django.conf import settings


class PayPalNotConfiguredError(Exception):
    pass


def _api_base() -> str:
    mode = getattr(settings, 'PAYPAL_MODE', 'sandbox') or 'sandbox'
    if mode.lower() == 'live':
        return 'https://api-m.paypal.com'
    return 'https://api-m.sandbox.paypal.com'


def _is_configured() -> bool:
    return bool(settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET)


def _format_amount(total_price, currency: str) -> str:
    value = Decimal(str(total_price))
    if currency.upper() in {'VND', 'JPY', 'KRW'}:
        return str(int(value))
    return f'{value:.2f}'


def _paypal_amount_for_order(order) -> tuple[str, str]:
    """Giá đơn hàng lưu VND; PayPal sandbox nhận USD."""
    vnd_total = Decimal(str(order.total_price))
    currency = settings.PAYPAL_CURRENCY.upper()

    if currency == 'USD':
        vnd_per_usd = Decimal(str(getattr(settings, 'PAYPAL_VND_PER_USD', 25000)))
        usd_amount = (vnd_total / vnd_per_usd).quantize(Decimal('0.01'))
        return 'USD', f'{usd_amount:.2f}'

    return currency, _format_amount(vnd_total, currency)


def _request(method: str, path: str, token: str | None = None, body: dict | None = None) -> dict:
    url = f'{_api_base()}{path}'
    data = None
    headers = {'Accept': 'application/json'}
    if body is not None:
        data = json.dumps(body).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    if token:
        headers['Authorization'] = f'Bearer {token}'

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode('utf-8')
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'PayPal API error {exc.code}: {detail}') from exc
    except urllib.error.URLError as exc:
        reason = str(exc.reason)
        if 'getaddrinfo failed' in reason or 'Name or service not known' in reason:
            raise RuntimeError(
                'Máy chạy backend không kết nối được PayPal Sandbox '
                f'({_api_base()}). Kiểm tra internet/DNS trên máy đó.'
            ) from exc
        raise RuntimeError(f'Không kết nối được PayPal: {reason}') from exc


def _get_access_token() -> str:
    if not _is_configured():
        raise PayPalNotConfiguredError(
            'PayPal sandbox chưa được cấu hình. Đặt PAYPAL_CLIENT_ID và PAYPAL_CLIENT_SECRET trong .env'
        )

    auth = base64.b64encode(
        f'{settings.PAYPAL_CLIENT_ID}:{settings.PAYPAL_CLIENT_SECRET}'.encode()
    ).decode()
    req = urllib.request.Request(
        f'{_api_base()}/v1/oauth2/token',
        data=b'grant_type=client_credentials',
        headers={
            'Authorization': f'Basic {auth}',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'PayPal auth error {exc.code}: {detail}') from exc
    except urllib.error.URLError as exc:
        reason = str(exc.reason)
        if 'getaddrinfo failed' in reason or 'Name or service not known' in reason:
            raise RuntimeError(
                'Máy chạy backend không kết nối được PayPal Sandbox '
                f'({_api_base()}). Kiểm tra internet/DNS trên máy đó.'
            ) from exc
        raise RuntimeError(f'Không kết nối được PayPal: {reason}') from exc

    token = payload.get('access_token')
    if not token:
        raise RuntimeError('PayPal không trả về access_token')
    return token


def _extract_approval_url(paypal_response: dict) -> str | None:
    for link in paypal_response.get('links', []):
        if link.get('rel') == 'approve':
            return link.get('href')
    return None


def create_paypal_order_for_order(order, return_url: str | None = None, cancel_url: str | None = None) -> dict:
    token = _get_access_token()
    currency, amount_value = _paypal_amount_for_order(order)

    payload = {
        'intent': 'CAPTURE',
        'purchase_units': [
            {
                'reference_id': str(order.id),
                'custom_id': str(order.id),
                'description': f'ConcertGo order {order.id}',
                'amount': {
                    'currency_code': currency,
                    'value': amount_value,
                },
            }
        ],
    }

    if return_url and cancel_url:
        payload['application_context'] = {
            'return_url': return_url,
            'cancel_url': cancel_url,
            'brand_name': 'ConcertGo',
            'user_action': 'PAY_NOW',
        }

    if order.paypal_order_id:
        try:
            existing = _request('GET', f'/v2/checkout/orders/{order.paypal_order_id}', token=token)
            if existing.get('status') in {'CREATED', 'APPROVED'}:
                existing['approval_url'] = _extract_approval_url(existing)
                return existing
        except Exception:
            order.paypal_order_id = ''

    created = _request('POST', '/v2/checkout/orders', token=token, body=payload)
    created['approval_url'] = _extract_approval_url(created)
    return created


def _verify_capture_payload(captured: dict, order) -> tuple[bool, str | None]:
    if captured.get('status') != 'COMPLETED':
        return False, f'Thanh toán chưa hoàn tất (trạng thái: {captured.get("status")})'

    try:
        unit = captured['purchase_units'][0]
        capture = unit['payments']['captures'][0]
        amount = capture['amount']
        expected_currency, expected_value = _paypal_amount_for_order(order)

        if amount.get('currency_code', '').upper() != expected_currency:
            return False, 'Tiền tệ thanh toán không khớp'

        paid = Decimal(amount.get('value', '0'))
        expected = Decimal(expected_value)
        if paid != expected:
            return False, 'Số tiền thanh toán không khớp với đơn hàng'

        custom_id = unit.get('custom_id') or unit.get('reference_id')
        if custom_id and custom_id != str(order.id):
            return False, 'Đơn PayPal không khớp với đơn hàng'
    except (KeyError, IndexError, TypeError):
        return False, 'Phản hồi PayPal không hợp lệ'

    return True, None


def capture_and_verify_paypal_order(order, paypal_order_id: str) -> tuple[bool, str | None]:
    token = _get_access_token()
    current = _request('GET', f'/v2/checkout/orders/{paypal_order_id}', token=token)
    paypal_status = current.get('status')

    if paypal_status == 'COMPLETED':
        return _verify_capture_payload(current, order)

    if paypal_status != 'APPROVED':
        return False, f'Thanh toán chưa được duyệt (trạng thái: {paypal_status})'

    try:
        captured = _request('POST', f'/v2/checkout/orders/{paypal_order_id}/capture', token=token, body={})
    except RuntimeError as exc:
        err = str(exc)
        if '422' in err or 'ORDER_ALREADY_CAPTURED' in err:
            current = _request('GET', f'/v2/checkout/orders/{paypal_order_id}', token=token)
            if current.get('status') == 'COMPLETED':
                return _verify_capture_payload(current, order)
        raise

    return _verify_capture_payload(captured, order)
