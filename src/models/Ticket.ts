import mongoose, { Document, Schema } from 'mongoose';

export interface ITicket extends Document {
  Ticket: string;
  Status: string;
  Priority: string;
  Created: Date;
  SnapshotDate: Date;
}

const TicketSchema: Schema = new Schema({
  Ticket: { type: String, required: true },
  Status: { type: String, required: true },
  Priority: { type: String, required: true },
  Created: { type: Date, required: true },
  SnapshotDate: { type: Date, required: true },
}, { strict: false });

export default mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema, 'tickets');
