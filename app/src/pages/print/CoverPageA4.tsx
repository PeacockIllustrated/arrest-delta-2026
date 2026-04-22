import React, { useEffect } from 'react';
import '../../styles/brand.css';
import logoMain from '../../assets/logo_main.png';

const CoverPageA4: React.FC = () => {

    useEffect(() => {
        document.title = "ArrestDelta - Cover";
        document.body.style.backgroundColor = '#000000';

        return () => {
            document.body.style.backgroundColor = '';
        };
    }, []);

    return (
        <div className="a4-cover-container">
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background-color: #000000 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .a4-cover-container {
                        width: 210mm;
                        height: 297mm;
                        transform: none !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    #root > *:not(.a4-cover-container) {
                        display: none;
                    }
                }

                @media screen {
                    body {
                        background-color: #0a0a0a;
                        display: flex;
                        justify-content: center;
                        padding: 2rem;
                    }
                    .a4-cover-container {
                        width: 210mm;
                        height: 297mm;
                        box-shadow: 0 0 60px rgba(228, 0, 40, 0.1), 0 0 100px rgba(0,0,0,0.8);
                        transform-origin: top center;
                    }
                    @media (max-width: 220mm) {
                        .a4-cover-container {
                            transform: scale(0.8);
                            margin-bottom: -20%;
                        }
                    }
                    @media (max-width: 600px) {
                        .a4-cover-container {
                            transform: scale(0.45);
                            margin-bottom: -50%;
                        }
                    }
                }

                .a4-cover-container {
                    position: relative;
                    background: #000000;
                    color: white;
                    font-family: 'Inter', sans-serif;
                    box-sizing: border-box;
                    overflow: hidden;
                }

                /* Layered background effects */
                .bg-grid {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image:
                        linear-gradient(rgba(228, 0, 40, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(228, 0, 40, 0.03) 1px, transparent 1px);
                    background-size: 8mm 8mm;
                    pointer-events: none;
                }

                .bg-radial {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 180mm;
                    height: 180mm;
                    background: radial-gradient(ellipse at center, rgba(228, 0, 40, 0.08) 0%, transparent 70%);
                    pointer-events: none;
                }

                .bg-vignette {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%);
                    pointer-events: none;
                }

                /* Diagonal lines pattern */
                .bg-diagonals {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: repeating-linear-gradient(
                        -45deg,
                        transparent,
                        transparent 40mm,
                        rgba(228, 0, 40, 0.02) 40mm,
                        rgba(228, 0, 40, 0.02) 40.5mm
                    );
                    pointer-events: none;
                }

                /* Scan line effect */
                .scan-line {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(228, 0, 40, 0.6), transparent);
                    animation: scanMove 8s linear infinite;
                    pointer-events: none;
                    opacity: 0.5;
                }

                @keyframes scanMove {
                    0% { top: 0; opacity: 0; }
                    10% { opacity: 0.5; }
                    90% { opacity: 0.5; }
                    100% { top: 100%; opacity: 0; }
                }

                /* Corner brackets */
                .corner {
                    position: absolute;
                    width: 25mm;
                    height: 25mm;
                    pointer-events: none;
                }
                .corner::before,
                .corner::after {
                    content: '';
                    position: absolute;
                    background: #E40028;
                }
                .corner-tl {
                    top: 10mm;
                    left: 10mm;
                }
                .corner-tl::before {
                    top: 0; left: 0;
                    width: 15mm; height: 0.5mm;
                }
                .corner-tl::after {
                    top: 0; left: 0;
                    width: 0.5mm; height: 15mm;
                }
                .corner-tr {
                    top: 10mm;
                    right: 10mm;
                }
                .corner-tr::before {
                    top: 0; right: 0;
                    width: 15mm; height: 0.5mm;
                }
                .corner-tr::after {
                    top: 0; right: 0;
                    width: 0.5mm; height: 15mm;
                }
                .corner-bl {
                    bottom: 10mm;
                    left: 10mm;
                }
                .corner-bl::before {
                    bottom: 0; left: 0;
                    width: 15mm; height: 0.5mm;
                }
                .corner-bl::after {
                    bottom: 0; left: 0;
                    width: 0.5mm; height: 15mm;
                }
                .corner-br {
                    bottom: 10mm;
                    right: 10mm;
                }
                .corner-br::before {
                    bottom: 0; right: 0;
                    width: 15mm; height: 0.5mm;
                }
                .corner-br::after {
                    bottom: 0; right: 0;
                    width: 0.5mm; height: 15mm;
                }

                /* Main content wrapper */
                .cover-content {
                    position: relative;
                    z-index: 10;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                    padding: 20mm;
                    text-align: center;
                }

                /* Logo */
                .cover-logo {
                    width: 70mm;
                    margin-bottom: 12mm;
                    filter: drop-shadow(0 0 20px rgba(228, 0, 40, 0.3));
                }

                /* Horizontal rule with glow */
                .cover-rule {
                    width: 80mm;
                    height: 1px;
                    background: linear-gradient(90deg, transparent 0%, #E40028 20%, #E40028 80%, transparent 100%);
                    margin-bottom: 15mm;
                    position: relative;
                }
                .cover-rule::after {
                    content: '';
                    position: absolute;
                    top: -2px;
                    left: 20%;
                    right: 20%;
                    height: 5px;
                    background: linear-gradient(90deg, transparent, rgba(228, 0, 40, 0.4), transparent);
                    filter: blur(3px);
                }

                /* Mission statement container */
                .mission-block {
                    max-width: 160mm;
                    position: relative;
                }

                /* Opening statement - dramatic */
                .mission-opener {
                    font-family: 'Inter Tight', sans-serif;
                    font-size: 11pt;
                    font-weight: 700;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    color: #E40028;
                    margin-bottom: 8mm;
                }

                /* Main statement */
                .mission-main {
                    font-family: 'Inter Tight', sans-serif;
                    font-size: 15pt;
                    font-weight: 600;
                    line-height: 1.6;
                    color: #ffffff;
                    margin-bottom: 6mm;
                }

                .mission-main .highlight {
                    color: #E40028;
                    font-weight: 800;
                    position: relative;
                }

                /* Secondary statement */
                .mission-secondary {
                    font-family: 'Inter', sans-serif;
                    font-size: 11pt;
                    font-weight: 400;
                    line-height: 1.7;
                    color: rgba(255, 255, 255, 0.7);
                    max-width: 140mm;
                    margin: 0 auto;
                }

                .mission-secondary .emphasis {
                    color: #ffffff;
                    font-weight: 500;
                }

                /* Bottom section */
                .cover-bottom {
                    position: absolute;
                    bottom: 15mm;
                    left: 0;
                    right: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6mm;
                }

                /* Delta mark */
                .delta-mark {
                    width: 6mm;
                    height: 6mm;
                    position: relative;
                }
                .delta-mark::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 3mm solid transparent;
                    border-right: 3mm solid transparent;
                    border-bottom: 5.2mm solid #E40028;
                    opacity: 0.8;
                }

                /* Footer info */
                .cover-footer {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4mm;
                    font-family: 'Roboto Mono', monospace;
                    font-size: 6pt;
                    color: #444;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                }

                .footer-divider {
                    width: 3px;
                    height: 3px;
                    background: #E40028;
                    opacity: 0.6;
                }

                /* Side labels */
                .side-label {
                    position: absolute;
                    font-family: 'Roboto Mono', monospace;
                    font-size: 5pt;
                    color: #333;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                }
                .side-label-left {
                    left: 5mm;
                    top: 50%;
                    transform: rotate(-90deg) translateX(-50%);
                    transform-origin: left center;
                }
                .side-label-right {
                    right: 5mm;
                    top: 50%;
                    transform: rotate(90deg) translateX(50%);
                    transform-origin: right center;
                }
            `}</style>

            {/* Background layers */}
            <div className="bg-grid" />
            <div className="bg-diagonals" />
            <div className="bg-radial" />
            <div className="bg-vignette" />
            <div className="scan-line" />

            {/* Corner brackets */}
            <div className="corner corner-tl" />
            <div className="corner corner-tr" />
            <div className="corner corner-bl" />
            <div className="corner corner-br" />

            {/* Side labels */}
            <div className="side-label side-label-left">ArrestDelta Intelligence</div>
            <div className="side-label side-label-right">Investor Materials 2026</div>

            {/* Main content */}
            <div className="cover-content">

                {/* Logo */}
                <img src={logoMain} alt="ArrestDelta" className="cover-logo" />

                {/* Divider */}
                <div className="cover-rule" />

                {/* Mission statement */}
                <div className="mission-block">
                    <div className="mission-opener">The Compounding Blind Spot</div>

                    <p className="mission-main">
                        When risk isn't monitored between background checks,<br />
                        it doesn't disappear —<br />
                        <span className="highlight">it compounds silently.</span>
                    </p>

                    <p className="mission-secondary">
                        Organisations continue to <span className="emphasis">place trust</span>,
                        <span className="emphasis"> grant access</span>, and
                        <span className="emphasis"> expose people and brands to harm</span> based
                        on information that may already be outdated.
                    </p>
                </div>

            </div>

            {/* Bottom section */}
            <div className="cover-bottom">
                <div className="delta-mark" />
                <div className="cover-footer">
                    <span>Confidential</span>
                    <div className="footer-divider" />
                    <span>{new Date().getFullYear()}</span>
                    <div className="footer-divider" />
                    <span>Decision-Grade Intelligence</span>
                </div>
            </div>

        </div>
    );
};

export default CoverPageA4;
