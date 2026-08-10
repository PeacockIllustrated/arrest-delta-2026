import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import LeadDetailsModal from './LeadDetailsModal';

interface Lead {
    id: string;
    created_at: string;
    name: string;
    organization: string;
    email: string;
    employee_count: string;
    message: string;
}

const LeadTable: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching leads:', error);
        }
        if (data) setLeads(data);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        // Confirmation is handled in the modal or inline button
        const { error } = await supabase.from('leads').delete().eq('id', id);
        if (!error) {
            setLeads(leads.filter(l => l.id !== id));
            if (selectedLead?.id === id) setSelectedLead(null);
        }
    };

    if (loading) return <div style={{ padding: '2rem', color: '#666' }}>SCANNING DATABASE...</div>;

    return (
        <>
            <div style={{
                border: '1px solid #333',
                background: 'rgba(255, 255, 255, 0.02)',
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid #333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '0.8rem', letterSpacing: '1px', color: '#888' }}>RECENT INTERCEPTS</span>
                    <button onClick={fetchLeads} style={{ background: 'none', border: 'none', color: '#e40028', cursor: 'pointer', fontSize: '0.8rem' }}>REFRESH</button>
                </div>

                {/* Record tables are wider than a phone; let this one scroll
                    inside its panel rather than clip at the screen edge. */}
                <div className="pf-table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #333', color: '#666', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', fontWeight: 'normal' }}>TIMESTAMP</th>
                            <th style={{ padding: '1rem', fontWeight: 'normal' }}>IDENTITY</th>
                            <th style={{ padding: '1rem', fontWeight: 'normal' }}>AFFILIATION</th>
                            <th style={{ padding: '1rem', fontWeight: 'normal' }}>WORKFORCE</th>
                            <th style={{ padding: '1rem', fontWeight: 'normal' }}>CONTACT</th>
                            <th style={{ padding: '1rem', fontWeight: 'normal' }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leads.map((lead) => (
                            <tr
                                key={lead.id}
                                onClick={() => setSelectedLead(lead)}
                                style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    transition: 'background 0.2s',
                                    cursor: 'pointer'
                                }}
                                className="table-row"
                            >
                                <td style={{ padding: '1rem', color: '#888' }}>
                                    {new Date(lead.created_at).toLocaleString()}
                                </td>
                                <td style={{ padding: '1rem', color: 'white' }}>{lead.name}</td>
                                <td style={{ padding: '1rem', color: '#e40028' }}>{lead.organization}</td>
                                <td style={{ padding: '1rem' }}>{lead.employee_count}</td>
                                <td style={{ padding: '1rem' }}>{lead.email}</td>
                                <td style={{ padding: '1rem' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm('CONFIRM PURGE?')) handleDelete(lead.id);
                                        }}
                                        style={{
                                            background: 'none',
                                            border: '1px solid #333',
                                            color: '#666',
                                            padding: '0.2rem 0.5rem',
                                            cursor: 'pointer',
                                            fontSize: '0.7rem'
                                        }}
                                        className="delete-btn"
                                    >
                                        PURGE
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {leads.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                                    NO RECORDS FOUND
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
                <style>{`
                    .table-row:hover {
                        background: rgba(228, 0, 40, 0.05);
                    }
                    .delete-btn:hover {
                        border-color: #e40028 !important;
                        color: #e40028 !important;
                    }
                `}</style>
            </div>

            {selectedLead && (
                <LeadDetailsModal
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onDelete={handleDelete}
                />
            )}
        </>
    );
};

export default LeadTable;
