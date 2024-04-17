const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
  room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true }, // Added user name here
  date: { type: String, required: true },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },
  is_confirmed: { type: Boolean, default: false },
});

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;
