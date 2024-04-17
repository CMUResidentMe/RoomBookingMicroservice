from djongo import models


class Room(models.Model):
    ROOM_TYPES = (
        ("party", "Party Room"),
        ("study", "Study Room"),
        ("hangout", "Hangout Room"),
    )
    name = models.CharField(max_length=100)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPES)
    description = models.TextField()
    capacity = models.IntegerField()

    class Meta:
        ordering = ["name"]


class Booking(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    user_id = models.CharField(max_length=100)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_confirmed = models.BooleanField(
        default=False
    )  # For party rooms that require manager confirmation

    class Meta:
        ordering = ["date", "start_time"]
