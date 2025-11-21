"use client";

import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Set up the Apollo Client to connect to our GraphQL API
const client = new ApolloClient({
    uri: '/api/graphql',
    cache: new InMemoryCache(),
});

// Create a basic dark theme for Material UI
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ApolloProvider client={client}>
            <ThemeProvider theme={darkTheme}>
                {/* CssBaseline is essential for Material UI to work correctly with server-side rendering and theming. */}
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ApolloProvider>
    );
}