import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { NextRequest } from 'next/server';
import dbConnect from '../../../lib/dbConnect';
import Ticket, { ITicket } from '../../../models/Ticket';

const typeDefs = `#graphql
  type Ticket {
    _id: ID!
    Ticket: String
    Status: String
    Priority: String
    Created: String
    Description: String
    SnapshotDate: String
  }

  type Query {
    tickets(status: [String], priority: [String]): [Ticket]
  }
`;

const resolvers = {
  Query: {
    tickets: async (_: any, args: { status?: string[], priority?: string[] }): Promise<ITicket[]> => {
      await dbConnect();
      const filter: any = {};
      if (args.status?.length) filter.Status = { $in: args.status };
      if (args.priority?.length) filter.Priority = { $in: args.priority };

      const tickets = await Ticket.aggregate([
        { $sort: { SnapshotDate: -1 } },
        { $group: { _id: "$Ticket", latest: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$latest" } },
        { $match: filter }
      ]);
      
      console.log(`[API] Found ${tickets.length} tickets from database.`);

      return tickets;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  // This plugin enables the Apollo Sandbox for local development.
  plugins: [ApolloServerPluginLandingPageLocalDefault()],
});

const handler = startServerAndCreateNextHandler<NextRequest>(server);
export { handler as GET, handler as POST };
