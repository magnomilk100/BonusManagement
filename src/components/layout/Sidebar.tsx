
import React, { useMemo } from 'react';
import { Tab, User } from '../../types';
import { formatPeriodForDisplay } from '../../utils';

interface SidebarProps {
    isSidebarCollapsed: boolean;
    activeTab: Tab | null;
    currentUser: User;
    originalUser: User | null;
    selectedPeriod: string;
    financialPeriods: string[];
    onToggleSidebar: () => void;
    onNavigateToTab: (tab: Tab, action?: string) => void;
    onLogout: () => void;
    onSelectedPeriodChange: (year: string, month: string) => void;
    canUserAccessTab: (tab: Tab) => boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
    isSidebarCollapsed,
    activeTab,
    currentUser,
    originalUser,
    selectedPeriod,
    financialPeriods,
    onToggleSidebar,
    onNavigateToTab,
    onLogout,
    onSelectedPeriodChange,
    canUserAccessTab
}) => {
    
    const { yearOptions, monthOptionsForSelectedYear } = useMemo(() => {
        const years = [...new Set(financialPeriods.map(p => p.substring(0, 4)))].sort().reverse();
        const [selectedYear] = selectedPeriod.split('-');
        
        const months = financialPeriods
            .filter(p => p.startsWith(selectedYear))
            .map(p => ({
                value: p.substring(5, 7),
                label: formatPeriodForDisplay(p).split(' ')[0]
            }))
            .sort((a, b) => b.value.localeCompare(a.value));

        return { yearOptions: years, monthOptionsForSelectedYear: months };
    }, [financialPeriods, selectedPeriod]);

    const [selectedYearForSelector, selectedMonthForSelector] = selectedPeriod.split('-');

    return (
        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <i className="fas fa-landmark sidebar-logo-icon" aria-hidden="true"></i>
                {!isSidebarCollapsed && (
                    <div className="sidebar-app-name-wrapper">
                        <h1 className="sidebar-title">Bonus Management</h1>
                    </div>
                )}
            </div>

            {!isSidebarCollapsed && (
                <div className="sidebar-period-selector">
                    <label htmlFor="year-select-sidebar">Year:</label>
                    <select
                        id="year-select-sidebar"
                        value={selectedYearForSelector}
                        onChange={(e) => {
                            const newYear = e.target.value;
                            // When year changes, find the first available month in that year and set it.
                            const firstMonthForNewYear = financialPeriods.find(p => p.startsWith(newYear))?.substring(5,7) || '01';
                            onSelectedPeriodChange(newYear, firstMonthForNewYear);
                        }}
                        aria-label="Select reporting year"
                    >
                        {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>

                    <label htmlFor="month-select-sidebar">Month:</label>
                    <select
                        id="month-select-sidebar"
                        value={selectedMonthForSelector}
                        onChange={(e) => onSelectedPeriodChange(selectedYearForSelector, e.target.value)}
                        aria-label="Select reporting month"
                    >
                        {monthOptionsForSelectedYear.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
                    </select>
                    <div className="current-period-display">
                        Current Period: <strong>{formatPeriodForDisplay(selectedPeriod)}</strong>
                    </div>
                </div>
            )}

            <nav className="sidebar-nav">
                <ul>
                    {canUserAccessTab('overview') && <li><button onClick={() => onNavigateToTab('overview')} className={activeTab === 'overview' ? 'active' : ''}><i className="fas fa-tachometer-alt nav-icon" aria-hidden="true"></i> <span className="nav-text">Overview</span></button></li>}
                    {canUserAccessTab('hr') && <li><button onClick={() => onNavigateToTab('hr')} className={activeTab === 'hr' ? 'active' : ''}><i className="fas fa-users-cog nav-icon" aria-hidden="true"></i> <span className="nav-text">HR</span></button></li>}
                    {canUserAccessTab('finance') && <li><button onClick={() => onNavigateToTab('finance')} className={activeTab === 'finance' ? 'active' : ''}><i className="fas fa-chart-line nav-icon" aria-hidden="true"></i> <span className="nav-text">Finance</span></button></li>}
                    {canUserAccessTab('fxrates') && <li><button onClick={() => onNavigateToTab('fxrates')} className={activeTab === 'fxrates' ? 'active' : ''}><i className="fas fa-coins nav-icon" aria-hidden="true"></i> <span className="nav-text">FX Rates</span></button></li>}
                    {canUserAccessTab('admin') && <li><button onClick={() => onNavigateToTab('admin')} className={activeTab === 'admin' ? 'active' : ''}><i className="fas fa-user-shield nav-icon" aria-hidden="true"></i> <span className="nav-text">Admin</span></button></li>}
                </ul>
            </nav>

            <button onClick={onToggleSidebar} className="sidebar-collapse-button" aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
                <i className={`fas ${isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} nav-icon`} aria-hidden="true"></i>
            </button>
            <div className="sidebar-footer">
                <div className="sidebar-user-info">
                    <strong>{currentUser.username}</strong>
                    <span>{currentUser.roles.join(', ')}</span>
                    {currentUser.accessibleEntities && currentUser.accessibleEntities.length > 0 && currentUser.accessibleEntities[0] !== 'Unassigned' && (
                        <span style={{ fontSize: '0.8em', opacity: 0.8 }}>{currentUser.accessibleEntities.join(', ')}</span>
                    )}
                    {originalUser && <span style={{ display: 'block', color: 'var(--status-warning-text)', fontSize: '0.9em' }}>(Impersonating)</span>}
                </div>
                {originalUser && (
                    <button onClick={onLogout} className="impersonation-return-button" title="Stop Impersonating">
                        <i className="fas fa-user-check nav-icon" aria-hidden="true"></i> <span className="nav-text">Stop Impersonating</span>
                    </button>
                )}
                <button onClick={onLogout} className="sidebar-logout-button" title={originalUser ? "Switch User (stops impersonation)" : "Logout"}>
                    <i className="fas fa-sign-out-alt nav-icon" aria-hidden="true"></i> <span className="nav-text">{originalUser ? 'Switch User' : 'Logout'}</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;