"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { format } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import dynamic from 'next/dynamic';

// Dynamic import for Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });
const WordCloud = dynamic(() => import('react-wordcloud'), { ssr: false });

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

const stopWords = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", 
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being", 
  "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't", 
  "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", 
  "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", 
  "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", 
  "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", 
  "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", 
  "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", 
  "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", 
  "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", 
  "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", 
  "than", "that", "that's", "the", "their", "theirs", "them", "themselves", 
  "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", 
  "they've", "this", "those", "through", "to", "too", "under", "until", "up", 
  "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", 
  "weren't", "what", "what's", "when", "when's", "where", "where's", "which", 
  "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", 
  "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", 
  "yourself", "yourselves", "ticket", "description", "issue", "error", "please", "see"
]);

type ViewMode = 'pie' | 'line' | 'wordcloud' | 'workload' | 'performance' | null;

const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};
export default function Dashboard() {
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(null);
  const [pieColumn, setPieColumn] = useState<string>('');
  const [size, setSize] = useState<[number, number] | null>(null);
  const wordCloudContainerRef = useRef<HTMLDivElement>(null);


  const isClient = useIsClient();

  const { loading, error, data } = useQuery(GET_TICKETS, {
    variables: {
      status: selectedStatus.length > 0 ? selectedStatus : undefined,
      priority: selectedPriority.length > 0 ? selectedPriority : undefined,
    },
  });

  const tickets = data?.tickets || [];

  // Filter by date if needed
  const filteredTickets = tickets.filter((ticket: any) => {
    const hasDateFilter = startDate || endDate;
    if (!hasDateFilter) return true; // No date filter, show all

    if (!ticket.Created) return false; // Date filter is on, but no date, so hide

    const ticketDate = new Date(ticket.Created);
    if (isNaN(ticketDate.getTime())) {
      return false; // Date filter is on, but invalid date, so hide
    }

    if (startDate && ticketDate < startDate) return false;
    if (endDate && ticketDate > endDate) return false;
    
    return true;
  });

useEffect(() => {
    if (wordCloudContainerRef.current) {
      const { clientWidth, clientHeight } = wordCloudContainerRef.current;
      // Only set size if it's different to avoid re-renders
      if (!size || size[0] !== clientWidth || size[1] !== clientHeight)
      setSize([clientWidth, clientHeight]);
    }
  }, [wordCloudContainerRef.current, viewMode, filteredTickets, size]); // Re-check on data/view changes

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

  const pieData = useMemo(() => {
    if (!pieColumn || filteredTickets.length === 0) return null;
    
    const counts: Record<string, number> = {};
    filteredTickets.forEach((ticket: any) => {
      const value = ticket[pieColumn] || 'Unknown';
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
        title: `${pieColumn} Distribution`,
        paper_bgcolor: '#1e1e1e',
        plot_bgcolor: '#1e1e1e',
        font: { color: '#ffffff' },
      },
    };
  }, [pieColumn, filteredTickets]);

  const lineData = useMemo(() => {
    if (filteredTickets.length === 0) return null;

    const counts: Record<string, number> = {};
    filteredTickets.forEach((ticket: any) => {
      // 1. Check if ticket.Created actually exists
      if (!ticket.Created) return;

      const dateObj = new Date(ticket.Created);

      // 2. Check if the date object is valid
      if (isNaN(dateObj.getTime())) {
        console.warn("Found a ticket with a bad date:", ticket);
        return; // Skip this ticket
      }

      // 3. Safe to format now
      const date = format(dateObj, 'MMM dd, yyyy');
      
      counts[date] = (counts[date] || 0) + 1;
    });

    const sortedDates = Object.keys(counts).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const trace = {
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      x: sortedDates,
      y: sortedDates.map(date => counts[date]),
    };

    return {
      data: [trace],
      layout: {
        title: 'Ticket Creation Trends',
        paper_bgcolor: '#1e1e1e',
        plot_bgcolor: '#1e1e1e',
        font: { color: '#ffffff' },
        xaxis: {
          title: 'Date',
        },
        yaxis: {
          title: 'Number of Tickets',
        },
      },
    };
  }, [filteredTickets]);

  const wordCloudData = useMemo(() => {
    if (filteredTickets.length === 0) return [];

    const wordCounts: Record<string, number> = {};
    filteredTickets.forEach((ticket: any) => {
      if (!ticket.Description) return;

      const words = ticket.Description.toLowerCase().match(/\b(\w+)\b/g) || [];
      words.forEach((word: string) => {
        if (!stopWords.has(word) && word.length > 2) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });

    const sortedWords = Object.entries(wordCounts)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 100); // Take top 100 words

    // Make the top 5 words larger to make them stand out
    return sortedWords.map((word, index) => {
      if (index < 5) {
        return { ...word, value: word.value * 5 }; // Inflate value for font size
      }
      return word;
    });

  }, [filteredTickets]);

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

        {viewMode === 'line' && lineData && (
          <Paper sx={{ p: 2, bgcolor: '#2a2a2a' }}>
            <Plot
              data={lineData.data}
              layout={lineData.layout}
              style={{ width: '100%', height: '600px' }}
              config={{ responsive: true }}
            />
          </Paper>
        )}

        {isClient && viewMode === 'wordcloud' && (
            <Paper ref={wordCloudContainerRef} sx={{ p: 2, bgcolor: '#2a2a2a', height: '600px', width: '100%' }}>
              <Typography variant="h6" gutterBottom align="center">
                Most Frequent Words in Descriptions
              </Typography>
              {size ? (
                  wordCloudData.length > 0 ? (
                    <WordCloud
                      words={wordCloudData}
                      size={size}
                      options={{
                        fontFamily: 'impact',
                        fontSizes: [15, 100],
                        rotations: 2,
                        rotationAngles: [0, 90],
                        colors: ["#2196f3", "#f44336", "#4caf50", "#ff9800", "#9c27b0", "#00bcd4"],
                        enableTooltip: true,
                      }}
                    />
                  ) : (
                    <Typography align="center">No description data available for the word cloud.</Typography>
                  )
                
              ) : ( 
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>
              )}
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
                      {ticket.Created
                        ? !isNaN(new Date(ticket.Created).getTime())
                          ? format(new Date(ticket.Created), 'MMM dd, yyyy')
                          : 'Invalid Date'
                        : 'N/A'}
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