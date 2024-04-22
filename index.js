require("dotenv").config();
const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const schema = require("./schema.js");
const connectDB = require("./database.js");
const KafkaService = require("./KafkaService.js");
console.log("KafkaService imported:", KafkaService);

const app = express();

console.log("Environment Variables:");
console.log("PORT:", process.env.PORT);
console.log("DATABASE_URL:", process.env.DATABASE_URL);
console.log("KAFKA_BROKER！！:", process.env.KAFKA_BROKER);

const kafkaBrokers = [process.env.KAFKA_BROKER].filter(Boolean);
console.log("Kafka Brokers:", kafkaBrokers);

const kafkaService = new KafkaService(kafkaBrokers);
console.log("KafkaService instance created: ", kafkaService);

// Connect to MongoDB
connectDB()
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware for json parsing
app.use(express.json());

// GraphQL endpoint setup
app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    graphiql: true,
  })
);

// Set up a basic route
app.get("/", (req, res) => {
  res.send("GraphQL API Running");
});

// Start the server
const PORT = process.env.PORT || 9000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectKafkaWithRetry(5);
});

function connectKafkaWithRetry(retries) {
  kafkaService
    .connect()
    .then(() => {
      console.log("Kafka Producer connected successfully.");
    })
    .catch((err) => {
      console.error("Kafka connection error:", err);
      if (retries > 0) {
        console.log(`Retrying Kafka connection... (${retries} retries left)`);
        setTimeout(() => connectKafkaWithRetry(retries - 1), 5000);
      } else {
        console.error("Failed to connect to Kafka after retries.");
      }
    });
}

function handleShutdown(signal) {
  console.log(`${signal} signal received: closing HTTP server`);
  server.close(async () => {
    console.log("HTTP server closed");
    try {
      await kafkaService.disconnect();
      console.log("Kafka Producer disconnected successfully.");
    } catch (err) {
      console.error("Failed to disconnect Kafka Producer:", err);
    } finally {
      process.exit();
    }
  });
}

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
