"use client";

import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink } from '@apollo/client';

// Create an HttpLink to connect to the GraphQL API
const httpLink = new HttpLink({
  uri: '/api/graphql',
});

// Set up the Apollo Client to connect to our GraphQL API
const client = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
});

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ApolloProvider client={client}>
            {children}
        </ApolloProvider>
    );
}