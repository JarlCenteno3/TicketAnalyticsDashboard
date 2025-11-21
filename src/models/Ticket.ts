import mongoose, { Document, Schema } from 'mongoose';

// TypeScript interface for our Ticket document
export interface ITicket extends Document {
  Ticket: string;
  Status: string;
  Priority: string;
  Properties?: string;
  Assigned?: string;
  Organization?: string;
  Description?: string;
  Created: Date;
  SnapshotDate: Date;
}

// Mongoose Schema to define the structure in MongoDB
const TicketSchema: Schema = new Schema({
  Ticket: { type: String, required: true },
  Status: { type: String, required: true },
  Priority: { type: String, required: true },
  Created: { type: Date, required: true },
  SnapshotDate: { type: Date, required: true },
}, { strict: false }); // strict: false allows fields not in schema

// Export the model, creating it if it doesn't already exist
export default mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema, 'tickets');