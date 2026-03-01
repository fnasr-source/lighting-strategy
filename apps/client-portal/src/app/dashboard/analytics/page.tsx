'use client';

import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Analytics</h1>
                <p className="page-subtitle">Cross-client campaign analytics and performance metrics</p>
            </div>

            <div className="card">
                <div className="empty-state">
                    <div className="empty-state-icon">📈</div>
                    <div className="empty-state-title">Analytics Coming Soon</div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        Connect client ad platforms to see aggregated performance metrics here.
                    </p>
                </div>
            </div>
        </>
    );
}
