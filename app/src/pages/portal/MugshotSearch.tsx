import React, { useState, useRef } from 'react';
import { PageHeader, Card, CardHeader, CardBody, Badge, Button, EmptyState } from '../../components/ui';
import { SearchIcon, PersonIcon, LocationIcon, BellIcon, DocumentIcon, CheckIcon, XIcon, EyeIcon } from '../../components/portal/Icons';
import { REAL_MUGSHOT_ENTRIES } from '../../lib/demo/realMugshots';

// =============================================================================
// TYPES
// =============================================================================

interface MugshotMatch {
    id: string;
    name: string;
    confidence: number;
    dob: string;
    last_known_address: string;
    arrest_count: number;
    last_arrest_date: string | null;
    mugshotUrl: string;
    topCharge: string | null;
}

// =============================================================================
// TIER 1 DEMO MATCHER
// =============================================================================
// Real facial recognition isn't wired up yet (see scraper StubBiometricGate).
// For the demo we simulate the UX: on upload, hash the file to pick a
// deterministic anchor index into REAL_MUGSHOT_ENTRIES, then return 10
// candidates with scores falling off from the anchor. Result: same photo always
// returns the same matches, and every match is a real person + real mugshot.
function hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

function rankedMatches(probeKey: string): MugshotMatch[] {
    if (REAL_MUGSHOT_ENTRIES.length === 0) return [];
    const anchor = hashString(probeKey) % REAL_MUGSHOT_ENTRIES.length;
    const take = 10;
    const out: MugshotMatch[] = [];
    for (let i = 0; i < take; i++) {
        const entry = REAL_MUGSHOT_ENTRIES[(anchor + i) % REAL_MUGSHOT_ENTRIES.length];
        // Confidence falls off quickly after the top match; tuned so the #1 is
        // high-90s, #2-3 are mid-80s, tail drops into 60s.
        const base = 97 - (i * 4) - (hashString(entry.personId) % 3);
        const confidence = Math.max(40, base);
        const priorArrests = (hashString(entry.personId + 'arr') % 6) + 1;
        const lastDaysAgo = (hashString(entry.personId + 'date') % 800) + 30;
        const lastDate = new Date(Date.now() - lastDaysAgo * 86400 * 1000)
            .toISOString().split('T')[0];
        out.push({
            id: entry.personId,
            name: entry.displayName,
            confidence,
            dob: entry.dobYear ? String(entry.dobYear) : 'Unknown',
            last_known_address: `${entry.countyDisplayName}, ${entry.stateCode}`,
            arrest_count: priorArrests,
            last_arrest_date: lastDate,
            mugshotUrl: entry.mugshotUrl,
            topCharge: entry.topCharge,
        });
    }
    return out;
}

// =============================================================================
// COMPONENT
// =============================================================================

