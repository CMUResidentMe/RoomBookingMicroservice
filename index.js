const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const schema = require("schema"); // Adjust the path as necessary to point to your schema.js file

async function startServer() {
  const app = express();
  const apolloServer = new ApolloServer({
    schema, // This should be the GraphQL schema object from your schema.js
    context: ({ req }) => {
      // Add logic to confirm user role is 'manager' for certain mutations
      return { user: req.user, role: req.user.role };
    },
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({ app, path: "/graphql" });

  app.listen({ port: 4000 }, () => {
    console.log(
      `Server ready at http://localhost:4000${apolloServer.graphqlPath}`
    );
  });
}

startServer();
