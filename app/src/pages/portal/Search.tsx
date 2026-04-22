import React, { useState } from 'react';
import { PageHeader, Card, CardBody, Button, Input, EmptyState } from '../../components/ui';

const Search: React.FC = () => {
    const [query, setQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = () => {
        if (query.trim()) {
            setHasSearched(true);
            // TODO: Implement actual search
        }
    };

    return (
        <div>
            <PageHeader
                title="Search"
                description="Find personnel and entities across your monitored watchlists"
            />

            {/* Search Input */}
            <Card style={{ marginBottom: '24px' }}>
                <CardBody>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Enter name, licence plate, address, or case number..."
                                leftIcon={
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                                    </svg>
                                }
                                fullWidth
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSearch();
                                }}
                            />
                        </div>
                        <Button variant="primary" onClick={handleSearch}>
                            Search
                        </Button>
                    </div>

                    {/* Quick filters */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Filter by:</span>
                        {['All', 'People', 'Vehicles', 'Locations', 'Cases'].map((filter) => (
                            <button
                                key={filter}
                                style={{
                                    padding: '4px 12px',
                                    background: filter === 'All' ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                                    border: '1px solid var(--border-default)',
                                    borderColor: filter === 'All' ? 'var(--accent)' : 'var(--border-default)',
                                    borderRadius: '9999px',
                                    color: filter === 'All' ? 'var(--accent)' : 'var(--text-secondary)',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.1s ease',
                                }}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </CardBody>
            </Card>

            {/* Results Area */}
            <Card>
                <CardBody>
                    {!hasSearched ? (
                        <EmptyState
                            icon={
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                                </svg>
                            }
                            title="Start your search"
                            description="Enter a name, licence plate, address, or case number to search across all connected data sources."
                        />
                    ) : (
                        <EmptyState
                            icon={<span style={{ fontSize: '2rem' }}>📭</span>}
                            title="No results found"
                            description={`No entities matching "${query}" were found. Try adjusting your search terms.`}
                        />
                    )}
                </CardBody>
            </Card>
        </div>
    );
};

export default Search;
