from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAdminUser
from .models import Venue
from .serializers import VenueSerializer


class VenueViewSet(viewsets.ModelViewSet):
    queryset = Venue.objects.all().order_by('name')
    serializer_class = VenueSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticatedOrReadOnly]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]
