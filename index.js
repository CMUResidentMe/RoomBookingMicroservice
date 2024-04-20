require("dotenv").config();
const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const schema = require("./schema.js");
const connectDB = require("./database.js");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware for json parsing
app.use(express.json());

// GraphQL endpoint setup
app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    graphiql: true, // Enable GraphiQL interface if desired
  })
);

// Set up a basic route
app.get("/", (req, res) => {
  res.send("GraphQL API Running");
});

// Start the server
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
