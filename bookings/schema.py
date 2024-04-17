import graphene
from graphene_django import DjangoObjectType
from django.db.models import Q
from .models import Room, Booking


class RoomType(DjangoObjectType):
    class Meta:
        model = Room
        fields = "__all__"


class BookingType(DjangoObjectType):
    class Meta:
        model = Booking
        fields = "__all__"


class Query(graphene.ObjectType):
    all_rooms = graphene.List(RoomType)
    available_rooms_by_type = graphene.List(
        RoomType,
        room_type=graphene.String(required=True),
        date=graphene.Date(),
        start_time=graphene.Time(),
        end_time=graphene.Time(),
    )

    def resolve_all_rooms(self, info):
        return Room.objects.all()

    def resolve_available_rooms_by_type(
        self, info, room_type, date, start_time, end_time
    ):
        occupied_rooms = Booking.objects.filter(
            date=date,
            start_time__lt=end_time,
            end_time__gt=start_time,
            room__room_type=room_type,
        ).values_list("room", flat=True)

        return Room.objects.filter(room_type=room_type).exclude(id__in=occupied_rooms)


class CreateBooking(graphene.Mutation):
    class Arguments:
        room_id = graphene.Int(required=True)
        user_id = graphene.String(required=True)
        date = graphene.Date(required=True)
        start_time = graphene.Time(required=True)
        end_time = graphene.Time(required=True)

    booking = graphene.Field(BookingType)

    @staticmethod
    def mutate(root, info, room_id, user_id, date, start_time, end_time):
        conflicts = Booking.objects.filter(
            room_id=room_id,
            date=date,
            start_time__lt=end_time,
            end_time__gt=start_time,
        ).exists()

        if conflicts:
            raise Exception("The room is already booked for the given time slot.")

        room = Room.objects.get(pk=room_id)
        is_confirmed = not room.requires_confirmation or room.room_type != "party"

        booking = Booking(
            room=room,
            user_id=user_id,
            date=date,
            start_time=start_time,
            end_time=end_time,
            is_confirmed=is_confirmed,
        )
        booking.save()
        return CreateBooking(booking=booking)


class Mutation(graphene.ObjectType):
    create_booking = CreateBooking.Field()
    # Include other mutations such as cancel_booking if you have them.


schema = graphene.Schema(query=Query, mutation=Mutation)
