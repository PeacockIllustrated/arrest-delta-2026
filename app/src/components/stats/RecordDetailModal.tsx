import React, { useEffect, useCallback, useState } from 'react';
import { Card, CardHeader, CardBody } from '../ui';
import type { RecordDetailModel, ChargeModel } from '../../lib/types/viewModels';
import type { AccessTier } from '../../lib/access/tierConfig';
import { isFieldRestricted } from '../../lib/access/dataMasking';
import type { UserRole } from '../portal/AuthProvider';

// =============================================================================
// RECORD DETAIL MODAL - Full record detail overlay
// =============================================================================

interface RecordDetailModalProps {
  record: RecordDetailModel | null;
  isOpen: boolean;
  onClose: () => void;
  /** User role for permission checks */
  userRole?: UserRole | null;
  /** Access tier info */
  accessTier?: AccessTier;
}

/**
 * Severity badge color mapping
 */
const severityColors: Record<string, string> = {
  Felony: 'var(--danger)',
  Misdemeanor: 'var(--warning)',
  Infraction: 'var(--info, #3b82f6)',
  Unknown: 'var(--text-muted)',
};

/**
 * Mugshot image with error fallback
 * Handles 403 errors from CDN (Cloudflare protection)
 */
const MugshotImage: React.FC<{
  src: string | null;
  alt: string;
  detailUrl?: string | null;
}> = ({ src, alt, detailUrl }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset state when src changes
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  if (!src) {
    return (
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        No Image
      </span>
    );
  }

  if (hasError) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '2rem', opacity: 0.5 }}>📷</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
          Image blocked
        </span>
        {detailUrl && (
          <a
            href={detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.6rem',
              color: 'var(--accent)',
              textDecoration: 'none',
            }}
          >
            View on source →
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
          Loading...
        </span>
      )}
      <img
        src={src}
        alt={alt}
        // Prevents cdn.arrests.org / recentlybooked.com hotlink block
        referrerPolicy="no-referrer"
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: isLoading ? 'none' : 'block',
        }}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </>
  );
};

/**
 * Restricted badge for locked fields
 */
const RestrictedBadge: React.FC<{ tooltip?: string }> = ({ tooltip = 'Upgrade access to view' }) => (
  <span
    title={tooltip}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 6px',
      fontSize: '0.6rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      background: 'var(--surface)',
      color: 'var(--text-muted)',
      cursor: 'help',
    }}
  >
    <span style={{ fontSize: '0.7rem' }}>🔒</span>
    Restricted
  </span>
);

/**
 * Info row component for consistent styling
 * If hideWhenEmpty is true (default), row is hidden when value is null/undefined
 * Set hideWhenEmpty to false for fields that should always show (like Source)
 */
const InfoRow: React.FC<{
  label: string;
  value: string | number | null;
  mono?: boolean;
  restricted?: boolean;
  hideWhenEmpty?: boolean;
}> = ({ label, value, mono = false, restricted = false, hideWhenEmpty = true }) => {
  // Hide row if value is empty and hideWhenEmpty is true
  // Exception: restricted fields should still show the restricted badge
  if (hideWhenEmpty && !restricted && (value === null || value === undefined || value === 'N/A')) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <span
        style={{
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </span>
      {restricted ? (
        <RestrictedBadge />
      ) : (
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 500,
            fontFamily: mono ? 'var(--font-mono)' : 'inherit',
            color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          {value ?? 'N/A'}
        </span>
      )}
    </div>
  );
};

/**
 * Section header component
 */
const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div
    style={{
      fontSize: '0.65rem',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--accent)',
      fontWeight: 600,
      marginBottom: '12px',
      paddingBottom: '8px',
      borderBottom: '2px solid var(--accent)',
    }}
  >
    {title}
  </div>
);

/**
 * Charge row component
 */
