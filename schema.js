const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLID,
  GraphQLBoolean,
} = require("graphql");
const Room = require("./models/Rooms.js");
const Booking = require("./models/Bookings.js");
const { getStrategy } = require("./models/BookingStrategies.js");

const RoomType = new GraphQLObjectType({
  name: "Room",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    room_type: { type: new GraphQLNonNull(GraphQLString) },
    bookedTimes: { type: new GraphQLList(BookedTimeType) },
  }),
});

const BookedTimeType = new GraphQLObjectType({
  name: "BookedTime",
  fields: () => ({
    date: { type: new GraphQLNonNull(GraphQLString) },
    startTime: { type: new GraphQLNonNull(GraphQLString) },
    endTime: { type: new GraphQLNonNull(GraphQLString) },
    user_id: { type: new GraphQLNonNull(GraphQLString) },
    user_name: { type: new GraphQLNonNull(GraphQLString) },
    is_confirmed: { type: GraphQLBoolean },
  }),
});
const ExtendedBookedTimeType = new GraphQLObjectType({
  name: "ExtendedBookedTime",
  fields: () => ({
    booking_id: { type: new GraphQLNonNull(GraphQLID) },
    room_id: { type: new GraphQLNonNull(GraphQLID) },
    date: { type: new GraphQLNonNull(GraphQLString) },
    startTime: { type: new GraphQLNonNull(GraphQLString) },
    endTime: { type: new GraphQLNonNull(GraphQLString) },
    user_id: { type: new GraphQLNonNull(GraphQLString) },
    room_name: { type: new GraphQLNonNull(GraphQLString) },
    user_name: { type: new GraphQLNonNull(GraphQLString) },
    is_confirmed: { type: GraphQLBoolean },
  }),
});

const BookingType = new GraphQLObjectType({
  name: "Booking",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    user_id: { type: new GraphQLNonNull(GraphQLString) },
    date: { type: new GraphQLNonNull(GraphQLString) },
    start_time: { type: new GraphQLNonNull(GraphQLString) },
    end_time: { type: new GraphQLNonNull(GraphQLString) },
    is_confirmed: { type: GraphQLBoolean },
  }),
});

const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: {
    allRooms: {
      type: new GraphQLList(RoomType),
      resolve() {
        return Room.find({});
      },
    },
    roomsByType: {
      type: new GraphQLList(RoomType),
      args: {
        room_type: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve(_, args) {
        return Room.find({ room_type: args.room_type });
      },
    },
    unconfirmedPartyRooms: {
      type: new GraphQLList(RoomType),
      resolve() {
        return Room.find({
          room_type: "party",
          "bookedTimes.is_confirmed": false,
        });
      },
    },
    bookingsByUser: {
      type: new GraphQLList(ExtendedBookedTimeType), // Use the new type here
      args: {
        user_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      async resolve(_, args) {
        try {
          const rooms = await Room.find({
            "bookedTimes.user_id": args.user_id,
          });
          const bookings = rooms
            .map((room) =>
              room.bookedTimes
                .filter((b) => b.user_id === args.user_id)
                .map((booking) => ({
                  ...booking.toObject(), // Spread existing booked time fields
                  room_id: room._id.toString(), // Include room ID
                  room_name: room.name,
                  booking_id: booking._id.toString(), // Include booking ID
                }))
            )
            .flat();
          console.log(bookings);
          return bookings;
        } catch (error) {
          console.error("Error fetching user bookings:", error);
          throw new Error("Failed to fetch bookings");
        }
      },
    },
  },
});

