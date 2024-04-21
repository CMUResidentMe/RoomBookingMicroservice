class BookingStrategy {
  constructor(room) {
    this.room = room;
  }

  async createBooking(args) {
    throw new Error("Method 'createBooking()' must be implemented.");
  }

  async cancelBooking(bookingId, userId) {
    throw new Error("Method 'cancelBooking()' must be implemented.");
  }

  async approveBooking(bookingId) {
    throw new Error("Method 'approveBooking()' must be implemented.");
  }

  async declineBooking(bookingId) {
    throw new Error("Method 'declineBooking()' must be implemented.");
  }
}

class PartyRoomStrategy extends BookingStrategy {
  async createBooking(args) {
    // Check for time overlap
    const overlap = this.room.bookedTimes.some(
      (booking) =>
        booking.date === args.date &&
        !(
          args.end_time <= booking.startTime ||
          args.start_time >= booking.endTime
        )
    );

    if (overlap) {
      throw new Error("Time slot is already booked.");
    }

    // If no overlap, proceed to book
    this.room.bookedTimes.push({
      date: args.date,
      startTime: args.start_time,
      endTime: args.end_time,
      user_id: args.user_id,
      user_name: args.user_name,
      is_confirmed: false, // default false until confirmed
    });
    await this.room.save();
    return this.room;
  }

  async approveBooking(bookingId) {
    const index = this.room.bookedTimes.findIndex(
      (bt) => bt._id.toString() === bookingId
    );
    if (index !== -1) {
      this.room.bookedTimes[index].is_confirmed = true;
      return this.room.save();
    }
    throw new Error("Booking not found.");
  }

  async declineBooking(bookingId) {
    const index = this.room.bookedTimes.findIndex(
      (bt) => bt._id.toString() === bookingId
    );
    if (index !== -1) {
      this.room.bookedTimes.splice(index, 1); // Removing the booking entirely on decline
      return this.room.save();
    }
    throw new Error("Booking not found.");
  }
}

class DefaultRoomStrategy extends BookingStrategy {
  async createBooking(args) {
    // Check for time overlap
    const overlap = this.room.bookedTimes.some(
      (booking) =>
        booking.date === args.date &&
        !(
          args.end_time <= booking.startTime ||
          args.start_time >= booking.endTime
        )
    );

    if (overlap) {
      throw new Error("Time slot is already booked.");
    }

    // If no overlap, proceed to book
    this.room.bookedTimes.push({
      date: args.date,
      startTime: args.start_time,
      endTime: args.end_time,
      user_id: args.user_id,
      user_name: args.user_name,
      is_confirmed: true, //  confirmation by default for non-party rooms
    });

    await this.room.save();
    return this.room;
  }

  async cancelBooking(bookingId, userId) {
    const index = this.room.bookedTimes.findIndex(
      (bt) => bt._id.toString() === bookingId && bt.user_id === userId
    );
    if (index !== -1) {
      this.room.bookedTimes.splice(index, 1);
      return this.room.save();
    }
    throw new Error("Booking not found or user mismatch.");
  }
}

function getStrategy(room) {
  if (room.room_type === "party") {
    return new PartyRoomStrategy(room);
  } else {
    return new DefaultRoomStrategy(room);
  }
}

module.exports = { getStrategy };
