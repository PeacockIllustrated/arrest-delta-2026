/**
 * SEED DATA
 * =========
 *
 * Fabricated stand-ins for what used to live in Postgres. Every person,
 * organisation, lead and message below is invented for the portfolio build —
 * no real investor, customer or prospect data ships in this repository.
 *
 * Three personas exist so the original permission model can be explored:
 *
 *   visitor@portfolio.local     every deck granted — the default identity, and
 *                               the reason this build reads as "unrestricted"
 *   restricted@portfolio.local  core materials only — shows the locked cards
 *                               and the request-access flow as investors saw it
 *   admin@portfolio.local       emulated super admin — the provisioning console
 */

import { DECKS } from '../decks';
import type { LocalDatabase, Row } from './db';

export const VISITOR_USER_ID = 'portfolio-visitor';
export const RESTRICTED_USER_ID = 'portfolio-restricted';
export const ADMIN_USER_ID = 'portfolio-admin';

export interface Persona {
    id: string;
    email: string;
    name: string;
    role: 'super_admin' | 'viewer';
    /** Short line shown in the identity switcher. */
    blurb: string;
}

export const PERSONAS: Persona[] = [
    {
        id: VISITOR_USER_ID,
        email: 'visitor@portfolio.local',
        name: 'Portfolio Visitor',
        role: 'viewer',
        blurb: 'Full access to every deck. The default for this portfolio build.',
    },
    {
        id: RESTRICTED_USER_ID,
        email: 'restricted@portfolio.local',
        name: 'Restricted Investor',
        role: 'viewer',
        blurb: 'Core materials only — see the locked cards and request-access flow.',
    },
    {
        id: ADMIN_USER_ID,
        email: 'admin@portfolio.local',
        name: 'Emulated Admin',
        role: 'super_admin',
        blurb: 'Provisioning console, review mode and the notification queue.',
    },
];

export const DEFAULT_PERSONA_ID = VISITOR_USER_ID;

/** Decks the "restricted" persona can see: everything except the partner pack. */
const RESTRICTED_DECK_IDS = DECKS.filter(d => d.category === 'investor').map(d => d.id);
const ALL_DECK_IDS = DECKS.map(d => d.id);

/**
 * Timestamps are generated relative to load so the admin console never shows a
 * wall of stale 2026 dates. Offsets are in hours before "now".
 */
function hoursAgo(hours: number): string {
    return new Date(Date.now() - hours * 3600_000).toISOString();
}

function grantRows(userId: string, deckIds: string[], grantedBy: string): Row[] {
    return deckIds.map((deckId, i) => ({
        id: `grant-${userId}-${deckId}`,
        user_id: userId,
        lead_id: null,
        deck_id: deckId,
        granted_at: hoursAgo(72 - i),
        granted_by: grantedBy,
    }));
}

