const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookedTimeSchema = new Schema({
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true }, // user name here if needed for display or logs
  is_confirmed: { type: Boolean, default: false }, // Status of the booking
});

const roomSchema = new Schema({
  name: { type: String, required: true },
  room_type: {
    type: String,
    required: true,
    enum: ["party", "study", "hangout"],
  },
  bookedTimes: [bookedTimeSchema], // Embedded booking information
});

module.exports = mongoose.model("Room", roomSchema);