const Mutation = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    createBooking: {
      type: RoomType,
      args: {
        room_id: { type: new GraphQLNonNull(GraphQLID) },
        user_id: { type: new GraphQLNonNull(GraphQLString) },
        user_name: { type: new GraphQLNonNull(GraphQLString) },
        date: { type: new GraphQLNonNull(GraphQLString) },
        start_time: { type: new GraphQLNonNull(GraphQLString) },
        end_time: { type: new GraphQLNonNull(GraphQLString) },
      },
      async resolve(_, args) {
        try {
          const room = await Room.findById(args.room_id);
          if (!room) {
            throw new Error("Room not found.");
          }
          const strategy = getStrategy(room);
          return await strategy.createBooking(args);
        } catch (error) {
          console.error("Error in createBooking mutation:", error.message);
          throw new Error(error.message);
        }
      },
    },
    cancelBooking: {
      // send kafka only if the person calling it is not the user that created it, meaning it is manager that is canceling it
      type: RoomType,
      args: {
        room_id: { type: new GraphQLNonNull(GraphQLID) },
        booking_id: { type: new GraphQLNonNull(GraphQLID) },
        user_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      async resolve(_, args) {
        const room = await Room.findById(args.room_id);
        const strategy = getStrategy(room);
        return strategy.cancelBooking(args.booking_id, args.user_id);
      },
    },
    approveBooking: {
      type: BookingType,
      args: {
        booking_id: { type: new GraphQLNonNull(GraphQLID) },
      },
      async resolve(_, args) {
        const rooms = await Room.find({ "bookedTimes._id": args.booking_id });
        if (!rooms.length) {
          throw new Error("Booking not found.");
        }
        let roomSaved = null;
        let updatedBooking = null;

        rooms.forEach((room) => {
          room.bookedTimes.forEach((booking) => {
            if (booking._id.toString() === args.booking_id) {
              booking.is_confirmed = true; // Confirm the booking
              // Ensure updatedBooking is correctly assigned
              updatedBooking = {
                id: booking._id,
                user_id: booking.user_id,
                date: booking.date,
                start_time: booking.startTime,
                end_time: booking.endTime,
                is_confirmed: booking.is_confirmed,
              };
            }
          });

          try {
            roomSaved = room.save(); // Save the room with the updated booking
          } catch (error) {
            console.error("Error saving room:", error);
            throw new Error("Failed to save room changes.");
          }
        });

        if (!roomSaved || !updatedBooking) {
          throw new Error(
            "No booking found to update or failed to save the room."
          );
        }

        console.log("Updated Booking:", updatedBooking);
        return updatedBooking; // Return the updated booking
      },
    },
    declineBooking: {
      type: BookingType,
      args: {
        booking_id: { type: new GraphQLNonNull(GraphQLID) },
      },
      async resolve(_, args) {
        const rooms = await Room.find({ "bookedTimes._id": args.booking_id });
        if (!rooms.length) {
          throw new Error("Booking not found.");
        }

        let updatedBooking = null;

        // Iterate over each room to find and remove the specific booking
        rooms.forEach((room) => {
          const remainingBookings = [];
          room.bookedTimes.forEach((booking) => {
            if (booking._id.toString() === args.booking_id) {
              updatedBooking = {
                id: booking._id,
                user_id: booking.user_id,
                date: booking.date,
                start_time: booking.startTime,
                end_time: booking.endTime,
                is_confirmed: false, // Mark as not confirmed since it's declined
              };
            } else {
              remainingBookings.push(booking); // Keep bookings not being declined
            }
          });

          // Update the room's bookings only with those not declined
          room.bookedTimes = remainingBookings;

          try {
            room.save(); // Save the room with the updated bookings array
          } catch (error) {
            console.error("Error saving room:", error);
            throw new Error("Failed to save room changes.");
          }
        });

        // Ensure the booking was found and updated
        if (!updatedBooking) {
          throw new Error(
            "No booking found to update or failed to save the room."
          );
        }

        // Return the details of the declined booking
        return updatedBooking;
      },
    },

    createRoom: {
      type: RoomType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        room_type: { type: new GraphQLNonNull(GraphQLString) },
      },
      async resolve(_, args) {
        const newRoom = new Room({
          name: args.name,
          room_type: args.room_type,
        });
        return newRoom.save();
      },
    },
    deleteRoom: {
      type: GraphQLBoolean,
      args: {
        room_id: { type: new GraphQLNonNull(GraphQLID) },
      },
      async resolve(_, args) {
        const result = await Room.deleteOne({ _id: args.room_id });
        return result.deletedCount > 0; // Returns true if any document was deleted
      },
    },
    cancelBookingWithReason: {
      type: BookingType,
      args: {
        booking_id: { type: new GraphQLNonNull(GraphQLID) },
        reason: { type: new GraphQLNonNull(GraphQLString) },
      },
      async resolve(_, args) {
        const rooms = await Room.find({ "bookedTimes._id": args.booking_id });
        let updatedBooking = null;

        if (!rooms.length) {
          throw new Error("Booking not found.");
        }

        rooms.forEach((room) => {
          room.bookedTimes = room.bookedTimes.filter((booking) => {
            if (booking._id.toString() === args.booking_id) {
              // Storing the cancelled booking info before removal
              updatedBooking = {
                id: booking._id,
                room: {
                  id: room._id,
                  name: room.name,
                  room_type: room.room_type,
                  bookedTimes: room.bookedTimes.filter(
                    (bt) => bt._id.toString() !== args.booking_id
                  ),
                },
                user_id: booking.user_id,
                date: booking.date,
                start_time: booking.startTime,
                end_time: booking.endTime,
                is_confirmed: booking.is_confirmed,
                reason: args.reason, // Adding cancellation reason
              };
              return false; // removes the booking from the array
            }
            return true;
          });
          try {
            room.save();
          } catch (error) {
            console.error("Error saving room:", error);
            throw new Error("Failed to save room changes.");
          }
        });

        if (!updatedBooking) {
          throw new Error("Booking not found or already removed.");
        }

        return updatedBooking; // Return the cancelled booking info
      },
    },
  },
});

module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation,
});
