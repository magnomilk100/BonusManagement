











import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BonusFormData, User, HRLogFilters, SortableBonusKey, HRColumnConfig, HRDashboardState } from '../types';
import BonusForm from './BonusForm';
import { formatNumber, formatDate, formatDateTime, parseDate } from '../utils';
import BaseModal from './common/BaseModal';
import ColumnManager from './ColumnManager';
import ConfirmationModal from './common/ConfirmationModal';

const DEFAULT_COLUMNS: HRColumnConfig[] = [
    { key: 'id', label: 'Bonus ID' },
    { key: 'employeeId', label: 'Emp. ID' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'firstName', label: 'First Name' },
    { key: 'entity', label: 'Entity' },
    { key: 'status', label: 'Status', isAlwaysVisible: true },
    { key: 'amount', label: 'Amount' },
    { key: 'currency', label: 'Ccy' },
    { key: 'bonusTypeCategory', label: 'Bonus Category' },
    { key: 'bonusTypePayment', label: 'Payment Type' },
    { key: 'notificationDate', label: 'Notification' },
    { key: 'paymentDate', label: 'Payment Date' },
    { key: 'isPaid', label: 'Paid?' },
    { key: 'hasClawback', label: 'Clawback' },
    { key: 'employeeDepartureDate', label: 'Departure' },
    { key: 'leaverType', label: 'Leaver Type' },
    { key: 'isBluebird', label: 'Bluebird' },
    { key: 'isCro', label: 'CRO' },
    { key: 'inputter', label: 'Inputter' },
    { key: 'lastModifiedDate', label: 'Last Modified' },
];

const getInitialColumnConfig = (): { visibleKeys: SortableBonusKey[], orderedColumns: HRColumnConfig[] } => {
    const savedConfig = localStorage.getItem('hrDashboardColumnConfig_v2');
    if (savedConfig) {
        try {
            const parsed = JSON.parse(savedConfig);
            // Basic validation
            if (Array.isArray(parsed.orderedColumns) && Array.isArray(parsed.visibleKeys)) {
                return parsed;
            }
        } catch (e) {
            console.error("Failed to parse column config from localStorage", e);
        }
    }
    // Default config: All columns are visible by default.
    return {
        visibleKeys: DEFAULT_COLUMNS.map(c => c.key),
        orderedColumns: DEFAULT_COLUMNS,
    };
};


interface HRDashboardProps {
    bonusLogData: BonusFormData[];
    onSaveBonusEntry: (data: BonusFormData, isEditing: boolean, currentUser: User) => void;
    onDeleteBonusEntry: (bonusId: string) => void;
    onApproveBonusEntry: (bonusId: string, currentUser: User) => void;
    onRequestRevisionEntry: (bonusId: string, currentUser: User) => void;
    onSubmitForApproval: (bonusId: string, currentUser: User) => void;
    onBulkApprove: (selectedIds: string[], currentUser: User) => void;
    onBulkRequestRevision: (selectedIds: string[], currentUser: User) => void;
    onUploadBonuses: (fileContent: string, currentUser: User) => void;
    currentUser: User | null;
    initialAction?: string | null;
    onActionHandled?: () => void;
    lockedPeriods: string[];
    managedEntities: string[];
    managedBonusTypes: string[];
    managedCurrencies: string[];
    hrState: HRDashboardState;
    setHrState: React.Dispatch<React.SetStateAction<HRDashboardState>>;
}

