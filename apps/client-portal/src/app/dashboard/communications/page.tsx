'use client';

import { MessageSquare } from 'lucide-react';

export default function CommunicationsPage() {
    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Communications</h1>
                <p className="page-subtitle">
                    Messages, emails, and updates from your Admireworks team.
                </p>
            </div>

            <div className="card">
                <div className="empty-state">
                    <div className="empty-state-icon">💬</div>
                    <div className="empty-state-title">No Messages Yet</div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        Campaign updates and communications will appear here.
                    </p>
                </div>
            </div>
        </>
    );
}
