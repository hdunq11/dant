from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import UserSerializer, UserRegisterSerializer, UserLoginSerializer, UserProfileUpdateSerializer
from app.behaviors.models import Favorite
from app.orders.models import Order


class UserRegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = (AllowAny,)


class UserLoginView(generics.GenericAPIView):
    serializer_class = UserLoginSerializer
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            user = None
            
        if not user or not user.check_password(password):
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })


class UserMeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method == 'PUT' or self.request.method == 'PATCH':
            return UserProfileUpdateSerializer
        return UserSerializer


class UserFavoritesView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    pagination_class = None

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user).select_related('concert', 'concert__venue')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        favorites = []
        for fav in queryset:
            concert = fav.concert
            venue = concert.venue
            favorites.append({
                'id': str(concert.id),
                'title': concert.title,
                'description': concert.description,
                'start_time': concert.start_time.isoformat() if concert.start_time else None,
                'end_time': concert.end_time.isoformat() if concert.end_time else None,
                'banner_url': concert.banner_url,
                'venue': {
                    'id': str(venue.id) if venue else None,
                    'name': venue.name if venue else None,
                    'city': venue.city if venue else None,
                } if venue else None,
                'concert_artists': [],
            })
        return Response(favorites)

    def create(self, request, *args, **kwargs):
        concert_id = request.data.get('concert_id')
        from app.concerts.models import Concert
        try:
            concert = Concert.objects.get(id=concert_id)
            favorite, created = Favorite.objects.get_or_create(
                user=request.user,
                concert=concert
            )
            if created:
                return Response(
                    {'message': 'Added to favorites'},
                    status=status.HTTP_201_CREATED
                )
            return Response(
                {'message': 'Already in favorites'},
                status=status.HTTP_200_OK
            )
        except Concert.DoesNotExist:
            return Response(
                {'error': 'Concert not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class UserFavoriteDeleteView(generics.DestroyAPIView):
    permission_classes = (IsAuthenticated,)

    def delete(self, request, concert_id, *args, **kwargs):
        deleted, _ = Favorite.objects.filter(
            user=request.user,
            concert_id=concert_id,
        ).delete()
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(
            {'error': 'Favorite not found'},
            status=status.HTTP_404_NOT_FOUND,
        )


class UserOrdersView(generics.ListAPIView):
    serializer_class = None
    permission_classes = (IsAuthenticated,)
    pagination_class = None

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        orders = []
        for order in queryset.select_related('concert', 'concert__venue'):
            concert = order.concert
            venue = concert.venue if concert else None
            orders.append({
                'id': str(order.id),
                'concert_title': concert.title if concert else None,
                'concert_venue_name': venue.name if venue else None,
                'concert_city': venue.city if venue else None,
                'concert_start_time': concert.start_time.isoformat() if concert and concert.start_time else None,
                'concert_end_time': concert.end_time.isoformat() if concert and concert.end_time else None,
                'seat_subtotal': float(getattr(order, 'seat_subtotal', 0) or 0),
                'booking_fee': float(getattr(order, 'booking_fee', 0) or 0),
                'delivery_fee': float(getattr(order, 'delivery_fee', 0) or 0),
                'insurance_fee': float(getattr(order, 'insurance_fee', 0) or 0),
                'discount_amount': float(getattr(order, 'discount_amount', 0) or 0),
                'voucher_code': order.voucher_code,
                'delivery_method': order.delivery_method,
                'payment_method': order.payment_method,
                'total_price': float(order.total_price),
                'status': order.status,
                'created_at': order.created_at.isoformat(),
            })
        return Response(orders)
