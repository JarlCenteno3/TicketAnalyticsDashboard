"use client";

import { useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  Box,
  Container,
  Typography,
  Button,
  ButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  SelectChangeEvent,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import dynamic from 'next/dynamic';

// Dynamic import for Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const GET_TICKETS = gql`
  query GetTickets($status: [String], $priority: [String]) {
    tickets(status: $status, priority: $priority) {
      _id
      Ticket
      Status
      Priority
      Created
      Description
    }
  }
`;

const STATUS_BUTTONS = [
  "CREATED", "ACKNOWLEDGED", "GATHERING INFORMATION", "IN PROGRESS",
  "WAITING FOR CONFIRMATION", "CANCELLED", "COMPLETED"
];

const PRIORITY_BUTTONS = [
  "P0: Emergency", "P1: Urgent. No workaround.",
  "P2: Urgent. Workaround available.", "P3: Normal."
];

type ViewMode = 'pie' | 'line' | 'wordcloud' | 'workload' | 'performance' | null;

export default function Dashboard() {
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(null);
  const [pieColumn, setPieColumn] = useState<string>('');

  const { loading, error, data } = useQuery(GET_TICKETS, {
    variables: {
      status: selectedStatus.length > 0 ? selectedStatus : undefined,
      priority: selectedPriority.length > 0 ? selectedPriority : undefined,
    },
  });

  console.log("Loading:", loading);
  console.log("Error:", error);
  console.log("Data:", data);

  const handleStatusToggle = (status: string) => {
    setSelectedStatus(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handlePriorityToggle = (priority: string) => {
    setSelectedPriority(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const handleViewToggle = (mode: ViewMode) => {
    setViewMode(prev => prev === mode ? null : mode);
  };

  const tickets = data?.tickets || [];

  // Filter by date if needed
  const filteredTickets = tickets.filter((ticket: any) => {
    if (!startDate && !endDate) return true;
    const ticketDate = new Date(ticket.Created);
    if (startDate && ticketDate < startDate) return false;
    if (endDate && ticketDate > endDate) return false;
    return true;
  });

  // Generate pie chart data
  const generatePieData = (column: string) => {
    if (!column || filteredTickets.length === 0) return null;
    
    const counts: Record<string, number> = {};
    filteredTickets.forEach((ticket: any) => {
      const value = ticket[column] || 'Unknown';
      counts[value] = (counts[value] || 0) + 1;
    });

    return {
      data: [{
        type: 'pie' as const,
        labels: Object.keys(counts),
        values: Object.values(counts),
        hole: 0.3,
      }],
      layout: {
        title: `${column} Distribution`,
        paper_bgcolor: '#1e1e1e',
        plot_bgcolor: '#1e1e1e',
        font: { color: '#ffffff' },
      },
    };
  };

  const pieData = pieColumn ? generatePieData(pieColumn) : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Ticket Analytics Dashboard
        </Typography>

        {/* Filter Section */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#2a2a2a' }}>
          <Grid container spacing={3}>
            {/* Status Filters */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Status</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {STATUS_BUTTONS.map(status => (
                  <Button
                    key={status}
                    variant={selectedStatus.includes(status) ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => handleStatusToggle(status)}
                  >
                    {status}
                  </Button>
                ))}
              </Box>
            </Grid>

            {/* Priority Filters */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Priority</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {PRIORITY_BUTTONS.map(priority => (
                  <Button
                    key={priority}
                    variant={selectedPriority.includes(priority) ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => handlePriorityToggle(priority)}
                  >
                    {priority}
                  </Button>
                ))}
              </Box>
            </Grid>

            {/* Date Range */}
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* View Mode Buttons */}
        <Box sx={{ mb: 3 }}>
          <ButtonGroup variant="contained">
            <Button
              color={viewMode === 'pie' ? 'primary' : 'inherit'}
              onClick={() => handleViewToggle('pie')}
            >
              Pie Chart
            </Button>
            <Button
              color={viewMode === 'line' ? 'primary' : 'inherit'}
              onClick={() => handleViewToggle('line')}
            >
              Line Graph
            </Button>
            <Button
              color={viewMode === 'wordcloud' ? 'primary' : 'inherit'}
              onClick={() => handleViewToggle('wordcloud')}
            >
              Word Frequency
            </Button>
            <Button
              color={viewMode === 'workload' ? 'primary' : 'inherit'}
              onClick={() => handleViewToggle('workload')}
            >
              Workload
            </Button>
            <Button
              color={viewMode === 'performance' ? 'primary' : 'inherit'}
              onClick={() => handleViewToggle('performance')}
            >
              Performance
            </Button>
          </ButtonGroup>
        </Box>

        {/* Pie Chart Controls */}
        {viewMode === 'pie' && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: '#2a2a2a' }}>
            <FormControl fullWidth>
              <InputLabel>Select Column</InputLabel>
              <Select
                value={pieColumn}
                onChange={(e: SelectChangeEvent) => setPieColumn(e.target.value)}
              >
                <MenuItem value="Status">Status</MenuItem>
                <MenuItem value="Priority">Priority</MenuItem>
              </Select>
            </FormControl>
          </Paper>
        )}

        {/* Chart Display */}
        {loading && <CircularProgress />}
        {error && <Typography color="error">Error: {error.message}</Typography>}
        
        {viewMode === 'pie' && pieData && (
          <Paper sx={{ p: 2, bgcolor: '#2a2a2a' }}>
            <Plot
              data={pieData.data}
              layout={pieData.layout}
              style={{ width: '100%', height: '600px' }}
              config={{ responsive: true }}
            />
          </Paper>
        )}

        {/* Table Display */}
        <Paper sx={{ mt: 3, bgcolor: '#2a2a2a' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ticket</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTickets.slice(0, 100).map((ticket: any) => (
                  <TableRow key={ticket._id}>
                    <TableCell>{ticket.Ticket}</TableCell>
                    <TableCell>{ticket.Status}</TableCell>
                    <TableCell>{ticket.Priority}</TableCell>
                    <TableCell>
                      {ticket.Created ? new Date(ticket.Created).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ticket.Description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>
    </LocalizationProvider>
  );
}