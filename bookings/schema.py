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
        # Assumes there is a field or method `requires_confirmation` in Room model
        is_confirmed = (
            not room.requires_confirmation()
            if hasattr(room, "requires_confirmation")
            else True
        )

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


class UpdateBooking(graphene.Mutation):
    class Arguments:
        booking_id = graphene.Int(required=True)
        new_room_id = graphene.Int(required=False)
        new_date = graphene.Date(required=False)
        new_start_time = graphene.Time(required=False)
        new_end_time = graphene.Time(required=False)

    booking = graphene.Field(BookingType)

    @staticmethod
    def mutate(
        root,
        info,
        booking_id,
        new_room_id=None,
        new_date=None,
        new_start_time=None,
        new_end_time=None,
    ):
        booking = Booking.objects.get(pk=booking_id)
        original_room_type = booking.room.room_type

        if new_room_id:
            new_room = Room.objects.get(pk=new_room_id)
            if new_room.room_type != original_room_type:
                raise Exception("Cannot change to a different type of room.")
            booking.room = new_room

        if new_date:
            booking.date = new_date
        if new_start_time:
            booking.start_time = new_start_time
        if new_end_time:
            booking.end_time = new_end_time

        # Check for conflicting bookings before saving
        conflicts = (
            Booking.objects.filter(
                room=booking.room,
                date=booking.date,
                start_time__lt=booking.end_time,
                end_time__gt=booking.start_time,
            )
            .exclude(pk=booking_id)
            .exists()
        )

        if conflicts:
            raise Exception("The room is already booked for the given new time slot.")

        booking.save()
        return UpdateBooking(booking=booking)


class ClientCancelBooking(graphene.Mutation):
    class Arguments:
        booking_id = graphene.Int(required=True)

    success = graphene.Boolean()

    @staticmethod
    def mutate(root, info, booking_id):
        booking = Booking.objects.get(pk=booking_id)
        booking.delete()
        return ClientCancelBooking(success=True)


# MANAGER SIDE


class ApproveBooking(graphene.Mutation):
    class Arguments:
        booking_id = graphene.Int(required=True)
        approve = graphene.Boolean(required=True)  # True to approve, False to decline

    booking = graphene.Field(BookingType)

    @staticmethod
    def mutate(root, info, booking_id, approve):
        booking = Booking.objects.get(pk=booking_id)
        if booking.room.room_type == "party":
            booking.is_confirmed = approve
            booking.save()
            return ApproveBooking(booking=booking)
        else:
            raise Exception("Only party room bookings require approval.")


class CancelBookingWithReason(graphene.Mutation):
    class Arguments:
        booking_id = graphene.Int(required=True)
        reason = graphene.String(required=True)

    success = graphene.Boolean()

    @staticmethod
    def mutate(root, info, booking_id, reason):
        booking = Booking.objects.get(pk=booking_id)
        # Here, handle sending notification with reason
        booking.delete()
        return CancelBookingWithReason(success=True)


class CreateRoom(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)
        room_type = graphene.String(required=True)
        description = graphene.String()
        capacity = graphene.Int()

    room = graphene.Field(RoomType)

    @staticmethod
    def mutate(root, info, name, room_type, description, capacity):
        room = Room(
            name=name, room_type=room_type, description=description, capacity=capacity
        )
        room.save()
        return CreateRoom(room=room)


class DeleteRoom(graphene.Mutation):
    class Arguments:
        room_id = graphene.Int(required=True)

    success = graphene.Boolean()

    @staticmethod
    def mutate(root, info, room_id):
        room = Room.objects.get(pk=room_id)
        room.delete()
        return DeleteRoom(success=True)


class Mutation(graphene.ObjectType):
    create_booking = CreateBooking.Field()
    client_cancel_booking = ClientCancelBooking.Field()
    update_booking = UpdateBooking.Field()
    approve_booking = ApproveBooking.Field()
    cancel_booking_with_reason = CancelBookingWithReason.Field()
    create_room = CreateRoom.Field()
    delete_room = DeleteRoom.Field()


schema = graphene.Schema(query=Query, mutation=Mutation)
