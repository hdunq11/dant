from rest_framework import serializers


class ChatMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['user', 'assistant'])
    content = serializers.CharField(max_length=4000)


class ChatRequestSerializer(serializers.Serializer):
    messages = ChatMessageSerializer(many=True)

    def validate_messages(self, value):
        if not value:
            raise serializers.ValidationError('Cần ít nhất một tin nhắn.')
        if len(value) > 30:
            raise serializers.ValidationError('Lịch sử hội thoại quá dài.')
        if value[-1]['role'] != 'user':
            raise serializers.ValidationError('Tin nhắn cuối phải từ người dùng.')
        return value
