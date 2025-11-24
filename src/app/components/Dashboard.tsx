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
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  SelectChangeEvent,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { format } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });
const WordCloud = dynamic(() => import('react-d3-cloud'), { ssr: false });

const GET_TICKETS = gql`
  query GetTickets($status: [String], $priority: [String], $sortBy: String, $sortOrder: String) {
    tickets(status: $status, priority: $priority, sortBy: $sortBy, sortOrder: $sortOrder) {
      _id
      Ticket
      Status
      Priority
      Created
      Description
      Assigned
      Organization
      SnapshotDate
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
  "yourself", "yourselves", "ticket", "description", "issue", "error", "please", 
  "see", "login", "failure", "timeout", "observed"
]);

type ViewMode = 'pie' | 'line' | 'wordcloud' | 'workload' | 'performance' | null;

interface Word {
  text: string;
  value: number;
}

const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  return isClient;
};

export default function Dashboard() {
  const { setTheme, resolvedTheme } = useTheme();
  const muiTheme = useMuiTheme();

  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(null);
  const [pieColumn, setPieColumn] = useState<string>('');
  const [size, setSize] = useState<[number, number]>([800, 600]);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'Created', direction: 'desc' });
  const wordCloudContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const isClient = useIsClient();

  const { loading, error, data } = useQuery(GET_TICKETS, {
    variables: {
      status: selectedStatus.length > 0 ? selectedStatus : undefined,
      priority: selectedPriority.length > 0 ? selectedPriority : undefined,
      sortBy: sortConfig.key,
      sortOrder: sortConfig.direction,
    },
  });

  const tickets = data?.tickets || [];

  const filteredTickets = tickets.filter((ticket: any) => {
    const hasDateFilter = startDate || endDate;
    if (!hasDateFilter) return true;
    if (!ticket.Created) return false;

    const ticketDate = new Date(ticket.Created);
    if (isNaN(ticketDate.getTime())) return false;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    if (start && ticketDate < start) return false;
    if (end && ticketDate > end) return false;

    return true;
  });

  useEffect(() => {
    if (wordCloudContainerRef.current && viewMode === 'wordcloud') {
      const { clientWidth, clientHeight } = wordCloudContainerRef.current;
      if (clientWidth > 0 && clientHeight > 0) {
        const height = Math.max(clientHeight - 80, 240);
        setSize([clientWidth, height]);
      }
    }
  }, [viewMode]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatus(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handlePriorityToggle = (priority: string) => {
    setSelectedPriority(prev =>
      prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
    );
  };

  const handleViewToggle = (mode: ViewMode) => {
    setViewMode(prev => prev === mode ? null : mode);
  };

  const chartLayout = {
    paper_bgcolor: muiTheme.palette.background.paper,
    plot_bgcolor: muiTheme.palette.background.paper,
    font: { color: muiTheme.palette.text.primary },
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
        ...chartLayout,
        title: `${pieColumn} Distribution`,
      },
    };
  }, [pieColumn, filteredTickets, chartLayout]);

  const lineData = useMemo(() => {
    if (filteredTickets.length === 0) return null;

    const counts: Record<string, number> = {};
    filteredTickets.forEach((ticket: any) => {
      if (!ticket.Created) return;
      const dateObj = new Date(ticket.Created);
      if (isNaN(dateObj.getTime())) return;
      const date = format(dateObj, 'MMM dd, yyyy');
      counts[date] = (counts[date] || 0) + 1;
    });

    const sortedDates = Object.keys(counts).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    return {
      data: [{
        type: 'scatter' as const,
        mode: 'lines+markers' as const,
        x: sortedDates,
        y: sortedDates.map(date => counts[date]),
      }],
      layout: {
        ...chartLayout,
        title: 'Ticket Creation Trends',
        xaxis: { title: 'Date' },
        yaxis: { title: 'Number of Tickets' },
      },
    };
  }, [filteredTickets, chartLayout]);

  const wordCloudData: Word[] = useMemo(() => {
    if (filteredTickets.length === 0) return [];

    const wordCounts: Record<string, number> = {};
    filteredTickets.forEach((ticket: any) => {
      if (typeof ticket.Description === 'string') {
        const words = ticket.Description.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
        words.forEach((word: string) => {
          if (!stopWords.has(word)) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([text, value]): Word => ({ text, value }));
  }, [filteredTickets]);

  const workloadData = useMemo(() => {
    if (filteredTickets.length === 0) return null;

    const agentWorkload: Record<string, Record<string, number>> = {};
    const allStatuses = new Set<string>();

    filteredTickets.forEach((ticket: any) => {
      if (!ticket.Assigned) return;
      
      const agents = ticket.Assigned.split(';').map((a: string) => a.trim());
      agents.forEach((agent: string) => {
        if (!agent) return;
        
        if (!agentWorkload[agent]) {
          agentWorkload[agent] = {};
        }
        
        const status = ticket.Status || 'Unknown';
        allStatuses.add(status);
        agentWorkload[agent][status] = (agentWorkload[agent][status] || 0) + 1;
      });
    });

    const sortedAgents = Object.keys(agentWorkload).sort();
    const sortedStatuses = Array.from(allStatuses).sort();

    const z = sortedAgents.map(agent => 
      sortedStatuses.map(status => agentWorkload[agent][status] || 0)
    );

    const customColorscale = [
      [0, muiTheme.palette.background.paper],
      [1, muiTheme.palette.primary.main],
    ];

    return {
      chartData: {
        data: [{
          type: 'heatmap' as const,
          x: sortedStatuses,
          y: sortedAgents,
          z: z,
          colorscale: customColorscale,
        }],
        layout: {
          ...chartLayout,
          title: 'Agent Workload by Ticket Status',
          xaxis: { title: 'Status', tickangle: -45, automargin: true },
          yaxis: { title: 'Agent', automargin: true },
        },
      }
    };
  }, [filteredTickets, chartLayout, muiTheme]);

  const performanceData = useMemo(() => {
    if (filteredTickets.length === 0) return null;

    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    const orgCounts: Record<string, number> = {};
    
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    filteredTickets.forEach((ticket: any) => {
      statusCounts[ticket.Status] = (statusCounts[ticket.Status] || 0) + 1;
      priorityCounts[ticket.Priority] = (priorityCounts[ticket.Priority] || 0) + 1;
      
      if (ticket.Organization) {
        orgCounts[ticket.Organization] = (orgCounts[ticket.Organization] || 0) + 1;
      }

      if (ticket.Status === 'COMPLETED' && ticket.Created && ticket.SnapshotDate) {
        const created = new Date(ticket.Created);
        const completed = new Date(ticket.SnapshotDate);
        if (!isNaN(created.getTime()) && !isNaN(completed.getTime())) {
          const daysToResolve = (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          totalResolutionTime += daysToResolve;
          resolvedCount++;
        }
      }
    });

    const avgResolutionTime = resolvedCount > 0 ? (totalResolutionTime / resolvedCount).toFixed(1) : 'N/A';
    const completionRate = ((statusCounts['COMPLETED'] || 0) / filteredTickets.length * 100).toFixed(1);

    return {
      totalTickets: filteredTickets.length,
      avgResolutionTime,
      completionRate,
      statusCounts,
      priorityCounts,
      orgCounts,
      chartData: {
        data: [{
          type: 'bar' as const,
          x: Object.keys(statusCounts),
          y: Object.values(statusCounts),
          marker: {
            color: Object.keys(statusCounts).map(status => 
              status === 'COMPLETED' ? '#4caf50' : 
              status === 'IN PROGRESS' ? '#1976d2' : 
              status === 'CREATED' ? '#ff9800' : '#9e9e9e'
            )
          },
        }],
        layout: {
          ...chartLayout,
          title: 'Tickets by Status',
          xaxis: { title: 'Status', tickangle: -45, automargin: true },
          yaxis: { title: 'Count' },
        },
      }
    };
  }, [filteredTickets, chartLayout]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          display: 'none',
          background: muiTheme.palette.background.paper,
          color: muiTheme.palette.text.primary,
          padding: '5px 10px',
          borderRadius: '3px',
          zIndex: 1301,
          border: `1px solid ${muiTheme.palette.divider}`
        }}
      />
      <Box sx={{ 
        bgcolor: '#1976d2', 
        color: 'white',
        py: 2,
        px: 3,
        mb: 4,
        position: 'sticky',
        top: 0,
        zIndex: 1100
      }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Typography variant="h5" component="div" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
                Dashlabs.ai
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                Ticket Analytics Dashboard
              </Typography>
            </Box>
            <IconButton 
              onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
              sx={{ color: 'white' }}
            >
              {isClient ? (resolvedTheme === 'light' ? <Brightness4Icon /> : <Brightness7Icon />) : null}
            </IconButton>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 2 }}>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
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

        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
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

        {viewMode === 'pie' && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Select Column</InputLabel>
              <Select
                value={pieColumn}
                onChange={(e: SelectChangeEvent) => setPieColumn(e.target.value)}
              >
                <MenuItem value="Status">Status</MenuItem>
                <MenuItem value="Priority">Priority</MenuItem>
                <MenuItem value="Organization">Organization</MenuItem>
              </Select>
            </FormControl>
          </Paper>
        )}

        {loading && <CircularProgress />}
        {error && <Typography color="error">Error: {error.message}</Typography>}
        
        {viewMode === 'pie' && pieData && (
          <Paper sx={{ p: 2 }}>
            <Plot
              data={pieData.data}
              layout={pieData.layout as any}
              style={{ width: '100%', height: '600px' }}
              config={{ responsive: true }}
            />
          </Paper>
        )}

        {viewMode === 'line' && lineData && (
          <Paper sx={{ p: 2 }}>
            <Plot
              data={lineData.data}
              layout={lineData.layout as any}
              style={{ width: '100%', height: '600px' }}
              config={{ responsive: true }}
            />
          </Paper>
        )}

        {isClient && viewMode === 'wordcloud' && (
          <Paper ref={wordCloudContainerRef} sx={{ p: 2, height: '600px', width: '100%' }}>
            <Typography variant="h6" gutterBottom align="center">
              Most Frequent Words in Descriptions
            </Typography>
            {wordCloudData && wordCloudData.length > 0 ? (
              <>
                <WordCloud
                  data={wordCloudData}
                  width={size[0]}
                  height={size[1]}
                  font="impact"
                  fontSize={(word) => Math.sqrt(word.value) * 12}
                  fill={(d, i) => (i < 5 ? muiTheme.palette.primary.main : muiTheme.palette.text.primary)}
                  rotate={0}
                  padding={5}
                  onWordClick={() => {}}
                  onWordMouseOver={(event, d) => {
                    if (tooltipRef.current) {
                      tooltipRef.current.style.display = 'block';
                      tooltipRef.current.innerHTML = `${d.text}: ${d.value}`;
                      tooltipRef.current.style.left = `${event.pageX + 10}px`;
                      tooltipRef.current.style.top = `${event.pageY + 10}px`;
                    }
                  }}
                  onWordMouseOut={() => {
                    if (tooltipRef.current) {
                      tooltipRef.current.style.display = 'none';
                    }
                  }}
                />
              </>
            ) : (
              <Typography align="center">Loading word cloud...</Typography>
            )}
          </Paper>
        )}

        {viewMode === 'workload' && workloadData && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Plot
              data={workloadData.chartData.data as any}
              layout={workloadData.chartData.layout as any}
              style={{ width: '100%', height: '800px' }}
              config={{ responsive: true }}
            />
          </Paper>
        )}

        {viewMode === 'performance' && performanceData && (
          <Box>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">{performanceData.totalTickets}</Typography>
                  <Typography variant="body1">Total Tickets</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {performanceData.avgResolutionTime} days
                  </Typography>
                  <Typography variant="body1">Avg Resolution Time</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {performanceData.completionRate}%
                  </Typography>
                  <Typography variant="body1">Completion Rate</Typography>
                </Paper>
              </Grid>
            </Grid>

            <Paper sx={{ p: 2, mb: 3 }}>
              <Plot
                data={performanceData.chartData.data as any}
                layout={performanceData.chartData.layout as any}
                style={{ width: '100%', height: '500px' }}
                config={{ responsive: true }}
              />
            </Paper>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>Tickets by Organization</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {Object.entries(performanceData.orgCounts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([org, count]) => (
                            <TableRow key={org}>
                              <TableCell>{org}</TableCell>
                              <TableCell align="right">{count}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>Tickets by Priority</Typography>
                   <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {Object.entries(performanceData.priorityCounts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([priority, count]) => (
                            <TableRow key={priority}>
                              <TableCell>{priority}</TableCell>
                              <TableCell align="right">{count}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        <Paper sx={{ mt: 3}}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ticket</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell onClick={() => handleSort('Created')} style={{ cursor: 'pointer' }}>
                    Created
                    {sortConfig.key === 'Created' && (
                      sortConfig.direction === 'asc' 
                        ? <ArrowUpwardIcon fontSize="inherit" style={{ verticalAlign: 'middle' }} /> 
                        : <ArrowDownwardIcon fontSize="inherit" style={{ verticalAlign: 'middle' }} />
                    )}
                  </TableCell>
                  <TableCell>Assigned</TableCell>
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
                      {ticket.Created && !isNaN(new Date(ticket.Created).getTime())
                        ? format(new Date(ticket.Created), 'MMM dd, yyyy')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{ticket.Assigned || 'Unassigned'}</TableCell>
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