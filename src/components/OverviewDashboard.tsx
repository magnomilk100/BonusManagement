



import React, { useMemo } from 'react';
import { BonusFormData, User, Tab } from '../types';
import { formatNumber, formatDateTime, parseDate } from '../utils';

interface OverviewDashboardProps {
    bonusData: BonusFormData[]; 
    currentUser: User | null; 
    onNavigateToTab: (tab: Tab, action?: string) => void;
    fxRates: { [key: string]: number };
}

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ bonusData, currentUser, onNavigateToTab, fxRates }) => {
    
    const userBonusData = useMemo(() => {
        if (!currentUser) return [];
        const { roles, accessibleEntities } = currentUser;
        if (roles.includes('Admin') || roles.includes('Reviewer - Group HR') || roles.includes('Finance Viewer')) {
            return bonusData;
        }
        if (roles.includes('Inputter - Local HR') && accessibleEntities.length > 0) {
            return bonusData.filter(b => accessibleEntities.includes(b.entity));
        }
        return [];
    }, [bonusData, currentUser]);

    const kpiData = useMemo(() => {
        const totalBonuses = userBonusData.length;
        const pendingReview = userBonusData.filter(b => b.status === 'Pending Review').length;
        const requiresRevision = userBonusData.filter(b => b.status === 'Requires Revision').length;
        
        const totalAmountCHFEquivalent = userBonusData.reduce((sum, b) => {
            const amount = parseFloat(b.amount);
            if (isNaN(amount)) return sum;
            const rateToChf = fxRates[b.currency] || 1; // Default to 1 if currency not in rates (e.g. CHF itself)
            return sum + (amount * rateToChf);
        }, 0);

        return { totalBonuses, pendingReview, requiresRevision, totalAmountCHFEquivalent };
    }, [userBonusData, fxRates]);

    const recentActivity = useMemo(() => {
        return [...userBonusData]
            .sort((a,b) => {
                const dateA = a.lastModifiedDate ? new Date(a.lastModifiedDate).getTime() : 0;
                const dateB = b.lastModifiedDate ? new Date(b.lastModifiedDate).getTime() : 0;
                return dateB - dateA;
            })
            .slice(0, 5);
    }, [userBonusData]);

    const showNominativeData = currentUser && !currentUser.roles.includes('Finance Viewer');

    return (
        <div id="overview-dashboard" className="module-content"> {/* Use .module-content for base styling */}
            <h2><i className="fas fa-tachometer-alt" aria-hidden="true"></i> Dashboard Overview</h2>
            
            <section className="kpi-container" aria-labelledby="overview-kpi-heading">
                <h3 id="overview-kpi-heading" className="visually-hidden">Key Performance Indicators</h3>
                <div className="kpi-card">
                    <h4>Total Bonuses Recorded {currentUser && (currentUser.roles.includes('Inputter - Local HR') || currentUser.roles.includes('Finance Viewer')) ? `(${currentUser.accessibleEntities.join(', ')})` : '(All Viewable)'}</h4>
                    <p>{formatNumber(kpiData.totalBonuses)}</p>
                </div>
                <div className="kpi-card">
                    <h4>Bonuses Pending Review</h4>
                    <p>{formatNumber(kpiData.pendingReview)}</p>
                    { currentUser && (currentUser.roles.includes('Reviewer - Group HR') || currentUser.roles.includes('Admin')) && kpiData.pendingReview > 0 &&
                        <button onClick={() => onNavigateToTab('hr', 'filterPendingReviews')} className="primary action-button">
                            <i className="fas fa-search"></i> View Pending
                        </button>
                    }
                </div>
                <div className="kpi-card">
                    <h4>Bonuses Requiring Revision</h4>
                    <p>{formatNumber(kpiData.requiresRevision)}</p>
                     { currentUser && (currentUser.roles.includes('Inputter - Local HR') || currentUser.roles.includes('Admin')) && kpiData.requiresRevision > 0 &&
                        <button onClick={() => onNavigateToTab('hr', 'filterRequiresRevision')} className="primary action-button">
                           <i className="fas fa-edit"></i> View Revisions
                        </button>
                    }
                </div>
                <div className="kpi-card">
                    <h4>Total Est. Value (CHF)</h4>
                    <p>{formatNumber(kpiData.totalAmountCHFEquivalent, 2)} CHF</p>
                </div>
            </section>

            <section className="dashboard-section" aria-labelledby="recent-activity-heading"> {/* Keep dashboard-section for sub-section styling */}
                <h3 id="recent-activity-heading"><i className="fas fa-history" aria-hidden="true"></i> Recent Activity (Last 5 Modified)</h3>
                {recentActivity.length > 0 ? (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Bonus ID</th>
                                    {showNominativeData && <th>Employee ID</th>}
                                    { currentUser && (currentUser.roles.includes('Admin') || currentUser.roles.includes('Reviewer - Group HR') || currentUser.roles.includes('Finance Viewer')) && <th>Entity</th>}
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Last Modified</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentActivity.map(b => {
                                    const statusClassName = b.status.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '');
                                    return (
                                        <tr key={b.id}>
                                            <td>{b.id}</td>
                                            {showNominativeData && <td>{b.employeeId}</td>}
                                            { currentUser && (currentUser.roles.includes('Admin') || currentUser.roles.includes('Reviewer - Group HR') || currentUser.roles.includes('Finance Viewer')) && <td>{b.entity}</td>}
                                            <td>{formatNumber(b.amount, 2)} {b.currency}</td>
                                            <td><span className={`status-cell status-${statusClassName}`}>{b.status}</span></td>
                                            <td>{formatDateTime(b.lastModifiedDate)} by {b.inputter}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="no-data-message">No recent activity to display for your view.</p>
                )}
            </section>
            
            {currentUser && (currentUser.roles.includes('Inputter - Local HR') || currentUser.roles.includes('Admin')) && (
                 <section className="dashboard-section" aria-labelledby="quick-actions-heading">
                    <h3 id="quick-actions-heading"><i className="fas fa-bolt" aria-hidden="true"></i> Quick Actions</h3>
                    <div className="button-group">
                        <button onClick={() => onNavigateToTab('hr', 'addNewBonus')} className="primary action-button">
                            <i className="fas fa-plus-circle" aria-hidden="true"></i> Add New Bonus
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
};

export default OverviewDashboard;