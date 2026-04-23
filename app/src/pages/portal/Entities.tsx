import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, CardBody, Badge, Button, Input, EmptyState } from '../../components/ui';
import { PersonIcon, VehicleIcon, LocationIcon, ListIcon } from '../../components/portal/Icons';
import { REAL_MUGSHOT_ENTRIES } from '../../lib/demo/realMugshots';

interface Entity {
    id: string;
    type: 'person' | 'vehicle' | 'location';
    display_name: string;
    last_seen: string;
    alert_count: number;
    watchlist_count: number;
    mugshotUrl?: string;
    subtitle?: string;
}

// First 30 entities sourced from the real seed.
// Mix in a few synthetic vehicle + location entries for variety.
const mockEntities: Entity[] = [
    ...REAL_MUGSHOT_ENTRIES.slice(0, 30).map((r, i) => ({
        id: r.personId,
        type: 'person' as const,
        display_name: r.displayName,
        last_seen: new Date(Date.now() - (i * 4) * 3600 * 1000).toISOString(),
        alert_count: r.allCharges.length > 2 ? 3 : r.allCharges.length > 0 ? 1 : 0,
        watchlist_count: (i % 3) + 1,
        mugshotUrl: r.mugshotUrl,
        subtitle: `${r.countyDisplayName}, ${r.stateCode}${r.age ? ` • Age ${r.age}` : ''}`,
    })),
    // A handful of non-person entities for the "Vehicles" / "Locations" filters
    { id: 'v1', type: 'vehicle', display_name: 'TX 8TDA-X44', last_seen: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), alert_count: 2, watchlist_count: 1 },
    { id: 'v2', type: 'vehicle', display_name: 'CA 7BYJ-921', last_seen: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), alert_count: 0, watchlist_count: 1 },
    { id: 'v3', type: 'vehicle', display_name: 'NY HKL-3201', last_seen: new Date(Date.now() - 9 * 3600 * 1000).toISOString(), alert_count: 1, watchlist_count: 2 },
    { id: 'l1', type: 'location', display_name: '4100 Duval St, Austin, TX', last_seen: new Date(Date.now() - 16 * 3600 * 1000).toISOString(), alert_count: 0, watchlist_count: 0 },
    { id: 'l2', type: 'location', display_name: '1450 Western Ave, Seattle, WA', last_seen: new Date(Date.now() - 22 * 3600 * 1000).toISOString(), alert_count: 0, watchlist_count: 1 },
];

const typeConfig: Record<string, { Icon: React.FC<{ size?: number; color?: string }>; label: string }> = {
    person: { Icon: PersonIcon, label: 'Person' },
    vehicle: { Icon: VehicleIcon, label: 'Vehicle' },
    location: { Icon: LocationIcon, label: 'Location' },
};

const Entities: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div>
            <PageHeader
                title="Entities"
                description="All tracked persons, vehicles, and locations in your organisation"
                actions={
                    <Button variant="primary" leftIcon={<span>+</span>}>
                        Add Entity
                    </Button>
                }
            />

            {/* Filters */}
            <Card style={{ marginBottom: '24px' }}>
                <CardBody>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <Input
                                placeholder="Search entities..."
                                leftIcon={
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                                    </svg>
                                }
                                fullWidth
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['All', 'People', 'Vehicles', 'Locations'].map((filter) => (
                                <button
                                    key={filter}
                                    style={{
                                        padding: '8px 16px',
                                        background: filter === 'All' ? 'var(--accent-muted)' : 'transparent',
                                        border: '1px solid var(--border-default)',
                                        borderColor: filter === 'All' ? 'var(--accent)' : 'var(--border-default)',
                                        borderRadius: '0px',
                                        color: filter === 'All' ? 'var(--accent)' : 'var(--text-muted)',
                                        fontFamily: 'var(--font-body, inherit)',
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Entities Table */}
            <Card>
                <CardBody cardPadding="0">
                    {mockEntities.length === 0 ? (
                        <EmptyState
                            icon={<ListIcon size={32} />}
                            title="No entities found"
                            description="Add entities to start tracking them."
                            action={{ label: 'Add Entity', onClick: () => { } }}
                        />
                    ) : (
                        <div>
                            {/* Table Header */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
                                    gap: '16px',
                                    padding: '12px 20px',
                                    borderBottom: '1px solid var(--border-default)',
                                    fontFamily: 'var(--font-body, inherit)',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                }}
                            >
                                <div>Entity</div>
                                <div>Type</div>
                                <div>Alerts</div>
                                <div>Watchlists</div>
                                <div></div>
                            </div>

                            {/* Table Rows */}
                            {mockEntities.map((entity) => {
                                const { Icon } = typeConfig[entity.type];
                                return (
                                    <div
                                        key={entity.id}
                                        onClick={() => navigate(`/portal/entities/${entity.id}`)}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
                                            gap: '16px',
                                            padding: '14px 20px',
                                            alignItems: 'center',
                                            borderBottom: '1px solid var(--border-subtle)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--sidebar-item-hover)';
                                            e.currentTarget.style.borderLeft = '2px solid var(--accent)';
                                            e.currentTarget.style.paddingLeft = '18px';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.borderLeft = 'none';
                                            e.currentTarget.style.paddingLeft = '20px';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {entity.mugshotUrl ? (
                                                <img
                                                    src={entity.mugshotUrl}
                                                    alt=""
                                                    referrerPolicy="no-referrer"
                                                    loading="lazy"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', background: 'var(--bg-elevated)', flexShrink: 0 }}
                                                />
                                            ) : (
                                                <span style={{ color: 'var(--accent)' }}>
                                                    <Icon size={20} />
                                                </span>
                                            )}
                                            <div>
                                                <div style={{
                                                    fontFamily: 'var(--font-body, inherit)',
                                                    fontWeight: 600,
                                                    color: 'var(--text-primary)'
                                                }}>
                                                    {entity.display_name}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.7rem',
                                                    fontFamily: 'var(--font-body, inherit)',
                                                    color: 'var(--text-muted)',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {entity.subtitle ? entity.subtitle : `Last activity: ${new Date(entity.last_seen).toLocaleString('en-GB')}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <Badge size="sm">{typeConfig[entity.type].label}</Badge>
                                        </div>
                                        <div>
                                            {entity.alert_count > 0 ? (
                                                <Badge variant="danger" size="sm">{entity.alert_count}</Badge>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>0</span>
                                            )}
                                        </div>
                                        <div style={{
                                            color: 'var(--text-secondary)',
                                            fontFamily: 'var(--font-body, inherit)',
                                            fontSize: '0.875rem'
                                        }}>
                                            {entity.watchlist_count}
                                        </div>
                                        <div>
                                            <Button size="sm" variant="ghost">View</Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
};

export default Entities;

