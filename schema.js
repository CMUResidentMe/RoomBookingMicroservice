const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLID,
  GraphQLInputObjectType,
} = require("graphql");
const Room = require("./models/Room");
const Booking = require("./models/Booking");

const RoomType = new GraphQLObjectType({
  name: "Room",
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    room_type: { type: GraphQLString },
    description: { type: GraphQLString },
    capacity: { type: GraphQLInt },
  }),
});

const BookingType = new GraphQLObjectType({
  name: "Booking",
  fields: () => ({
    id: { type: GraphQLID },
    room: {
      type: RoomType,
      resolve(parent, args) {
        return Room.findById(parent.room);
      },
    },
    user_id: { type: GraphQLString },
    date: { type: GraphQLString },
    start_time: { type: GraphQLString },
    end_time: { type: GraphQLString },
    is_confirmed: { type: GraphQLBoolean },
  }),
});

const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: {
    allRooms: {
      type: new GraphQLList(RoomType),
      resolve(parent, args) {
        return Room.find({});
      },
    },
    availableRoomsByType: {
      type: new GraphQLList(RoomType),
      args: {
        room_type: { type: GraphQLString },
        date: { type: GraphQLString },
        start_time: { type: GraphQLString },
        end_time: { type: GraphQLString },
      },
      async resolve(parent, args) {
        const bookings = await Booking.find({
          date: args.date,
          start_time: { $lt: args.end_time },
          end_time: { $gt: args.start_time },
          "room.room_type": args.room_type,
        }).populate("room");
        const bookedRoomIds = bookings.map((booking) => booking.room.id);
        return Room.find({
          room_type: args.room_type,
          _id: { $nin: bookedRoomIds },
        });
      },
    },
  },
});

const Mutation = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    addRoom: {
      type: RoomType,
      args: {
        name: { type: GraphQLString },
        room_type: { type: GraphQLString },
        description: { type: GraphQLString },
        capacity: { type: GraphQLInt },
      },
      resolve(parent, args) {
        let room = new Room({
          name: args.name,
          room_type: args.room_type,
          description: args.description,
          capacity: args.capacity,
        });
        return room.save();
      },
    },
    createBooking: {
      type: BookingType,
      args: {
        room_id: { type: GraphQLID },
        user_id: { type: GraphQLString },
        user_name: { type: GraphQLString }, // Accept user_name in mutation
        date: { type: GraphQLString },
        start_time: { type: GraphQLString },
        end_time: { type: GraphQLString },
      },
      async resolve(parent, args) {
        const conflicts = await Booking.findOne({
          room_id: args.room_id,
          date: args.date,
          start_time: { $lt: args.end_time },
          end_time: { $gt: args.start_time },
        });
        if (conflicts) {
          throw new Error(
            "The room is already booked for the given time slot."
          );
        }
        let booking = new Booking({
          room: args.room_id,
          user_id: args.user_id,
          user_name: args.user_name, // Store user_name in booking
          date: args.date,
          start_time: args.start_time,
          end_time: args.end_time,
          is_confirmed: false, // Assuming confirmation logic is handled separately
        });
        return booking.save();
      },
    },

    cancelBooking: {
      type: BookingType,
      args: {
        booking_id: { type: new GraphQLNonNull(GraphQLID) },
      },
      async resolve(parent, args) {
        const booking = await Booking.findById(args.booking_id);
        if (!booking) {
          throw new Error("Booking not found.");
        }
        await booking.remove();
        return booking;
      },
    },
    updateBooking: {
      type: BookingType,
      args: {
        booking_id: { type: new GraphQLNonNull(GraphQLID) },
        new_room_id: { type: GraphQLID },
        new_date: { type: GraphQLString },
        new_start_time: { type: GraphQLString },
        new_end_time: { type: GraphQLString },
      },
      async resolve(parent, args) {
        const booking = await Booking.findById(args.booking_id);
        if (!booking) {
          throw new Error("Booking not found.");
        }
        // Check for room type consistency and availability
        if (args.new_room_id) {
          const newRoom = await Room.findById(args.new_room_id);
          if (newRoom.room_type !== booking.room.room_type) {
            throw new Error("Cannot change to a different type of room.");
          }
          // Check for conflicting bookings
          const conflict = await Booking.findOne({
            room_id: args.new_room_id,
            date: args.new_date || booking.date,
            start_time: { $lt: args.new_end_time || booking.end_time },
            end_time: { $gt: args.new_start_time || booking.start_time },
            _id: { $ne: args.booking_id },
          });
          if (conflict) {
            throw new Error(
              "The room is already booked for the given new time slot."
            );
          }
          booking.room = args.new_room_id;
        }
        if (args.new_date) booking.date = args.new_date;
        if (args.new_start_time) booking.start_time = args.new_start_time;
        if (args.new_end_time) booking.end_time = args.new_end_time;

        await booking.save();
        return booking;
      },
    },
    // MANAGERS
    approveBooking: {
      type: BookingType,
      args: {
        booking_id: { type: new GraphQLNonNull(GraphQLID) },
      },
      async resolve(parent, args) {
        const booking = await Booking.findById(args.booking_id);
        if (!booking) {
          throw new Error("Booking not found.");
        }
        if (booking.room.room_type !== "party") {
          throw new Error("Only party room bookings can be approved.");
        }
        booking.is_confirmed = true;
        return booking.save();
      },
    },
    declineBooking: {
      type: BookingType,
      args: {
        booking_id: { type: new GraphQLNonNull(GraphQLID) },
      },
      async resolve(parent, args) {
        const booking = await Booking.findById(args.booking_id);
        if (!booking) {
          throw new Error("Booking not found.");
        }
        if (booking.room.room_type !== "party") {
          throw new Error("Only party room bookings can be declined.");
        }
        await booking.remove();
        return booking;
      },
    },
    deleteRoom: {
      type: RoomType,
      args: {
        room_id: { type: new GraphQLNonNull(GraphQLID) },
      },
      async resolve(parent, args) {
        const room = await Room.findById(args.room_id);
        if (!room) {
          throw new Error("Room not found.");
        }
        await room.remove();
        return room;
      },
    },
    cancelBookingWithReason: {
      type: BookingType,
      args: {
        booking_id: { type: new GraphQLNonNull(GraphQLID) },
        reason: { type: new GraphQLNonNull(GraphQLString) },
      },
      async resolve(parent, args) {
        // Here, you would handle the notification logic later
        const booking = await Booking.findById(args.booking_id);
        if (!booking) {
          throw new Error("Booking not found.");
        }
        await booking.remove(); // Simulate the deletion and pass reason to Kafka or another service
        return booking; // Potentially modify to include reason in the response if needed
      },
    },
  },
});

module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation,
});