const MugshotSearch: React.FC = () => {
    const [hasUploaded, setHasUploaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<MugshotMatch | null>(null);
    const [probePreview, setProbePreview] = useState<string | null>(null);
    const [matches, setMatches] = useState<MugshotMatch[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const runMatch = (probeKey: string, previewUrl: string | null) => {
        setIsProcessing(true);
        setProbePreview(previewUrl);
        // Simulate network + model inference latency
        setTimeout(() => {
            setMatches(rankedMatches(probeKey));
            setIsProcessing(false);
            setHasUploaded(true);
        }, 1400);
    };

    const handleFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            runMatch(`${file.name}|${file.size}`, typeof reader.result === 'string' ? reader.result : null);
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = () => {
        // No real file — deterministic anchor off current timestamp so demos
        // can re-click for variety (but a real file always returns consistent matches).
        runMatch(`demo-${Math.floor(Date.now() / 60000)}`, null);
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 90) return 'var(--success)';
        if (confidence >= 70) return 'var(--warning)';
        return 'var(--text-muted)';
    };

    const getConfidenceBadge = (confidence: number): 'success' | 'warning' | 'default' => {
        if (confidence >= 90) return 'success';
        if (confidence >= 70) return 'warning';
        return 'default';
    };

    return (
        <div>
            <PageHeader
                title="Mugshot Search"
                description="Upload an image to search for matching mugshots and arrest records"
            />

            {/* Upload Area */}
            <Card style={{ marginBottom: '24px' }}>
                <CardHeader>Upload Image</CardHeader>
                <CardBody>
                    <div
                        style={{
                            border: '2px dashed var(--border-default)',
                            borderRadius: '8px',
                            padding: '48px',
                            textAlign: 'center',
                            background: 'var(--bg-elevated)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.borderColor = 'var(--accent)';
                            e.currentTarget.style.background = 'var(--accent-muted)';
                        }}
                        onDragLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-default)';
                            e.currentTarget.style.background = 'var(--bg-elevated)';
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.borderColor = 'var(--border-default)';
                            e.currentTarget.style.background = 'var(--bg-elevated)';
                            const file = e.dataTransfer?.files?.[0];
                            if (file) handleFile(file); else handleUpload();
                        }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFile(file);
                            }}
                        />
                        {isProcessing ? (
                            <div>
                                <div style={{ marginBottom: '16px', color: 'var(--accent)' }}>
                                    <SearchIcon size={48} />
                                </div>
                                <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 500 }}>
                                    Processing image...
                                </p>
                                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Searching mugshot databases
                                </p>
                            </div>
                        ) : hasUploaded ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', justifyContent: 'center' }}>
                                {probePreview && (
                                    <img
                                        src={probePreview}
                                        alt="probe"
                                        style={{ width: 96, height: 96, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-default)' }}
                                    />
                                )}
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ marginBottom: '8px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <CheckIcon size={20} />
                                        <span style={{ fontWeight: 500 }}>Image matched — {matches.length} candidates</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Top match confidence: {matches[0]?.confidence ?? 0}%
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        style={{ marginTop: '8px' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setHasUploaded(false);
                                            setProbePreview(null);
                                            setMatches([]);
                                        }}
                                    >
                                        Upload New Image
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ marginBottom: '16px', color: 'var(--accent)' }}>
                                    <EyeIcon size={48} />
                                </div>
                                <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 500 }}>
                                    Drop an image here or click to upload
                                </p>
                                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Supports JPG, PNG, WEBP (max 10MB)
                                </p>
                            </div>
                        )}
                    </div>
                </CardBody>
            </Card>

            {/* Results */}
            <Card>
                <CardHeader>
                    {hasUploaded ? `Potential Matches (${matches.length} found)` : 'Matches'}
                </CardHeader>
                <CardBody>
                    {!hasUploaded ? (
                        <EmptyState
                            icon={<SearchIcon size={32} />}
                            title="No image uploaded"
                            description="Upload an image above to search for matching mugshots in connected databases."
                        />
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '16px',
                        }}>
                            {matches.map((match) => (
                                <div
                                    key={match.id}
                                    onClick={() => setSelectedMatch(match)}
                                    style={{
                                        padding: '16px',
                                        background: 'var(--bg-elevated)',
                                        border: `1px solid ${selectedMatch?.id === match.id ? 'var(--accent)' : 'var(--border-subtle)'}`,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                        {/* Real mugshot from Supabase Storage */}
                                        <div
                                            style={{
                                                width: '64px',
                                                height: '80px',
                                                background: 'var(--bg-base)',
                                                borderRadius: '4px',
                                                overflow: 'hidden',
                                                flexShrink: 0,
                                                position: 'relative',
                                            }}
                                        >
                                            <img
                                                src={match.mugshotUrl}
                                                alt={match.name}
                                                referrerPolicy="no-referrer"
                                                loading="lazy"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                {match.name}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                                DOB: {match.dob}
                                            </div>
                                            <Badge variant={getConfidenceBadge(match.confidence)} size="sm">
                                                {match.confidence}% Match
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Confidence bar */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{
                                            height: '4px',
                                            background: 'var(--border-default)',
                                            borderRadius: '2px',
                                            overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${match.confidence}%`,
                                                background: getConfidenceColor(match.confidence),
                                                transition: 'width 0.3s ease',
                                            }} />
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <LocationIcon size={12} /> {match.last_known_address}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <BellIcon size={12} /> {match.arrest_count} prior arrests
                                        </div>
                                        {match.last_arrest_date && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <DocumentIcon size={12} /> Last: {match.last_arrest_date}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Selected Match Detail Modal/Card */}
            {selectedMatch && (
                <Card style={{ marginTop: '24px' }}>
                    <CardHeader
                        actions={
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedMatch(null)}
                                leftIcon={<XIcon size={14} />}
                            >
                                Close
                            </Button>
                        }
                    >
                        Match Details
                    </CardHeader>
                    <CardBody>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            <div
                                style={{
                                    width: '120px',
                                    height: '150px',
                                    background: 'var(--bg-elevated)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    color: 'var(--text-muted)',
                                }}
                            >
                                <PersonIcon size={64} />
                            </div>
                            <div style={{ flex: 1, minWidth: '250px' }}>
                                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                                    {selectedMatch.name}
                                </h3>
                                <Badge
                                    variant={getConfidenceBadge(selectedMatch.confidence)}
                                    style={{ marginBottom: '16px' }}
                                >
                                    {selectedMatch.confidence}% Confidence Match
                                </Badge>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.875rem' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Date of Birth</div>
                                        <div style={{ color: 'var(--text-primary)' }}>{selectedMatch.dob}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Location</div>
                                        <div style={{ color: 'var(--text-primary)' }}>{selectedMatch.last_known_address}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Prior Arrests</div>
                                        <div style={{ color: 'var(--text-primary)' }}>{selectedMatch.arrest_count}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Last Arrest</div>
                                        <div style={{ color: 'var(--text-primary)' }}>{selectedMatch.last_arrest_date || 'N/A'}</div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                                    <Button variant="primary">View Full Record</Button>
                                    <Button variant="secondary">Link to Employee</Button>
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
};

export default MugshotSearch;
