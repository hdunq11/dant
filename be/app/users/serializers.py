from rest_framework import serializers
from .models import User, OrganizerProfile


class OrganizerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizerProfile
        fields = (
            'id',
            'company_name',
            'business_license',
            'contact_phone',
            'status',
            'rejection_reason',
            'reviewed_at',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class UserSerializer(serializers.ModelSerializer):
    organizer_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'full_name',
            'avatar_url',
            'role',
            'is_staff',
            'organizer_profile',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'role', 'is_staff', 'organizer_profile', 'created_at', 'updated_at')

    def get_organizer_profile(self, obj):
        try:
            profile = obj.organizer_profile
        except OrganizerProfile.DoesNotExist:
            return None
        return OrganizerProfileSerializer(profile).data


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, min_length=6)
    register_as_organizer = serializers.BooleanField(default=False, write_only=True)
    company_name = serializers.CharField(max_length=255, required=False, allow_blank=True, write_only=True)
    business_license = serializers.CharField(max_length=100, required=False, allow_blank=True, write_only=True)
    contact_phone = serializers.CharField(max_length=20, required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = (
            'email',
            'password',
            'password_confirm',
            'full_name',
            'register_as_organizer',
            'company_name',
            'business_license',
            'contact_phone',
        )

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Mật khẩu xác nhận không khớp.'})

        if data.get('register_as_organizer'):
            if not data.get('company_name', '').strip():
                raise serializers.ValidationError({'company_name': 'Vui lòng nhập tên doanh nghiệp / tổ chức.'})
            if not data.get('business_license', '').strip():
                raise serializers.ValidationError({'business_license': 'Vui lòng nhập mã số đăng ký kinh doanh.'})

        return data

    def create(self, validated_data):
        register_as_organizer = validated_data.pop('register_as_organizer', False)
        company_name = validated_data.pop('company_name', '').strip()
        business_license = validated_data.pop('business_license', '').strip()
        contact_phone = validated_data.pop('contact_phone', '').strip()
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        email = validated_data.get('email')
        username = email.split('@')[0]

        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f'{base_username}_{counter}'
            counter += 1

        if register_as_organizer:
            validated_data['role'] = 'organizer'

        user = User(username=username, **validated_data)
        user.set_password(password)
        user.save()

        if register_as_organizer:
            OrganizerProfile.objects.create(
                user=user,
                company_name=company_name,
                business_license=business_license,
                contact_phone=contact_phone,
                status='pending',
            )

        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('full_name', 'avatar_url')
