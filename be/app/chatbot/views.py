from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .groq_client import chat_with_tools
from .serializers import ChatRequestSerializer


class ChatMessageView(APIView):
    """Chatbot CSKH — khách và user đều dùng được; tool đơn hàng cần JWT."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        messages = [
            {'role': m['role'], 'content': m['content']}
            for m in serializer.validated_data['messages']
        ]

        try:
            reply = chat_with_tools(messages, request.user)
        except RuntimeError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception:
            return Response(
                {'error': 'Chatbot tạm thời không khả dụng. Vui lòng thử lại sau.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({'reply': reply})
