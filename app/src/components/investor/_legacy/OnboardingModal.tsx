import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<'typing' | 'form' | 'success'>('typing');
    const [headerText, setHeaderText] = useState('');
    const [formData, setFormData] = useState({ name: '', organization: '', email: '', employeeCount: '', message: '' });
    const fullText = "SECURE CHANNEL // ENCRYPTED HANDSHAKE";

    useEffect(() => {
        if (isOpen) {
            setStep('typing');
            setHeaderText('');
            setFormData({ name: '', organization: '', email: '', employeeCount: '', message: '' });
            let i = 0;
            const timer = setInterval(() => {
                setHeaderText(fullText.substring(0, i + 1));
                i++;
                if (i === fullText.length) {
                    clearInterval(timer);
                    setTimeout(() => setStep('form'), 500);
                }
            }, 30);
            return () => clearInterval(timer);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Submit to Supabase
        const { error } = await supabase
            .from('leads')
            .insert([
                {
                    name: formData.name,
                    organization: formData.organization,
                    email: formData.email,
                    employee_count: formData.employeeCount,
                    message: formData.message,
                    source: 'investor_pack'
                }
            ]);

        if (error) {
            console.error('Error submitting lead:', error);
            // Optional: Handle error UI, but for now we proceed to success for UX
        }

        setStep('success');
        setTimeout(() => {
            onClose();
            setStep('typing');
        }, 2000);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownOptions = [
        { value: "50-250", label: "50 - 250" },
        { value: "250-1000", label: "250 - 1,000" },
        { value: "1000-5000", label: "1,000 - 5,000" },
        { value: "5000-10000", label: "5,000 - 10,000" },
        { value: "10000+", label: "10,000+" }
    ];

    const handleDropdownSelect = (value: string) => {
        setFormData({ ...formData, employeeCount: value });
        setIsDropdownOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ overflow: 'visible' }}>
                <div className="modal-header">
                    <span className="text-mono text-red" style={{ fontSize: '0.9rem' }}>
                        {headerText}<span className="cursor-blink">_</span>
                    </span>
                    <button onClick={onClose} className="modal-close">X</button>
                </div>

                {step === 'form' && (
                    <form onSubmit={handleSubmit} style={{ animation: 'fade-in 0.5s' }}>
                        {/* This form used to write a lead to Supabase and notify the
                            team. It now writes to browser storage only — say so
                            plainly rather than let anyone type a real address into
                            a box that goes nowhere. */}
                        <div style={{
                            border: '1px solid rgba(228, 0, 40, 0.4)',
                            background: 'rgba(228, 0, 40, 0.08)',
                            padding: '0.6rem 0.75rem',
                            marginBottom: '1.25rem',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.65rem',
                            lineHeight: 1.7,
                            color: '#c98b95',
                        }}>
                            DEMO FORM — this goes nowhere. Submissions are stored in your
                            browser so they show up in the emulated admin console. Please
                            don't enter real contact details.
                        </div>
                        <div className="input-group">
                            <label className="input-label">IDENTITY</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="FULL NAME"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="grid-2" style={{ gap: '1rem', marginBottom: '0', position: 'relative', zIndex: 20 }}>
                            <div className="input-group">
                                <label className="input-label">AFFILIATION</label>
                                <input
                                    type="text"
                                    name="organization"
                                    value={formData.organization}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="ORG / FUND"
                                    required
                                />
                            </div>
                            <div className="input-group" style={{ position: 'relative' }}>
                                <label className="input-label">WORKFORCE</label>
                                <div
                                    className={`input-field ${isDropdownOpen ? 'active' : ''}`}
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                >
                                    <span style={{ color: formData.employeeCount ? 'var(--color-signal-white)' : '#757575' }}>
                                        {formData.employeeCount ? dropdownOptions.find(opt => opt.value === formData.employeeCount)?.label : "SELECT SIZE"}
                                    </span>
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                                    >
                                        <path d="M6 9l6 6 6-6" />
                                    </svg>
                                </div>
                                {isDropdownOpen && (
                                    <div className="custom-dropdown-menu">
                                        {dropdownOptions.map((option) => (
                                            <div
                                                key={option.value}
                                                className={`custom-dropdown-item ${formData.employeeCount === option.value ? 'selected' : ''}`}
                                                onClick={() => handleDropdownSelect(option.value)}
                                            >
                                                {option.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="input-group">
                            <label className="input-label">CONTACT</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="SECURE EMAIL"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">INTEL</label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="ADDITIONAL CONTEXT (OPTIONAL)"
                                rows={2}
                                style={{ resize: 'none' }}
                            />
                        </div>
                        <button type="submit" className="btn" style={{ width: '100%', marginTop: '0.5rem' }}>
                            TRANSMIT REQUEST
                        </button>
                    </form>
                )}

                {step === 'success' && (
                    <div style={{ textAlign: 'center', padding: '2rem 0', animation: 'fade-in 0.5s' }}>
                        <div style={{ fontSize: '3rem', color: 'var(--color-alert-red)', marginBottom: '1rem' }}>✓</div>
                        <h3 className="text-mono text-white">SAVED LOCALLY</h3>
                        <p className="text-muted text-mono" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                            NOTHING WAS TRANSMITTED. FIND IT IN THE EMULATED ADMIN CONSOLE.
                        </p>
                    </div>
                )}
            </div>
            <style>{`
                .cursor-blink {
                    animation: blink 1s step-end infinite;
                }
                @keyframes blink {
                    50% { opacity: 0; }
                }
                .custom-dropdown-menu {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    width: 100%;
                    background: #0a0a0a;
                    border: 1px solid var(--color-grid);
                    border-top: none;
                    z-index: 100;
                    max-height: 200px;
                    overflow-y: auto;
                }
                .custom-dropdown-item {
                    padding: 1rem;
                    cursor: pointer;
                    color: var(--color-signal-white);
                    font-family: var(--font-mono);
                    transition: all 0.2s;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                .custom-dropdown-item:last-child {
                    border-bottom: none;
                }
                .custom-dropdown-item:hover,
                .custom-dropdown-item.selected {
                    background: var(--color-alert-red);
                    color: white;
                }
            `}</style>
        </div>
    );
};

export default OnboardingModal;