export function buildSeed(): LocalDatabase {
    const authUsers: Row[] = PERSONAS.map((p, i) => ({
        id: p.id,
        email: p.email,
        name: p.name,
        created_at: hoursAgo(240 - i * 24),
    }));

    const profiles: Row[] = PERSONAS.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        org_id: null,
        created_at: hoursAgo(240),
        updated_at: hoursAgo(240),
    }));

    const userDeckAccess: Row[] = [
        ...grantRows(VISITOR_USER_ID, ALL_DECK_IDS, 'system'),
        ...grantRows(RESTRICTED_USER_ID, RESTRICTED_DECK_IDS, 'admin@portfolio.local'),
        ...grantRows(ADMIN_USER_ID, ALL_DECK_IDS, 'system'),
    ];

    // A couple of decks pre-marked as opened/read so the read-tracking UI on the
    // hub has something to show on a first visit.
    const readStatus: Row[] = [
        {
            user_id: VISITOR_USER_ID,
            deck_id: 'investor-one-pager',
            opened_at: hoursAgo(5),
            marked_read_at: hoursAgo(4),
        },
        {
            user_id: VISITOR_USER_ID,
            deck_id: 'investor-deck',
            opened_at: hoursAgo(3),
            marked_read_at: null,
        },
    ];

    // The restricted persona has already asked for one of the partner decks, so
    // the "REQUESTED" state and the admin approval queue both have live content.
    const accessRequests: Row[] = [
        {
            id: 'req-seed-uber-overview',
            user_id: RESTRICTED_USER_ID,
            deck_id: 'uber-overview',
            status: 'pending',
            requested_at: hoursAgo(6),
            resolved_at: null,
            resolved_by: null,
        },
    ];

    const notifications: Row[] = [
        {
            id: 'notif-seed-1',
            type: 'deck_access_request',
            title: 'Deck access requested',
            message: 'Restricted Investor requested access to UBER OVERVIEW.',
            user_id: RESTRICTED_USER_ID,
            user_email: 'restricted@portfolio.local',
            metadata: { deck_id: 'uber-overview', request_id: 'req-seed-uber-overview' },
            is_read: false,
            created_at: hoursAgo(6),
        },
        {
            id: 'notif-seed-2',
            type: 'new_signup',
            title: 'New data room signup',
            message: 'restricted@portfolio.local created an account.',
            user_id: RESTRICTED_USER_ID,
            user_email: 'restricted@portfolio.local',
            metadata: {},
            is_read: false,
            created_at: hoursAgo(30),
        },
        {
            id: 'notif-seed-3',
            type: 'system',
            title: 'Backend decommissioned',
            message:
                'Supabase project deleted. This console now runs against a local emulation for portfolio purposes.',
            user_id: null,
            user_email: null,
            metadata: {},
            is_read: true,
            created_at: hoursAgo(2),
        },
    ];

    const leads: Row[] = [
        {
            id: 'lead-001',
            name: 'Dale Whitcombe',
            organization: 'Northgate Logistics',
            email: 'd.whitcombe@northgate.example',
            employee_count: '5,000-10,000',
            message: 'Interested in the driver screening angle. Can we see the GTM plan?',
            source: 'investor_pack',
            created_at: hoursAgo(20),
            updated_at: hoursAgo(20),
        },
        {
            id: 'lead-002',
            name: 'Priya Raman',
            organization: 'Coastline Staffing Group',
            email: 'praman@coastline.example',
            employee_count: '1,000-5,000',
            message: 'Following up after the intro call — please share the revenue model.',
            source: 'investor_pack',
            created_at: hoursAgo(52),
            updated_at: hoursAgo(52),
        },
        {
            id: 'lead-003',
            name: 'Marcus Feld',
            organization: 'Feld Ventures',
            email: 'marcus@feldventures.example',
            employee_count: '<100',
            message: 'Reviewing for a possible seed cheque. Valuation rationale would help.',
            source: 'one_pager',
            created_at: hoursAgo(96),
            updated_at: hoursAgo(96),
        },
    ];

    const projectTasks: Row[] = [
        {
            id: 'task-001',
            created_at: hoursAgo(200),
            title: 'Verification-first ingest for top 50 counties',
            description: 'Cross-source confirmation before any escalation is raised.',
            status: 'completed',
            phase: 'Phase 1',
            order_index: 1,
            technical_details: { assignee: 'Engineering', priority: 'high', category: 'pipeline' },
        },
        {
            id: 'task-002',
            created_at: hoursAgo(180),
            title: 'Data room access provisioning',
            description: 'Per-deck grants, request queue, and admin notifications.',
            status: 'completed',
            phase: 'Phase 2',
            order_index: 2,
            technical_details: { assignee: 'Engineering', priority: 'high', category: 'platform' },
        },
        {
            id: 'task-003',
            created_at: hoursAgo(60),
            title: 'Repackage data room as a static portfolio build',
            description: 'Emulate the removed backend locally so the workflow stays demonstrable.',
            status: 'in_progress',
            phase: 'Ad-hoc',
            order_index: 3,
            technical_details: { assignee: 'Engineering', priority: 'medium', category: 'platform' },
        },
        {
            id: 'task-004',
            created_at: hoursAgo(48),
            title: 'Archive supporting diligence documents',
            description: 'Changelogs and self-checks kept alongside each deck.',
            status: 'pending',
            phase: 'Ad-hoc',
            order_index: 4,
            technical_details: { assignee: 'Ops', priority: 'low', category: 'docs' },
        },
    ];

    return {
        auth_users: authUsers,
        profiles,
        user_deck_access: userDeckAccess,
        user_deck_read_status: readStatus,
        deck_access_requests: accessRequests,
        super_admin_deck_reviews: [],
        admin_notifications: notifications,
        leads,
        project_tasks: projectTasks,
    };
}
