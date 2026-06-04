from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Count, Q
from .models import UserBehavior, Favorite
from .serializers import UserBehaviorSerializer, FavoriteSerializer
from app.concerts.models import Concert
from app.artists.models import Artist


class UserBehaviorViewSet(viewsets.ModelViewSet):
    serializer_class = UserBehaviorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserBehavior.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """Log user behavior"""
        concert_id = request.data.get('concert_id')
        action = request.data.get('action', 'view')
        
        try:
            concert = Concert.objects.get(id=concert_id)
            behavior = UserBehavior.objects.create(
                user=request.user,
                concert=concert,
                action=action
            )
            return Response(
                UserBehaviorSerializer(behavior).data,
                status=status.HTTP_201_CREATED
            )
        except Concert.DoesNotExist:
            return Response(
                {'error': 'Concert not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class RecommendationView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def concerts(self, request):
        """Get recommended concerts based on user behavior"""
        # Get user's favorite genres
        user_behaviors = UserBehavior.objects.filter(user=request.user)
        favorite_genres = []
        
        for behavior in user_behaviors:
            for ca in behavior.concert.concert_artists.all():
                favorite_genres.append(ca.artist.genre)
        
        # Get concerts with those genres
        recommended = Concert.objects.filter(
            concert_artists__artist__genre__in=favorite_genres
        ).distinct()[:10]
        
        from app.concerts.serializers import ConcertSerializer
        serializer = ConcertSerializer(recommended, many=True)
        return Response({'recommendedConcerts': serializer.data})

    def get(self, request):
        """Get recommendations: concert-specific or personalized for the user"""
        concert_id = request.query_params.get('concert_id')
        
        # If concert_id is not provided, return personalized user recommendations
        if not concert_id:
            recommended = []
            if request.user.is_authenticated:
                user_behaviors = UserBehavior.objects.filter(user=request.user).select_related('concert')
                favorite_genres = []

                for behavior in user_behaviors:
                    for ca in behavior.concert.concert_artists.all():
                        if ca.artist.genre:
                            favorite_genres.append(ca.artist.genre)

                if favorite_genres:
                    recommended = list(
                        Concert.objects.filter(
                            concert_artists__artist__genre__in=favorite_genres
                        ).distinct()[:5]
                    )

            # Fallback: top 5 upcoming concerts
            if not recommended:
                recommended = list(Concert.objects.all().order_by('start_time')[:5])
                
            from app.concerts.serializers import ConcertSerializer
            serializer = ConcertSerializer(recommended, many=True)
            return Response({
                'recommendedConcerts': serializer.data,
                'recommendedZone': 'VIP'
            })
            
        # If concert_id is provided, execute concert-specific recommendation
        try:
            concert = Concert.objects.get(id=concert_id)
        except Concert.DoesNotExist:
            return Response(
                {'error': 'Concert not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get most popular zones for this concert
        from app.seats.models import ConcertSeat
        popular_zones = ConcertSeat.objects.filter(
            concert=concert,
            status='sold'
        ).values('seat__zone__name').annotate(count=Count('id')).order_by('-count')
        
        recommended_zone = popular_zones.first()['seat__zone__name'] if popular_zones.exists() else 'VIP'
        
        # Fetch related concerts (same venue or featuring same artists)
        related = Concert.objects.filter(
            Q(venue=concert.venue) | Q(concert_artists__artist__in=[ca.artist for ca in concert.concert_artists.all()])
        ).exclude(id=concert.id).distinct()[:5]
        
        from app.concerts.serializers import ConcertSerializer
        serializer = ConcertSerializer(related, many=True)
        
        return Response({
            'recommendedConcerts': serializer.data,
            'recommendedZone': recommended_zone
        })
