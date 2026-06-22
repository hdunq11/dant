import json
import re
import time
import urllib.error
import urllib.request

from django.conf import settings

from .tools import execute_tool

GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

SYSTEM_PROMPT = """Bạn là trợ lý CSKH của ConcertGo — nền tảng đặt vé concert trực tuyến.
Bạn có kiến thức chung như ChatGPT VÀ có thể tra cứu dữ liệu thật trên hệ thống qua tools.

## Khi nào DÙNG TOOLS (dữ liệu trên ConcertGo)
Chỉ dùng tools cho thông tin gắn với nền tảng — không được đoán:
- Concert đang mở bán, lịch diễn, venue (địa chỉ, thành phố)
- Ghế còn trống / đã bán, giá zone
- Đơn hàng của user đã đăng nhập
- Nghệ sĩ / show có trong database ConcertGo (search_artists, search_concerts)

## Khi nào TRẢ LỜI TRỰC TIẾP (kiến thức chung, không cần tool)
- Câu hỏi "X là ai?", "X hát thể loại gì?", gợi ý nghe nhạc, small talk
- Giải thích quy trình đặt vé, PayPal, VR preview (theo hướng dẫn bên dưới)
- Kiến thức về ca sĩ, nghệ sĩ, văn hóa âm nhạc — trả lời tự nhiên từ kiến thức của bạn

## Kết hợp cả hai (quan trọng)
Ví dụ "Hoàng Dũng là ai?":
1. Trả lời ngắn gọn ca sĩ Hoàng Dũng là ai (kiến thức chung).
2. Gọi search_artists hoặc search_concerts để xem có show trên ConcertGo không.
3. Nếu chưa có show trên app → vẫn trả lời phần giới thiệu nghệ sĩ; nhẹ nhàng nói hiện chưa có concert của họ trên ConcertGo, không từ chối trả lời.

## Hướng dẫn nền tảng
- Đặt vé: chọn concert → chọn ghế → giữ chỗ 10 phút → checkout PayPal Sandbox
- VR preview: user đã đăng nhập xem thử ghế 3D tại trang concert
- Xem đơn hàng: cần đăng nhập tại /login

Trả lời tiếng Việt, thân thiện, ngắn gọn. Không tiết lộ API key hay chi tiết kỹ thuật."""

TOOLS = [
    {
        'type': 'function',
        'function': {
            'name': 'search_artists',
            'description': 'Tìm nghệ sĩ trong database ConcertGo và concert liên quan trên nền tảng.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'query': {'type': 'string', 'description': 'Tên nghệ sĩ hoặc thể loại'},
                    'limit': {'type': 'integer', 'default': 8},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'search_concerts',
            'description': 'Tìm concert đang published theo tên show, nghệ sĩ, thể loại, tên/city venue.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'query': {'type': 'string', 'description': 'Từ khóa tìm kiếm'},
                    'city': {'type': 'string', 'description': 'Lọc theo thành phố venue'},
                    'limit': {'type': 'integer', 'description': 'Số kết quả tối đa', 'default': 8},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_concert_details',
            'description': 'Chi tiết một concert: mô tả, thời gian, venue (tên, địa chỉ, thành phố), nghệ sĩ, zone giá.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'concert_id': {'type': 'string', 'description': 'UUID concert'},
                    'title': {'type': 'string', 'description': 'Tên concert (nếu không có id)'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_seat_availability',
            'description': 'Số ghế còn trống/đã bán/đang giữ theo zone của một concert.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'concert_id': {'type': 'string'},
                    'title': {'type': 'string'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'search_venues',
            'description': 'Tìm địa điểm (venue) tổ chức concert theo tên hoặc thành phố.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'query': {'type': 'string'},
                    'city': {'type': 'string'},
                    'limit': {'type': 'integer', 'default': 8},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_pricing_info',
            'description': 'Quy tắc tính giá: phí giữ chỗ, giao vé giấy, bảo hiểm, thanh toán.',
            'parameters': {'type': 'object', 'properties': {}},
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_user_orders',
            'description': 'Đơn hàng gần đây của người dùng đang đăng nhập (tối đa 10).',
            'parameters': {'type': 'object', 'properties': {}},
        },
    },
]


def _parse_retry_seconds(detail: str) -> float:
    match = re.search(r'try again in ([\d.]+)s', detail, re.I)
    if match:
        return min(float(match.group(1)) + 0.5, 30.0)
    return 2.0


def _call_groq(messages: list, tools: list | None = None, *, retry: bool = True) -> dict:
    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise RuntimeError('GROQ_API_KEY chưa được cấu hình trên server.')

    payload: dict = {
        'model': settings.GROQ_MODEL,
        'messages': messages,
        'temperature': 0.2,
        'max_tokens': 768,
    }
    if tools:
        payload['tools'] = tools
        payload['tool_choice'] = 'auto'

    body = json.dumps(payload).encode('utf-8')
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': f'Bearer {api_key}',
        # Cloudflare (Groq) chặn urllib mặc định — error 1010 nếu thiếu User-Agent
        'User-Agent': 'ConcertGo-Chatbot/1.0 (Django; +https://groq.com)',
    }

    last_error: Exception | None = None
    attempts = 3 if retry else 1
    for attempt in range(attempts):
        req = urllib.request.Request(GROQ_API_URL, data=body, headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode('utf-8', errors='replace')
            if exc.code == 429 and attempt + 1 < attempts:
                time.sleep(_parse_retry_seconds(detail))
                continue
            if exc.code == 400 and 'tool_use_failed' in detail and attempt + 1 < attempts:
                continue
            if exc.code == 429:
                raise RuntimeError(
                    'Groq đang quá tải (rate limit). Vui lòng đợi vài giây rồi thử lại.'
                ) from exc
            if exc.code == 403:
                raise RuntimeError(
                    'Không kết nối được Groq API. Kiểm tra GROQ_API_KEY và khởi động lại server.'
                ) from exc
            raise RuntimeError(f'Groq API lỗi {exc.code}: {detail}') from exc


def chat_with_tools(messages: list[dict], user, max_rounds: int = 6) -> str:
    full_messages = [{'role': 'system', 'content': SYSTEM_PROMPT}, *messages]

    for _ in range(max_rounds):
        data = _call_groq(full_messages, TOOLS)
        choice = data['choices'][0]['message']

        tool_calls = choice.get('tool_calls')
        if tool_calls:
            full_messages.append(choice)
            for tc in tool_calls:
                fn = tc.get('function') or {}
                name = fn.get('name', '')
                try:
                    args = json.loads(fn.get('arguments') or '{}')
                except json.JSONDecodeError:
                    args = {}
                result = execute_tool(name, args, user)
                full_messages.append({
                    'role': 'tool',
                    'tool_call_id': tc['id'],
                    'name': name,
                    'content': result,
                })
            continue

        content = (choice.get('content') or '').strip()
        if content:
            return content
        return 'Xin lỗi, tôi chưa có câu trả lời phù hợp. Bạn thử hỏi lại nhé.'

    return 'Xin lỗi, yêu cầu quá phức tạp. Bạn thử hỏi ngắn gọn hơn nhé.'
