import os
import django

# Set the correct settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")
django.setup()

from bookings.models import Room

rooms = [
    {
        "name": "Party Hall",
        "room_type": "party",
        "description": "A large hall suitable for parties.",
        "capacity": 150,
    },
    {
        "name": "Study Room",
        "room_type": "study",
        "description": "Quiet room for studying.",
        "capacity": 25,
    },
    {
        "name": "Hangout Area",
        "room_type": "hangout",
        "description": "Casual room for hangouts.",
        "capacity": 50,
    },
]

for room in rooms:
    Room.objects.create(**room)

print("Rooms created successfully!")
