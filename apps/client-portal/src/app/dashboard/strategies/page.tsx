'use client';

import { BookOpen } from 'lucide-react';

export default function StrategiesPage() {
    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Strategies</h1>
                <p className="page-subtitle">Client strategy playbooks and presentations</p>
            </div>

            <div className="card">
                <div className="empty-state">
                    <div className="empty-state-icon">📘</div>
                    <div className="empty-state-title">No Strategies Yet</div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        Strategy documents will appear here as they are created and linked to clients.
                    </p>
                </div>
            </div>
        </>
    );
}
