'use client';

import { BarChart3, Plus, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ReportsPage() {
    const { isAdmin } = useAuth();

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Reports</h1>
                        <p className="page-subtitle">
                            {isAdmin ? 'Create and manage client reports' : 'Your campaign and performance reports'}
                        </p>
                    </div>
                    {isAdmin && (
                        <button className="btn btn-primary">
                            <Plus size={16} /> New Report
                        </button>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <div className="empty-state-title">No Reports Yet</div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        {isAdmin
                            ? 'Generate reports for your clients from their campaign data.'
                            : 'Your performance reports will appear here when published.'}
                    </p>
                </div>
            </div>
        </>
    );
}
