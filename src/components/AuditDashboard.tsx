
import React, { useState, useMemo } from 'react';
import { GlobalAuditLogEntry, User, AuditDashboardState, GlobalAuditLogActionType, GlobalAuditLogTargetType } from '../types';
import { formatDateTime } from '../utils';

interface AuditDashboardProps {
    auditLog: GlobalAuditLogEntry[];
    users: User[];
    state: AuditDashboardState;
    setState: React.Dispatch<React.SetStateAction<AuditDashboardState>>;
}

const ACTION_TYPES: GlobalAuditLogActionType[] = ['Create', 'Update', 'Delete', 'Login', 'Logout', 'ImpersonateStart', 'ImpersonateEnd', 'Approve', 'RevisionRequest', 'Submit', 'BulkApprove', 'BulkRevision', 'ConfigChange', 'System', 'Upload'];
const TARGET_TYPES: GlobalAuditLogTargetType[] = ['Bonus', 'User', 'Period', 'Entity', 'Currency', 'FXRate', 'Auth', 'System', 'FinancialInfo'];

const AuditDashboard: React.FC<AuditDashboardProps> = ({ auditLog, users, state, setState }) => {
    const { filters } = state;

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setState(prev => ({ ...prev, filters: { ...prev.filters, [name]: value } }));
    };

    const resetFilters = () => {
        setState(prev => ({ ...prev, filters: { user: 'all', actionType: 'all', targetType: 'all', targetId: '', startDate: '', endDate: '' } }));
    };

    const filteredLog = useMemo(() => {
        return auditLog.filter(log => {
            if (filters.user !== 'all' && log.userId !== filters.user) return false;
            if (filters.actionType !== 'all' && log.actionType !== filters.actionType) return false;
            if (filters.targetType !== 'all' && log.targetType !== filters.targetType) return false;
            if (filters.targetId && !log.targetId.toLowerCase().includes(filters.targetId.toLowerCase())) return false;
            if (filters.startDate && new Date(log.timestamp) < new Date(filters.startDate)) return false;
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999); // Include the whole day
                if (new Date(log.timestamp) > endDate) return false;
            }
            return true;
        });
    }, [auditLog, filters]);
    
    const handleExportToXLS = () => {
        if (filteredLog.length === 0) {
            alert("No data to export based on current filters.");
            return;
        }

        const headers = ["Timestamp", "User", "Action Type", "Target Type", "Target ID", "Details"];
        
        const rows = filteredLog.map(log => [
            formatDateTime(log.timestamp),
            log.username,
            log.actionType,
            log.targetType,
            log.targetId,
            `"${log.details.replace(/"/g, '""')}"` // Escape double quotes for CSV/XLS
        ]);

        const content = [
            headers.join('\t'),
            ...rows.map(row => row.join('\t'))
        ].join('\n');

        const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8,' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `BonusManagement_Audit_Log_Export_${new Date().toISOString().split('T')[0]}.xls`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div id="audit-dashboard" className="module-content">
            <h2><i className="fas fa-clipboard-check" aria-hidden="true"></i> Global Audit Log</h2>

            <section className="dashboard-section" aria-labelledby="audit-log-filters-heading">
                <h3 id="audit-log-filters-heading" className="admin-section-title"><i className="fas fa-filter" aria-hidden="true"></i> Filter Audit Log</h3>
                <div className="filters-group">
                    <div>
                        <label htmlFor="auditStartDate">Start Date:</label>
                        <input type="date" id="auditStartDate" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                    </div>
                    <div>
                        <label htmlFor="auditEndDate">End Date:</label>
                        <input type="date" id="auditEndDate" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                    </div>
                    <div>
                        <label htmlFor="auditUserFilter">User:</label>
                        <select id="auditUserFilter" name="user" value={filters.user} onChange={handleFilterChange}>
                            <option value="all">All Users</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="auditActionTypeFilter">Action Type:</label>
                        <select id="auditActionTypeFilter" name="actionType" value={filters.actionType} onChange={handleFilterChange}>
                            <option value="all">All Actions</option>
                            {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="auditTargetTypeFilter">Target Type:</label>
                        <select id="auditTargetTypeFilter" name="targetType" value={filters.targetType} onChange={handleFilterChange}>
                            <option value="all">All Targets</option>
                            {TARGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="auditTargetIdFilter">Target ID:</label>
                        <input type="text" id="auditTargetIdFilter" name="targetId" value={filters.targetId} onChange={handleFilterChange} placeholder="e.g., Bonus ID, User ID..." />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
                        <button onClick={handleExportToXLS} className="secondary action-button">
                            <i className="fas fa-file-excel" aria-hidden="true"></i> Export to XLS
                        </button>
                        <button type="button" onClick={resetFilters} className="secondary action-button">
                            <i className="fas fa-undo" aria-hidden="true"></i> Reset Filters
                        </button>
                    </div>
                </div>
            </section>

            <section className="dashboard-section" aria-labelledby="audit-log-table-heading">
                <h3 id="audit-log-table-heading" className="visually-hidden">Audit Log Entries</h3>
                <div className="table-responsive">
                    <table aria-live="polite">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Target Type</th>
                                <th>Target ID</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLog.length > 0 ? filteredLog.map(log => (
                                <tr key={log.id}>
                                    <td>{formatDateTime(log.timestamp)}</td>
                                    <td>{log.username}</td>
                                    <td>{log.actionType}</td>
                                    <td>{log.targetType}</td>
                                    <td>{log.targetId}</td>
                                    <td style={{ whiteSpace: 'normal', minWidth: '300px' }}>{log.details}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="no-data-message">No audit log entries match your criteria.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default AuditDashboard;