const ChargeRow: React.FC<{ charge: ChargeModel; index: number }> = ({ charge, index }) => {
  const severityColor = severityColors[charge.severity || 'Unknown'] || 'var(--text-muted)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '10px 0',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Sequence number */}
      <span
        style={{
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface)',
          fontSize: '0.7rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}
      >
        {index + 1}
      </span>

      {/* Charge details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '0.8rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '4px',
          }}
        >
          {charge.description}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Severity badge */}
          <span
            style={{
              padding: '2px 8px',
              fontSize: '0.6rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              background: `${severityColor}20`,
              color: severityColor,
            }}
          >
            {charge.severityLabel}
          </span>

          {/* Statute code */}
          {charge.statuteCode && (
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {charge.statuteCode}
            </span>
          )}
        </div>
      </div>

      {/* Bond amount */}
      <div
        style={{
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            color: charge.bondAmount ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          {charge.formattedBondAmount}
        </div>
      </div>
    </div>
  );
};

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  isOpen,
  onClose,
  userRole = null,
  accessTier = 'viewer',
}) => {
  // Check field restrictions based on role
  const isPhysicalRestricted = isFieldRestricted('physical', userRole);
  const isBiometricRestricted = isFieldRestricted('biometric', userRole);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !record) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 20px',
        overflowY: 'auto',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-overlay, rgba(0, 0, 0, 0.8))',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal content */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '900px',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--surface)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-head)',
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                {record.personName}
              </h2>
              {/* Access tier badge */}
              <span
                style={{
                  padding: '2px 8px',
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  background:
                    accessTier === 'admin'
                      ? 'var(--success-muted, rgba(34, 197, 94, 0.1))'
                      : accessTier === 'analyst'
                        ? 'var(--info-muted, rgba(59, 130, 246, 0.1))'
                        : 'var(--surface)',
                  color:
                    accessTier === 'admin'
                      ? 'var(--success)'
                      : accessTier === 'analyst'
                        ? 'var(--info, #3b82f6)'
                        : 'var(--text-muted)',
                }}
              >
                {accessTier}
              </span>
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginTop: '4px',
              }}
            >
              {record.countyName} • Booked {record.formattedBookingDate}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '1.2rem',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.borderColor = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Top section: Image + Info columns */}
          {/* Flexbox layout that wraps naturally based on content */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              marginBottom: '24px',
            }}
          >
            {/* Mugshot */}
            <div
              style={{
                width: '120px',
                height: '150px',
                background: 'var(--surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <MugshotImage
                src={record.imageUrl}
                alt={`${record.personName} mugshot`}
                detailUrl={record.detailUrl}
              />
            </div>

            {/* Physical Info - hide section if no physical data */}
            {(record.sex || record.race || record.formattedAge || record.formattedHeight || record.weightLbs || record.hairColor || record.eyeColor || isPhysicalRestricted) && (
              <div style={{ minWidth: '180px', flex: '1 1 180px' }}>
                <SectionHeader title="Physical" />
                <InfoRow label="Sex" value={record.sex} />
                <InfoRow label="Race" value={record.race} />
                <InfoRow label="Age" value={record.formattedAge} />
                <InfoRow
                  label="Height"
                  value={record.formattedHeight}
                  restricted={isPhysicalRestricted}
                />
                <InfoRow
                  label="Weight"
                  value={record.weightLbs ? `${record.weightLbs} lbs` : null}
                  restricted={isPhysicalRestricted}
                />
                <InfoRow label="Hair" value={record.hairColor} restricted={isPhysicalRestricted} />
                <InfoRow label="Eyes" value={record.eyeColor} restricted={isPhysicalRestricted} />
              </div>
            )}

            {/* Financial/Case Info */}
            <div style={{ minWidth: '180px', flex: '1 1 180px' }}>
              <SectionHeader title="Case Info" />
              <InfoRow label="Total Bond" value={record.formattedBondTotal === 'N/A' ? null : record.formattedBondTotal} mono />
              <InfoRow label="Case #" value={record.caseNumber} mono />
              <InfoRow label="Booking ID" value={record.bookingId} mono />
              {/* Source always visible */}
              <InfoRow label="Source" value={record.sourceName} hideWhenEmpty={false} />
            </div>

            {/* Metadata Info */}
            <div style={{ minWidth: '180px', flex: '1 1 180px' }}>
              <SectionHeader title="Metadata" />
              {/* Only show biometric fields if there's actual biometric data or if restricted */}
              {(record.biometricVerified || record.biometricScore || isBiometricRestricted) && (
                <>
                  <InfoRow
                    label="Verified"
                    value={record.biometricVerified ? 'Yes' : 'No'}
                    restricted={isBiometricRestricted}
                    hideWhenEmpty={false}
                  />
                  <InfoRow
                    label="Score"
                    value={record.biometricScore?.toFixed(2) ?? null}
                    mono
                    restricted={isBiometricRestricted}
                  />
                </>
              )}
              <InfoRow label="Booking Time" value={record.bookingTime} />
              {/* Scraped date always visible */}
              <InfoRow
                label="Scraped"
                value={record.scrapedAt?.toLocaleDateString() ?? null}
                hideWhenEmpty={false}
              />
            </div>
          </div>

          {/* Charges section */}
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>Charges</span>
                <span
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    background: 'var(--accent-muted, rgba(228, 0, 40, 0.1))',
                    color: 'var(--accent)',
                  }}
                >
                  {record.charges.length}
                </span>
              </div>
            </CardHeader>
            <CardBody>
              {record.charges.length > 0 ? (
                record.charges.map((charge, index) => (
                  <ChargeRow key={charge.chargeId} charge={charge} index={index} />
                ))
              ) : (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                  }}
                >
                  No charges listed
                </div>
              )}
            </CardBody>
          </Card>

          {/* Detail URL link */}
          {record.detailUrl && (
            <div
              style={{
                marginTop: '16px',
                textAlign: 'center',
              }}
            >
              <a
                href={record.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--accent)',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                View Original Source →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordDetailModal;
