import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, Card, CardHeader, CardBody, Badge, Button, EmptyState } from '../../components/ui';
import { REAL_MUGSHOT_ENTRIES } from '../../lib/demo/realMugshots';

// Seeded from real records. Picks the 10 highest-charge-count people to fill
// the "High Priority Persons" watchlist with realistic detail.
const topRisk = [...REAL_MUGSHOT_ENTRIES]
    .sort((a, b) => b.allCharges.length - a.allCharges.length)
    .slice(0, 12);

const mockWatchlistData = {
    id: '1',
    name: 'High Priority Persons',
    description: 'Key individuals requiring immediate notification on any arrest activity.',
    created_at: '2025-11-15T10:00:00Z',
    entities: topRisk.map((r, i) => ({
        id: r.personId,
        type: 'person' as const,
        display_name: r.displayName,
        added_at: new Date(Date.now() - (60 - i * 3) * 86400 * 1000).toISOString(),
        alert_count: Math.min(r.allCharges.length, 5),
        mugshotUrl: r.mugshotUrl,
        subtitle: `${r.countyDisplayName}, ${r.stateCode}`,
    })),
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
                            {watchlist.entities.filter((e) => (e.type as string) === 'vehicle').length}
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
                                    {entity.mugshotUrl ? (
                                        <img
                                            src={entity.mugshotUrl}
                                            alt=""
                                            referrerPolicy="no-referrer"
                                            loading="lazy"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', background: 'var(--bg-elevated)', flexShrink: 0 }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: '1.25rem' }}>{typeIcons[entity.type]}</span>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {entity.display_name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {entity.subtitle ? `${entity.subtitle} • ` : ''}Added {new Date(entity.added_at).toLocaleDateString('en-GB')}
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
