import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, Card, CardHeader, CardBody, Badge, Button, EmptyState } from '../../components/ui';

// Mock data
const mockWatchlistData = {
    id: '1',
    name: 'High Priority Persons',
    description: 'Key individuals requiring immediate notification on any arrest activity.',
    created_at: '2025-11-15T10:00:00Z',
    entities: [
        { id: 'e1', type: 'person' as const, display_name: 'John Michael Smith', added_at: '2025-11-15T10:05:00Z', alert_count: 3 },
        { id: 'e2', type: 'person' as const, display_name: 'Jane Anne Doe', added_at: '2025-11-16T14:30:00Z', alert_count: 2 },
        { id: 'e3', type: 'person' as const, display_name: 'Robert James Wilson', added_at: '2025-11-20T09:00:00Z', alert_count: 0 },
        { id: 'e4', type: 'vehicle' as const, display_name: 'FL ABC-1234', added_at: '2025-12-01T11:00:00Z', alert_count: 2 },
    ],
};

const typeIcons: Record<string, string> = {
    person: '👤',
    vehicle: '🚗',
    location: '📍',
};

const WatchlistDetail: React.FC = () => {
    useParams<{ id: string }>();
    const navigate = useNavigate();

    // In real app, fetch watchlist by id
    const watchlist = mockWatchlistData;

    return (
        <div>
            <PageHeader
                title={watchlist.name}
                description={watchlist.description}
                breadcrumbs={[
                    { label: 'Watchlists', href: '/portal/watchlists' },
                    { label: watchlist.name },
                ]}
                actions={
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="secondary" leftIcon={<span>✏️</span>}>
                            Edit
                        </Button>
                        <Button variant="primary" leftIcon={<span>+</span>}>
                            Add Entity
                        </Button>
                    </div>
                }
            />

            {/* Stats */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px',
                }}
            >
                <Card padding="md">
                    <CardBody>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {watchlist.entities.length}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Entities</div>
                    </CardBody>
                </Card>
                <Card padding="md">
                    <CardBody>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--danger)' }}>
                            {watchlist.entities.reduce((sum, e) => sum + e.alert_count, 0)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Alerts</div>
                    </CardBody>
                </Card>
                <Card padding="md">
                    <CardBody>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {watchlist.entities.filter((e) => e.type === 'person').length}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>People</div>
                    </CardBody>
                </Card>
                <Card padding="md">
                    <CardBody>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {watchlist.entities.filter((e) => e.type === 'vehicle').length}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vehicles</div>
                    </CardBody>
                </Card>
            </div>

            {/* Entities List */}
            <Card>
                <CardHeader actions={<Badge>{watchlist.entities.length} items</Badge>}>
                    Entities
                </CardHeader>
                <CardBody cardPadding="0">
                    {watchlist.entities.length === 0 ? (
                        <EmptyState
                            title="No entities in this watchlist"
                            description="Add entities to start monitoring them."
                            action={{ label: 'Add Entity', onClick: () => { } }}
                        />
                    ) : (
                        <div>
                            {watchlist.entities.map((entity, index) => (
                                <div
                                    key={entity.id}
                                    onClick={() => navigate(`/portal/entities/${entity.id}`)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '14px 20px',
                                        borderBottom: index < watchlist.entities.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                                        cursor: 'pointer',
                                        transition: 'background 0.1s ease',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--sidebar-item-hover)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <span style={{ fontSize: '1.25rem' }}>{typeIcons[entity.type]}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {entity.display_name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            Added {new Date(entity.added_at).toLocaleDateString('en-GB')}
                                        </div>
                                    </div>
                                    {entity.alert_count > 0 && (
                                        <Badge variant="danger" size="sm">
                                            {entity.alert_count} alerts
                                        </Badge>
                                    )}
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
};

export default WatchlistDetail;
