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
    Assigned: String
    Organization: String
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
      
      // Only add filters if they exist and have values
      if (args.status && args.status.length > 0) {
        filter.Status = { $in: args.status };
      }
      if (args.priority && args.priority.length > 0) {
        filter.Priority = { $in: args.priority };
      }

      const tickets = await Ticket.aggregate([
        { $sort: { SnapshotDate: -1 } },
        { $group: { _id: "$Ticket", latest: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$latest" } },
        { $match: filter }
      ]);
      
      console.log(`[API] Found ${tickets.length} tickets from database.`);

      // Ensure date fields are serialized to ISO strings so the client
      // always receives a consistent, parseable format regardless of
      // how the DB driver represents dates.
      const serialized = tickets.map((t: any) => ({
        ...t,
        Created: t.Created ? (new Date(t.Created)).toISOString() : null,
        SnapshotDate: t.SnapshotDate ? (new Date(t.SnapshotDate)).toISOString() : null,
      }));

      return serialized;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginLandingPageLocalDefault()],
});

const handler = startServerAndCreateNextHandler<NextRequest>(server);
export { handler as GET, handler as POST };