const HRDashboard: React.FC<HRDashboardProps> = ({
    bonusLogData,
    onSaveBonusEntry,
    onDeleteBonusEntry,
    onApproveBonusEntry,
    onRequestRevisionEntry,
    onSubmitForApproval,
    onBulkApprove,
    onBulkRequestRevision,
    onUploadBonuses,
    currentUser,
    initialAction,
    onActionHandled,
    lockedPeriods,
    managedEntities,
    managedBonusTypes,
    managedCurrencies,
    hrState,
    setHrState,
}) => {
    const { filters: hrLogFilters, sortConfig, showBonusForm, editingBonusId, selectedBonusIds: selectedBonusIdsArray } = hrState;
    const selectedBonusIds = useMemo(() => new Set(selectedBonusIdsArray), [selectedBonusIdsArray]);
    const editingBonus = useMemo(() => {
        if (!editingBonusId) return null;
        return bonusLogData.find(b => b.id === editingBonusId) || null;
    }, [editingBonusId, bonusLogData]);
    
    const bonusFormContainerRef = useRef<HTMLDivElement>(null);
    const uploadFileInputRef = useRef<HTMLInputElement>(null);
    const [showUploadInfoModal, setShowUploadInfoModal] = useState(false);
    
    // State for column customization
    const [columnConfig, setColumnConfig] = useState(getInitialColumnConfig);
    const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
    
    // State for submission confirmation
    const [bonusToSubmit, setBonusToSubmit] = useState<BonusFormData | null>(null);
    
    const visibleColumns = useMemo(() => {
        return columnConfig.orderedColumns.filter(c => columnConfig.visibleKeys.includes(c.key) || c.isAlwaysVisible);
    }, [columnConfig]);

    const handleColumnConfigChange = (newConfig: { visibleKeys: SortableBonusKey[], orderedColumns: HRColumnConfig[] }) => {
        setColumnConfig(newConfig);
        localStorage.setItem('hrDashboardColumnConfig_v2', JSON.stringify(newConfig));
    };

    const handleAddNewBonusClick = useCallback(() => {
        setHrState(prev => ({
            ...prev,
            editingBonusId: null,
            showBonusForm: true,
            selectedBonusIds: [],
        }));
    }, [setHrState]);

    useEffect(() => {
        if (initialAction === 'addNewBonus') {
            handleAddNewBonusClick();
            onActionHandled?.();
        } else if (initialAction === 'filterPendingReviews') {
            setHrState(prev => ({...prev, filters: {...prev.filters, status: 'Pending Review'}, showBonusForm: false, editingBonusId: null, selectedBonusIds: []}));
            onActionHandled?.();
        } else if (initialAction === 'filterRequiresRevision') {
            setHrState(prev => ({...prev, filters: {...prev.filters, status: 'Requires Revision'}, showBonusForm: false, editingBonusId: null, selectedBonusIds: []}));
            onActionHandled?.();
        }
    }, [initialAction, handleAddNewBonusClick, onActionHandled, setHrState]);
    
    useEffect(() => {
        if (showBonusForm && bonusFormContainerRef.current) {
            const firstInput = bonusFormContainerRef.current.querySelector<HTMLInputElement | HTMLSelectElement>(
                'input:not([type=hidden]):not([readonly]):not(:disabled), select:not(:disabled), textarea:not([readonly]):not(:disabled)'
            );
            firstInput?.focus();
        }
    }, [showBonusForm]);

     const isActionDisabledByPeriodLock = useCallback((bonus: BonusFormData): boolean => {
        if (!currentUser || currentUser.roles.includes('Admin') || currentUser.roles.includes('Reviewer - Group HR')) {
            return false; 
        }
        const notificationDatePeriod = bonus.notificationDate ? bonus.notificationDate.substring(0, 7) : null;
        const paymentDatePeriod = bonus.paymentDate ? bonus.paymentDate.substring(0, 7) : null;
        
        if (notificationDatePeriod && lockedPeriods.includes(notificationDatePeriod)) return true;
        if (paymentDatePeriod && lockedPeriods.includes(paymentDatePeriod)) return true;
        
        return false;
    }, [lockedPeriods, currentUser]);

    const displayableBonusData = useMemo(() => {
        let filteredData = [...bonusLogData];

        if (currentUser?.roles.includes('Inputter - Local HR')) {
            filteredData = filteredData.filter(b => currentUser.accessibleEntities.includes(b.entity));
        } else if (currentUser?.roles.includes('Finance Viewer') || currentUser?.roles.includes('Auditor')) {
            filteredData = filteredData.filter(b => currentUser.accessibleEntities.includes(b.entity));
        }
        
        if (hrLogFilters.searchTerm) {
            const searchTermLower = hrLogFilters.searchTerm.toLowerCase();
            filteredData = filteredData.filter(b =>
                b.employeeId.toLowerCase().includes(searchTermLower) ||
                b.firstName.toLowerCase().includes(searchTermLower) ||
                b.lastName.toLowerCase().includes(searchTermLower) ||
                b.id.toLowerCase().includes(searchTermLower) ||
                b.bonusTypeCategory.toLowerCase().includes(searchTermLower) ||
                b.inputter.toLowerCase().includes(searchTermLower)
            );
        }
        
        if (hrLogFilters.entity !== 'all') {
            filteredData = filteredData.filter(b => b.entity === hrLogFilters.entity);
        }
        if (hrLogFilters.currency !== 'all') {
            filteredData = filteredData.filter(b => b.currency === hrLogFilters.currency);
        }
        if (hrLogFilters.status !== 'all') {
            filteredData = filteredData.filter(b => b.status === hrLogFilters.status);
        }
        if (hrLogFilters.hasClawback !== 'all') {
            filteredData = filteredData.filter(b => b.hasClawback === hrLogFilters.hasClawback);
        }
        if (hrLogFilters.clawbackType !== 'all' && hrLogFilters.hasClawback === 'yes') {
            filteredData = filteredData.filter(b => b.clawbackType === hrLogFilters.clawbackType);
        }

        if (sortConfig !== null) {
            filteredData.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                let comparison = 0;
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    if (sortConfig.key === 'amount') {
                        comparison = parseFloat(aValue) - parseFloat(bValue);
                    } else if (sortConfig.key === 'notificationDate' || sortConfig.key === 'paymentDate' || sortConfig.key === 'employeeDepartureDate' || sortConfig.key === 'lastModifiedDate') {
                        const dateA = aValue ? parseDate(aValue)?.getTime() ?? 0 : 0;
                        const dateB = bValue ? parseDate(bValue)?.getTime() ?? 0 : 0;
                        comparison = dateA - dateB;
                    } else {
                        comparison = aValue.localeCompare(bValue);
                    }
                } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    comparison = aValue - bValue;
                } else { 
                    const valA = aValue ?? (sortConfig.key.includes('Date') ? 0 : '');
                    const valB = bValue ?? (sortConfig.key.includes('Date') ? 0 : '');
                    if (valA < valB) comparison = -1;
                    if (valA > valB) comparison = 1;
                }
                return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
            });
        }
        return filteredData;
    }, [bonusLogData, hrLogFilters, sortConfig, currentUser]);

    // Clear selection when filters or sort change, as the list of items changes
    useEffect(() => {
        setHrState(prev => ({ ...prev, selectedBonusIds: [] }));
    }, [hrLogFilters, sortConfig, setHrState]);

    const handleSort = (key: SortableBonusKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setHrState(prev => ({ ...prev, sortConfig: { key, direction } }));
    };

    const getSortIndicator = (key: SortableBonusKey) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <i className="fas fa-sort" aria-label="sortable"></i>;
        }
        return sortConfig.direction === 'ascending' ? 
               <i className="fas fa-sort-up" aria-label="sorted ascending"></i> : 
               <i className="fas fa-sort-down" aria-label="sorted descending"></i>;
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setHrState(prev => ({ ...prev, filters: { ...prev.filters, [name]: value } }));
    };
    
    const resetFilters = () => {
        setHrState(prev => ({
            ...prev,
            filters: { entity: 'all', currency: 'all', status: 'all', hasClawback: 'all', clawbackType: 'all', searchTerm: '' },
            sortConfig: { key: 'lastModifiedDate', direction: 'descending' },
            selectedBonusIds: [],
        }));
    };

    const handleEditBonus = (bonus: BonusFormData) => {
        setHrState(prev => ({
            ...prev,
            editingBonusId: bonus.id,
            showBonusForm: true,
            selectedBonusIds: [],
        }));
    };

    const handleSaveForm = (data: BonusFormData) => {
        if (!currentUser) return;
        onSaveBonusEntry(data, !!editingBonus, currentUser);
        setHrState(prev => ({ ...prev, showBonusForm: false, editingBonusId: null }));
    };

    const handleCancelForm = () => {
        setHrState(prev => ({ ...prev, showBonusForm: false, editingBonusId: null }));
    };
   
    const requestDeleteBonus = (bonus: BonusFormData) => {
        if (isActionDisabledByPeriodLock(bonus)) {
            alert("This action is disabled because a relevant period is locked.");
            return;
        }
        onDeleteBonusEntry(bonus.id); 
    };
    
    const handleApproveBonus = (bonus: BonusFormData) => {
        if (isActionDisabledByPeriodLock(bonus)) {
            alert("This action is disabled because a relevant period is locked.");
            return;
        }
        if (!currentUser) return;
        onApproveBonusEntry(bonus.id, currentUser);
    };

    const handleRequestRevision = (bonus: BonusFormData) => {
         if (isActionDisabledByPeriodLock(bonus)) {
            alert("This action is disabled because a relevant period is locked.");
            return;
        }
        if (!currentUser) return;
        onRequestRevisionEntry(bonus.id, currentUser);
    };

    const handleUploadButtonClick = () => {
        uploadFileInputRef.current?.click();
    };

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && currentUser) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    onUploadBonuses(text, currentUser);
                }
            };
            reader.readAsText(file);
        }
        if (event.target) {
            event.target.value = "";
        }
    };

    const handleDownloadTemplate = () => {
        const headers = [
            'employeeId', 'firstName', 'lastName', 'isBluebird', 'entity', 'currency', 'isCro', 
            'notificationDate', 'bonusTypeCategory', 'bonusTypePayment', 'amount', 
            'paymentDate', 'isPaid', 'hasClawback', 'clawbackPeriodMonths', 'clawbackType'
        ].join('\t');

        const xlsContent = "data:application/vnd.ms-excel;charset=utf-8," + encodeURIComponent(headers);
        const link = document.createElement("a");
        link.setAttribute("href", xlsContent);
        link.setAttribute("download", "bonus_upload_template.xls");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportToXLS = () => {
        if (displayableBonusData.length === 0) {
            alert("No data to export based on current filters.");
            return;
        }

        const headers = visibleColumns.map(c => c.label);

        const rows = displayableBonusData.map(bonus => {
            return visibleColumns.map(col => {
                const value = bonus[col.key as keyof BonusFormData];
                if (col.key === 'amount') return value;
                 if (col.key === 'hasClawback') {
                    if (bonus.hasClawback === 'yes') {
                        return `${bonus.clawbackPeriodMonths || 'N/A'} mo, ${bonus.clawbackType || 'pro-rata'}`;
                    }
                    return 'No';
                }
                if (col.key.toLowerCase().includes('date')) return formatDate(parseDate(value as string));
                if (value === null || typeof value === 'undefined') return '';
                if (typeof value === 'object') return '[Complex Data]';
                return value;
            });
        });

        const content = [
            headers.join('\t'),
            ...rows.map(row => row.join('\t'))
        ].join('\n');

        const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8,' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `BonusManagement_HR_Log_Export_${new Date().toISOString().split('T')[0]}.xls`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const canPerformWriteActions = currentUser && (currentUser.roles.includes('Admin') || currentUser.roles.includes('Inputter - Local HR') || currentUser.roles.includes('Reviewer - Group HR'));
    const canAddNewBonus = currentUser && (currentUser.roles.includes('Admin') || currentUser.roles.includes('Inputter - Local HR'));

    const allStatuses: BonusFormData['status'][] = ['Pending Input', 'Pending Review', 'Approved', 'Requires Revision', 'Approved (Clawback Processed)'];
    const uniqueEntities = useMemo(() => {
        const userRoles = currentUser?.roles || [];
        if (userRoles.includes('Inputter - Local HR') || userRoles.includes('Finance Viewer') || userRoles.includes('Auditor')) {
            return ['all', ...(currentUser?.accessibleEntities || [])];
        }
        return ['all', ...new Set(bonusLogData.map(b => b.entity).filter(Boolean))];
    }, [bonusLogData, currentUser]);

    const uniqueCurrencies = useMemo(() => ['all', ...new Set(bonusLogData.map(b => b.currency).filter(Boolean))], [bonusLogData]);

    // --- Bulk Action Logic ---
    const isCheckboxDisabledForRow = useCallback((bonus: BonusFormData): boolean => {
        if (isActionDisabledByPeriodLock(bonus)) {
            return true; // Always disabled if period locked for the current user's role
        }
        if (currentUser && (currentUser.roles.includes('Admin') || currentUser.roles.includes('Reviewer - Group HR'))) {
            return false; // Admins/Group HR can select any non-locked item
        }
        return bonus.status !== 'Pending Review';
    }, [currentUser, isActionDisabledByPeriodLock]);

    const getCurrentlySelectableBonusIdsForUser = useCallback((): Set<string> => {
        return new Set(
            displayableBonusData
                .filter(bonus => !isCheckboxDisabledForRow(bonus))
                .map(bonus => bonus.id)
        );
    }, [displayableBonusData, isCheckboxDisabledForRow]);


    const handleToggleSelect = (bonusId: string) => {
        const newSelected = new Set(selectedBonusIds);
        if (newSelected.has(bonusId)) {
            newSelected.delete(bonusId);
        } else {
            newSelected.add(bonusId);
        }
        setHrState(prev => ({ ...prev, selectedBonusIds: Array.from(newSelected) }));
    };

    const handleToggleSelectAll = () => {
        const currentlySelectableIds = getCurrentlySelectableBonusIdsForUser();
        if (currentlySelectableIds.size === 0) return;

        const allCurrentlySelectableAreSelected =
            selectedBonusIds.size === currentlySelectableIds.size &&
            Array.from(selectedBonusIds).every(id => currentlySelectableIds.has(id));

        if (allCurrentlySelectableAreSelected) {
            setHrState(prev => ({ ...prev, selectedBonusIds: [] }));
        } else {
            setHrState(prev => ({ ...prev, selectedBonusIds: Array.from(currentlySelectableIds) }));
        }
    };
    
    const selectedBonusesDetails = useMemo(() => {
        return bonusLogData.filter(bonus => selectedBonusIds.has(bonus.id));
    }, [bonusLogData, selectedBonusIds]);

    const canBulkApprove = useMemo(() => {
        if (!currentUser || !(currentUser.roles.includes('Admin') || currentUser.roles.includes('Reviewer - Group HR'))) return false;
        if (selectedBonusesDetails.length === 0) return false;
        return selectedBonusesDetails.every(bonus => bonus.status === 'Pending Review' && !isActionDisabledByPeriodLock(bonus));
    }, [selectedBonusesDetails, currentUser, isActionDisabledByPeriodLock]);

    const canBulkRequestRevision = useMemo(() => {
        if (!currentUser || !(currentUser.roles.includes('Admin') || currentUser.roles.includes('Reviewer - Group HR'))) return false;
        if (selectedBonusesDetails.length === 0) return false;
        return selectedBonusesDetails.every(bonus => bonus.status === 'Pending Review' && !isActionDisabledByPeriodLock(bonus));
    }, [selectedBonusesDetails, currentUser, isActionDisabledByPeriodLock]);

    const handleBulkApproveClick = () => {
        if (!canBulkApprove || !currentUser) return;
        onBulkApprove(Array.from(selectedBonusIds), currentUser);
        setHrState(prev => ({ ...prev, selectedBonusIds: [] }));
    };

    const handleBulkRequestRevisionClick = () => {
        if (!canBulkRequestRevision || !currentUser) return;
        onBulkRequestRevision(Array.from(selectedBonusIds), currentUser);
        setHrState(prev => ({ ...prev, selectedBonusIds: [] }));
    };
    
    const isSelectAllChecked = useMemo(() => {
        const currentlySelectableIds = getCurrentlySelectableBonusIdsForUser();
        if (currentlySelectableIds.size === 0) return false;
        return selectedBonusIds.size === currentlySelectableIds.size &&
               Array.from(selectedBonusIds).every(id => currentlySelectableIds.has(id));
    }, [selectedBonusIds, getCurrentlySelectableBonusIdsForUser]);
    
    const isSelectAllIndeterminate = useMemo(() => {
        const currentlySelectableIds = getCurrentlySelectableBonusIdsForUser();
        return selectedBonusIds.size > 0 && selectedBonusIds.size < currentlySelectableIds.size;
    }, [selectedBonusIds, getCurrentlySelectableBonusIdsForUser]);

    const isSelectAllCheckboxDisabled = useMemo(() => {
        return getCurrentlySelectableBonusIdsForUser().size === 0;
    }, [getCurrentlySelectableBonusIdsForUser]);

    const renderCellContent = (bonus: BonusFormData, col: HRColumnConfig) => {
        const value = bonus[col.key as keyof BonusFormData];
        
        switch(col.key) {
            case 'amount': return formatNumber(value as string, 2);
            case 'notificationDate':
            case 'paymentDate':
            case 'employeeDepartureDate':
                return formatDate(parseDate(value as string));
            case 'lastModifiedDate': return formatDateTime(value as string);
            case 'hasClawback':
                if (bonus.hasClawback === 'yes') {
                    return `${bonus.clawbackPeriodMonths || 'N/A'} mo, ${bonus.clawbackType || 'pro-rata'}`;
                }
                return 'No';
            case 'status':
                const statusString = String(value);
                const statusClassName = statusString.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '');
                return <span className={`status-cell status-${statusClassName}`}>{statusString}</span>;
            default:
                if (value === null || typeof value === 'undefined') {
                    return 'N/A';
                }
                if (typeof value === 'object') {
                    // This will handle both objects and arrays.
                    return '[Complex Data]';
                }
                return String(value);
        }
    };

    return (
        <div id="hr-dashboard" className="module-content"> 
            <h2><i className="fas fa-users-cog" aria-hidden="true"></i> HR Bonus Management</h2>

            <div className="button-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {canAddNewBonus && (
                    <button onClick={handleAddNewBonusClick} className="primary action-button" aria-expanded={showBonusForm}>
                        <i className="fas fa-plus-circle" aria-hidden="true"></i> Add New Bonus Entry
                    </button>
                )}
                {canAddNewBonus && (
                    <>
                        <input
                            type="file"
                            ref={uploadFileInputRef}
                            onChange={handleFileSelected}
                            accept=".txt,.csv,.xls"
                            style={{ display: 'none' }}
                            aria-label="Upload bonus file"
                        />
                        <button onClick={handleUploadButtonClick} className="secondary action-button">
                            <i className="fas fa-upload" aria-hidden="true"></i> Upload File
                        </button>
                        <button onClick={() => setShowUploadInfoModal(true)} className="action-button neutral-action" title="Upload Instructions">
                            <i className="fas fa-info-circle" aria-hidden="true"></i>
                        </button>
                        <button onClick={handleDownloadTemplate} className="action-button neutral-action" title="Download Upload Template">
                            <i className="fas fa-download" aria-hidden="true"></i>
                        </button>
                    </>
                )}
                 <button onClick={() => setIsColumnManagerOpen(true)} className="action-button neutral-action" title="Manage Columns">
                    <i className="fas fa-columns" aria-hidden="true"></i> Columns
                </button>
            </div>

            {showBonusForm && (
                <div ref={bonusFormContainerRef} className="dashboard-section" aria-live="polite" style={{marginTop: '25px'}}> 
                    <BonusForm
                        onSave={handleSaveForm}
                        onCancel={handleCancelForm}
                        initialData={editingBonus}
                        isEditing={!!editingBonus}
                        currentUser={currentUser}
                        lockedPeriods={lockedPeriods}
                        managedEntities={managedEntities}
                        managedCurrencies={managedCurrencies}
                        managedBonusTypes={managedBonusTypes}
                    />
                </div>
            )}
             {isColumnManagerOpen && (
                <ColumnManager
                    isOpen={isColumnManagerOpen}
                    onClose={() => setIsColumnManagerOpen(false)}
                    columnConfig={columnConfig}
                    onConfigChange={handleColumnConfigChange}
                    defaultColumns={DEFAULT_COLUMNS}
                />
            )}

            <section className="dashboard-section" aria-labelledby="bonus-log-heading"> 
                <h3 id="bonus-log-heading" className="admin-section-title"><i className="fas fa-clipboard-list" aria-hidden="true"></i> Bonus Log</h3>
                
                <div className="filters-group">
                    <div>
                        <label htmlFor="hrLogSearchTerm">Search Log:</label>
                        <input type="text" id="hrLogSearchTerm" name="searchTerm" value={hrLogFilters.searchTerm} onChange={handleFilterChange} placeholder="Name, Emp ID, Bonus ID..." />
                    </div>
                    <div>
                        <label htmlFor="hrLogEntityFilter">Entity:</label>
                        <select id="hrLogEntityFilter" name="entity" value={hrLogFilters.entity} onChange={handleFilterChange}>
                            {uniqueEntities.map(e => <option key={e} value={e}>{e === 'all' ? 'All Entities' : e}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="hrLogCurrencyFilter">Currency:</label>
                        <select id="hrLogCurrencyFilter" name="currency" value={hrLogFilters.currency} onChange={handleFilterChange}>
                             {uniqueCurrencies.map(c => <option key={c} value={c}>{c === 'all' ? 'All Currencies' : c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="hrLogStatusFilter">Status:</label>
                        <select id="hrLogStatusFilter" name="status" value={hrLogFilters.status} onChange={handleFilterChange}>
                            <option value="all">All Statuses</option>
                            {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="hrLogHasClawbackFilter">Has Clawback:</label>
                        <select id="hrLogHasClawbackFilter" name="hasClawback" value={hrLogFilters.hasClawback} onChange={handleFilterChange}>
                            <option value="all">Any</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </div>
                    {hrLogFilters.hasClawback === 'yes' && (
                         <div>
                            <label htmlFor="hrLogClawbackTypeFilter">Clawback Type:</label>
                            <select id="hrLogClawbackTypeFilter" name="clawbackType" value={hrLogFilters.clawbackType} onChange={handleFilterChange}>
                                <option value="all">Any Type</option>
                                <option value="pro-rata">Pro-rata</option>
                                <option value="full-refund">Full refund</option>
                            </select>
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
                        <button onClick={handleExportToXLS} className="secondary action-button">
                            <i className="fas fa-file-excel" aria-hidden="true"></i> Export to XLS
                        </button>
                        <button type="button" onClick={resetFilters} className="secondary action-button">
                            <i className="fas fa-undo" aria-hidden="true"></i> Reset Filters
                        </button>
                    </div>
                </div>

                {selectedBonusIds.size > 0 && canPerformWriteActions && (
                     <div className="bulk-actions-bar">
                        <span>{selectedBonusIds.size} item(s) selected.</span>
                        <div>
                            {canBulkApprove && (
                                <button onClick={handleBulkApproveClick} className="action-button approve btn-sm" title="Approve Selected">
                                    <i className="fas fa-check-circle" aria-hidden="true"></i> Approve Selected
                                </button>
                            )}
                            {canBulkRequestRevision && (
                                <button onClick={handleBulkRequestRevisionClick} className="action-button revision btn-sm" title="Request Revision for Selected">
                                    <i className="fas fa-undo-alt" aria-hidden="true"></i> Request Revision
                                </button>
                            )}
                             <button onClick={() => setHrState(prev => ({...prev, selectedBonusIds: []}))} className="action-button neutral-action btn-sm" title="Clear Selection">
                                <i className="fas fa-times-circle" aria-hidden="true"></i> Clear Selection
                            </button>
                        </div>
                    </div>
                )}


                <div className="table-responsive">
                    <table aria-live="polite">
                        <thead>
                            <tr>
                                {canPerformWriteActions && currentUser && (currentUser.roles.includes('Admin') || currentUser.roles.includes('Reviewer - Group HR')) && (
                                <th className="checkbox-cell">
                                    <input 
                                        type="checkbox" 
                                        onChange={handleToggleSelectAll}
                                        checked={isSelectAllChecked}
                                        ref={input => { if (input) input.indeterminate = isSelectAllIndeterminate; }}
                                        aria-label="Select all eligible items"
                                        disabled={isSelectAllCheckboxDisabled}
                                    />
                                </th>
                                )}
                                {visibleColumns.map(col => (
                                    <th 
                                        key={col.key} 
                                        onClick={() => handleSort(col.key as SortableBonusKey)} 
                                        scope="col" 
                                        role="columnheader" 
                                        aria-sort={sortConfig?.key === col.key ? (sortConfig.direction === 'ascending' ? 'ascending' : 'descending') : 'none'} 
                                        style={{cursor: 'pointer', textAlign: col.key === 'amount' ? 'right' : 'left'}}
                                    >
                                        {col.label} {getSortIndicator(col.key as SortableBonusKey)}
                                    </th>
                                ))}
                                {canPerformWriteActions && <th scope="col">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {displayableBonusData.length > 0 ? displayableBonusData.map(bonus => {
                                const actionDisabledByLock = isActionDisabledByPeriodLock(bonus);
                                const isSelected = selectedBonusIds.has(bonus.id);
                                const canApprove = currentUser && (currentUser.roles.includes('Admin') || currentUser.roles.includes('Reviewer - Group HR')) && bonus.status === 'Pending Review';
                                const canRequestRevision = currentUser && (currentUser.roles.includes('Admin') || currentUser.roles.includes('Reviewer - Group HR')) && bonus.status === 'Pending Review';
                                const canDelete = currentUser && (
                                    currentUser.roles.includes('Admin') ||
                                    (currentUser.roles.includes('Inputter - Local HR') && currentUser.accessibleEntities.includes(bonus.entity) && (bonus.status === 'Pending Input' || bonus.status === 'Requires Revision')) ||
                                    (currentUser.roles.includes('Reviewer - Group HR') && (bonus.status === 'Pending Review' || bonus.status === 'Requires Revision'))
                                );
                                const canSubmitForApproval = currentUser && (currentUser.roles.includes('Admin') || currentUser.roles.includes('Inputter - Local HR')) && bonus.status === 'Pending Input';
                                
                                const checkboxDisabledForRow = isCheckboxDisabledForRow(bonus);
                                
                                return (
                                    <tr 
                                        key={bonus.id} 
                                        className={isSelected ? 'selected-row' : ''}
                                        aria-selected={isSelected}
                                    >
                                        {canPerformWriteActions && currentUser && (currentUser.roles.includes('Admin') || currentUser.roles.includes('Reviewer - Group HR')) && (
                                        <td className="checkbox-cell">
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected}
                                                onChange={() => handleToggleSelect(bonus.id)}
                                                disabled={checkboxDisabledForRow}
                                                aria-label={`Select bonus ${bonus.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                        )}
                                        {visibleColumns.map(col => (
                                            <td
                                                key={col.key}
                                                style={{ textAlign: col.key === 'amount' ? 'right' : 'left' }}
                                            >
                                               {renderCellContent(bonus, col)}
                                            </td>
                                        ))}

                                        {canPerformWriteActions && (
                                            <td className="actions-cell">
                                                <button onClick={() => handleEditBonus(bonus)} className="action-button edit" title="Edit in Form" disabled={actionDisabledByLock}><i className="fas fa-edit" aria-hidden="true"></i></button>
                                                {canApprove && <button onClick={() => handleApproveBonus(bonus)} className="action-button approve" title="Approve Bonus" disabled={actionDisabledByLock}><i className="fas fa-check-circle" aria-hidden="true"></i></button>}
                                                {canRequestRevision && <button onClick={() => handleRequestRevision(bonus)} className="action-button revision" title="Request Revision" disabled={actionDisabledByLock}><i className="fas fa-undo-alt" aria-hidden="true"></i></button>}
                                                {canSubmitForApproval && <button onClick={() => setBonusToSubmit(bonus)} className="action-button approve" title="Submit for Approval" disabled={actionDisabledByLock}><i className="fas fa-paper-plane" aria-hidden="true"></i></button>}
                                                {canDelete && <button onClick={() => requestDeleteBonus(bonus)} className="action-button delete" title="Delete Bonus" disabled={actionDisabledByLock}><i className="fas fa-trash-alt" aria-hidden="true"></i></button>}
                                            </td>
                                        )}
                                    </tr>
                                );
                            }) : (
                                <tr>
                                     <td colSpan={visibleColumns.length + (canPerformWriteActions ? 2 : 1)} className="no-data-message">
                                        No bonuses match your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
            {showUploadInfoModal && (
                <BaseModal
                    isOpen={showUploadInfoModal}
                    onClose={() => setShowUploadInfoModal(false)}
                    title="File Upload Instructions"
                    modalId="upload-info-modal"
                    maxWidth="700px"
                >
                    <div className="info-modal-content">
                        <h4>File Format</h4>
                        <p>Please upload a <code>.txt</code> or <code>.csv</code> file with UTF-8 encoding. The file must use a <strong>Tab</strong> as the column delimiter.</p>
                        <p>The first line of the file <strong>must be a header row</strong> with the exact column names listed below. The order of columns must also match.</p>
                        
                        <h4>Required Columns</h4>
                        <div className="table-responsive" style={{ maxHeight: '300px', marginTop: '1rem' }}>
                            <table>
                                <thead>
                                    <tr><th>Column Name</th><th>Description & Allowed Values</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td><code>employeeId</code></td><td>Text (e.g., E12345)</td></tr>
                                    <tr><td><code>firstName</code></td><td>Text (e.g., John)</td></tr>
                                    <tr><td><code>lastName</code></td><td>Text (e.g., Doe)</td></tr>
                                    <tr><td><code>isBluebird</code></td><td><code>yes</code> or <code>no</code></td></tr>
                                    <tr><td><code>entity</code></td><td>One of: Swiss, Israel, Luxembourg, Singapore, Panama</td></tr>
                                    <tr><td><code>currency</code></td><td>One of: CHF, USD, EUR, ILS</td></tr>
                                    <tr><td><code>isCro</code></td><td><code>cro</code> or <code>non-cro</code></td></tr>
                                    <tr><td><code>notificationDate</code></td><td>Date in <code>YYYY-MM-DD</code> format</td></tr>
                                    <tr><td><code>bonusTypeCategory</code></td><td>One of: Guaranteed bonus, Lost bonus, Replacement bonus, Future guaranteed bonus</td></tr>
                                    <tr><td><code>bonusTypePayment</code></td><td><code>cash</code> or <code>shares</code></td></tr>
                                    <tr><td><code>amount</code></td><td>Number (e.g., 50000.00)</td></tr>
                                    <tr><td><code>paymentDate</code></td><td>Date in <code>YYYY-MM-DD</code> format. Can be empty.</td></tr>
                                    <tr><td><code>isPaid</code></td><td><code>yes</code> or <code>no</code></td></tr>
                                    <tr><td><code>hasClawback</code></td><td><code>yes</code> or <code>no</code></td></tr>
                                    <tr><td><code>clawbackPeriodMonths</code></td><td>Integer (e.g., 24). Required if hasClawback is 'yes'.</td></tr>
                                    <tr><td><code>clawbackType</code></td><td><code>pro-rata</code> or <code>full-refund</code>. Required if hasClawback is 'yes'.</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <h4 style={{marginTop: '1rem'}}>Example Row (values separated by Tabs)</h4>
                        <code>E008	James	Brown	no	Swiss	CHF	non-cro	2024-08-01	Guaranteed bonus	cash	60000	2024-12-31	no	yes	12	pro-rata</code>
                    </div>
                </BaseModal>
            )}
             {bonusToSubmit && (
                <ConfirmationModal
                    isOpen={!!bonusToSubmit}
                    onClose={() => setBonusToSubmit(null)}
                    onConfirm={() => {
                        if (currentUser && bonusToSubmit) {
                            onSubmitForApproval(bonusToSubmit.id, currentUser);
                        }
                        setBonusToSubmit(null);
                    }}
                    title="Confirm Submission"
                    message={`Are you sure you want to submit bonus ID ${bonusToSubmit.id} for approval? The status will be changed to "Pending Review".`}
                    confirmText="Submit"
                />
            )}
        </div>
    );
};

export default HRDashboard;