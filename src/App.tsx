
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tab, BonusFormData, User, Notification, UserRole, AmortizationDetail, ClawbackTriggeredDetails, HRDashboardState, FinancialDashboardState, AccountingDashboardState, HRLogFilters, GlobalAuditLogEntry, GlobalAuditLogActionType, GlobalAuditLogTargetType, AuditDashboardState } from './types';
import { initialBonusFormDataForForm } from './constants';
import { formatNumber, formatDate, parseDate, addMonths, getCurrentPeriod, getYearOptions, getMonthOptions, formatPeriodForDisplay, getMonthEnd, monthsBetween, daysBetween } from './utils';
import { calculateAmortizationDetails, calculateAmortizationDetailsForClawback } from './bonusCalculations';
import * as storageService from './services/storageService';

// Layout Components
import Sidebar from './components/layout/Sidebar';
import PageHeader from './components/layout/PageHeader';
import MainContent from './components/layout/MainContent';

// Page/Dashboard Components (loaded by MainContent)
import LoginPage from './components/LoginPage';

// Modal Components
import BonusDetailModal from './components/BonusDetailModal';
import ConfirmationModal from './components/common/ConfirmationModal';


const App: React.FC = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('currentUser_v2_period'); // Simple session persistence
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [originalUser, setOriginalUser] = useState<User | null>(null);
    
    const [bonusData, setBonusData] = useState<BonusFormData[]>(storageService.getBonusData);
    const [users, setUsers] = useState<User[]>(storageService.getUsers);
    const [notifications, setNotifications] = useState<Notification[]>(storageService.getNotifications);
    const [lockedPeriods, setLockedPeriods] = useState<string[]>(storageService.getLockedPeriods);
    const [financialPeriods, setFinancialPeriods] = useState<string[]>(storageService.getFinancialPeriods);
    const [managedEntities, setManagedEntities] = useState<string[]>(storageService.getManagedEntities);
    const [managedBonusTypes, setManagedBonusTypes] = useState<string[]>(storageService.getManagedBonusTypes);
    const [fxRates, setFxRates] = useState<{ [key: string]: number }>(storageService.getFxRates);
    const [globalAuditLog, setGlobalAuditLog] = useState<GlobalAuditLogEntry[]>(storageService.getGlobalAuditLog);


    const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
         const current = getCurrentPeriod();
         const allPeriods = storageService.getFinancialPeriods();
         return allPeriods.includes(current) ? current : (allPeriods[0] || current);
    });
    
    const [selectedBonusDetail, setSelectedBonusDetail] = useState<BonusFormData | null>(null);
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        onConfirm: (reason?: string) => void;
        confirmText?: string;
        cancelText?: string;
        requiresInput?: boolean;
        inputLabel?: string;
    } | null>(null);

    // --- Dashboard States ---
    const [hrDashboardState, setHrDashboardState] = useState<HRDashboardState>({
        filters: { entity: 'all', currency: 'all', status: 'all', hasClawback: 'all', clawbackType: 'all', searchTerm: '' },
        sortConfig: { key: 'lastModifiedDate', direction: 'descending' },
        showBonusForm: false,
        editingBonusId: null,
        selectedBonusIds: [],
    });

    const [financialDashboardState, setFinancialDashboardState] = useState<FinancialDashboardState>({
        activeSubTab: 'schedules',
        schedulesData: null,
        generationParams: null,
        selectedReportCurrency: 'CHF',
        bonusIdFilter: '',
        globalFinancialFilters: { entity: 'all', bonusTypeCategory: 'all', isBluebird: 'all', isCro: 'all' },
        logSortConfig: { key: 'lastModifiedDate', direction: 'descending' },
    });

    const [accountingDashboardState, setAccountingDashboardState] = useState<AccountingDashboardState>({
        filters: { period: selectedPeriod, bonusId: '', employeeId: '', entity: 'all', accountType: 'all' },
        viewMode: 'summary',
        selectedAccountForDetail: null,
    });
    
    const [auditDashboardState, setAuditDashboardState] = useState<AuditDashboardState>({
        filters: { user: 'all', actionType: 'all', targetType: 'all', targetId: '', startDate: '', endDate: ''}
    });


    // --- Data Persistence Effects ---
    useEffect(() => { storageService.saveBonusData(bonusData); }, [bonusData]);
    useEffect(() => { storageService.saveUsers(users); }, [users]);
    useEffect(() => { storageService.saveNotifications(notifications); }, [notifications]);
    useEffect(() => { storageService.saveLockedPeriods(lockedPeriods); }, [lockedPeriods]);
    useEffect(() => { storageService.saveFinancialPeriods(financialPeriods); }, [financialPeriods]);
    useEffect(() => { storageService.saveManagedEntities(managedEntities); }, [managedEntities]);
    useEffect(() => { storageService.saveManagedBonusTypes(managedBonusTypes); }, [managedBonusTypes]);
    useEffect(() => { storageService.saveFxRates(fxRates); }, [fxRates]);
    useEffect(() => { storageService.saveGlobalAuditLog(globalAuditLog); }, [globalAuditLog]);
    useEffect(() => { // Simple session persistence for currentUser
        if (currentUser) {
            localStorage.setItem('currentUser_v2_period', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('currentUser_v2_period');
        }
    }, [currentUser]);
    
    // --- Global Audit Log ---
    const logGlobalEvent = useCallback((user: User | null, actionType: GlobalAuditLogActionType, targetType: GlobalAuditLogTargetType, targetId: string, details: string) => {
        if (!user) return; // Don't log if no user context
        const newLogEntry: GlobalAuditLogEntry = {
            id: `GA${Date.now()}${Math.random().toString(36).substring(2, 7)}`,
            timestamp: new Date().toISOString(),
            userId: user.id,
            username: user.username,
            actionType,
            targetType,
            targetId,
            details,
        };
        setGlobalAuditLog(prev => [newLogEntry, ...prev]);
    }, []);


    // --- Notification Logic ---
    const addNotification = useCallback((userId: string, message: string, type: Notification['type'], relatedBonusId?: string) => {
        setNotifications(prev => {
            const newNotification: Notification = {
                id: `N${Date.now()}${Math.random().toString(36).substring(2, 7)}`,
                recipientUserId: userId, message, timestamp: new Date().toISOString(), isRead: false, relatedBonusId, type
            };
            return [...prev, newNotification];
        });
    }, []);
    
    const handleNotificationClick = (notification: Notification) => {
        if (notification.relatedBonusId) {
            const bonus = bonusData.find(b => b.id === notification.relatedBonusId);
            if (bonus && currentUser) {
                const canViewFinancial = currentUser.roles.includes('Admin') || currentUser.roles.includes('Finance Viewer') || currentUser.roles.includes('Auditor');
                const isFinancialContextTab = activeTab === 'finance';
                const targetTab: Tab = (canViewFinancial && isFinancialContextTab && canUserAccessTab(activeTab!, currentUser)) ? activeTab! : 'hr';
                
                if (activeTab === targetTab) {
                     setSelectedBonusDetail(bonus);
                } else {
                    setActiveTab(targetTab); 
                    setTimeout(() => setSelectedBonusDetail(bonus), 0); 
                }
            }
        }
    };
    const handleMarkNotificationAsRead = (notificationId: string) => setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    const handleMarkAllNotificationsAsRead = () => setNotifications(prev => prev.map(n => n.recipientUserId === currentUser?.id ? { ...n, isRead: true } : n));
    const handleClearAllNotifications = () => {
        if (currentUser) {
            setConfirmation({
                isOpen: true,
                title: "Clear All Notifications",
                message: "Are you sure you want to clear all your notifications? This action cannot be undone.",
                confirmText: "Clear All",
                onConfirm: () => {
                     setNotifications(prev => prev.filter(n => n.recipientUserId !== currentUser.id));
                }
            });
        }
    };

    // --- Auth & Navigation ---
    const determineInitialTab = useCallback((roles: UserRole[]): Tab => {
        if (originalUser) return activeTab || 'overview';
        if (roles.includes('Admin')) return 'admin';
        if (roles.includes('Auditor')) return 'admin';
        if (roles.includes('Reviewer - Group HR') || roles.includes('Inputter - Local HR')) return 'hr';
        if (roles.includes('Finance Viewer')) return 'finance';
        return 'overview';
    }, [activeTab, originalUser]);

    useEffect(() => { 
        if (currentUser && (!activeTab || (activeTab === 'admin' && originalUser))) { 
           setActiveTab(determineInitialTab(currentUser.roles));
        }
    }, [currentUser, activeTab, determineInitialTab, originalUser]);

    const handleLogout = () => {
        if (originalUser) { 
            const userToReturnTo = originalUser;
            logGlobalEvent(originalUser, 'ImpersonateEnd', 'Auth', currentUser!.id, `Stopped impersonating ${currentUser!.username}.`);
            setCurrentUser(userToReturnTo);
            setOriginalUser(null);
            setActiveTab(determineInitialTab(userToReturnTo.roles)); 
        } else { 
            logGlobalEvent(currentUser, 'Logout', 'Auth', currentUser!.id, 'User logged out.');
            setCurrentUser(null);
            setOriginalUser(null);
            setActiveTab(null); 
        }
    };

    const handleLogin = (username: string, pass: string): User | null => {
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === pass);
        if (user) {
            const migratedUser = storageService.getUsers().find(u => u.id === user.id); // Ensure user object is migrated
            setCurrentUser(migratedUser || user);
            logGlobalEvent(user, 'Login', 'Auth', user.id, 'User logged in successfully.');
        } else {
            // Can't log failed login attempt without a user context, which is fine for this scope.
        }
        return user || null;
    };
    
    const canUserAccessTab = useCallback((tab: Tab, user: User | null): boolean => {
        if (!user) return false;
        const { roles } = user;
        
        switch (tab) {
            case 'overview': return true;
            case 'hr': return roles.includes('Admin') || roles.includes('Reviewer - Group HR') || roles.includes('Inputter - Local HR') || roles.includes('Auditor');
            case 'finance': case 'fxrates':
                return roles.includes('Admin') || roles.includes('Finance Viewer') || roles.includes('Auditor');
            case 'admin': return roles.includes('Admin') || roles.includes('Auditor'); 
            default: return false;
        }
    }, [originalUser]);


    // --- Bonus Data CRUD & Actions ---
    const handleSaveBonusEntry = (data: BonusFormData, isEditing: boolean, userPerformingAction: User) => {
        setBonusData(prevData => {
            const now = new Date().toISOString();
            if (isEditing && data.id) {
                const oldBonus = prevData.find(b => b.id === data.id);
                if (oldBonus) {
                    // Log detailed field changes before processing.
                    const changes: string[] = [];
                    const trackedFields: Array<keyof BonusFormData> = [
                        'employeeId', 'firstName', 'lastName', 'isBluebird', 'entity', 'currency', 'isCro',
                        'notificationDate', 'bonusTypeCategory', 'bonusTypePayment', 'amount', 'paymentDate',
                        'isPaid', 'hasClawback', 'clawbackPeriodMonths', 'clawbackType',
                        'reviewerComments', 'employeeDepartureDate', 'leaverType'
                    ];
    
                    // Compare against the incoming form data to see what the user changed.
                    const potentialUpdatedData = { ...oldBonus, ...data };
    
                    trackedFields.forEach(key => {
                        const oldValue = oldBonus[key];
                        const newValue = potentialUpdatedData[key];
                        const normalizedOld = oldValue === null || oldValue === undefined ? "" : String(oldValue);
                        const normalizedNew = newValue === null || newValue === undefined ? "" : String(newValue);
    
                        if (normalizedOld !== normalizedNew) {
                            if (key.endsWith('Date') && (normalizedOld || normalizedNew)) {
                                changes.push(`${key}: '${formatDate(parseDate(normalizedOld))}' -> '${formatDate(parseDate(normalizedNew))}'`);
                            } else if (key === 'amount') {
                                changes.push(`${key}: '${formatNumber(normalizedOld, 2)}' -> '${formatNumber(normalizedNew, 2)}'`);
                            } else {
                                changes.push(`${key}: '${normalizedOld || 'empty'}' -> '${normalizedNew || 'empty'}'`);
                            }
                        }
                    });
    
                    if (changes.length > 0) {
                        logGlobalEvent(userPerformingAction, 'Update', 'Bonus', data.id, `Fields updated: ${changes.join('; ')}.`);
                    }
                }

                return prevData.map(b => {
                    if (b.id === data.id) {
                        const originalStatus = b.status;
                        let newStatus = data.status;
                        let newAuditTrail = [...(b.auditTrail || [])];
                        let processedClawbackDetails: ClawbackTriggeredDetails | undefined = b.clawbackTriggeredDetails;
                        let leaverType = data.leaverType;

                        // Leaver event processing logic
                        if (data.employeeDepartureDate && b.status.startsWith('Approved') && !b.clawbackTriggeredDetails && b.status !== 'Approved (Good Leaver)') {
                            const departureD = parseDate(data.employeeDepartureDate);
                            const paymentD = parseDate(b.paymentDate);

                            if (leaverType === 'Good Leaver') {
                                newStatus = 'Approved (Good Leaver)';
                                const details = `Departure on ${formatDate(departureD)}. Amortization ends. No clawback.`;
                                newAuditTrail.push({ timestamp: now, userId: userPerformingAction.id, username: userPerformingAction.username, action: 'Good Leaver Processed', details });
                                logGlobalEvent(userPerformingAction, 'Update', 'Bonus', b.id, `Processed as Good Leaver. ${details}`);
                            } else if (leaverType === 'Bad Leaver' && b.hasClawback === 'yes' && departureD && paymentD && b.clawbackPeriodMonths) {
                                // This is the existing "Bad Leaver" / clawback logic
                                const clawbackContractualEndDate = addMonths(paymentD, parseInt(b.clawbackPeriodMonths, 10));
                                if (departureD < clawbackContractualEndDate) {
                                    const bonusAmt = parseFloat(b.amount);
                                    const amortizationDetailForClawback = calculateAmortizationDetailsForClawback(b);
                                    let originalTotalAmortizedBeforeClawback = 0;

                                    if (amortizationDetailForClawback) {
                                        const effectiveDepartureDate = departureD;
                                        const daysForAmortCalc = daysBetween(amortizationDetailForClawback.amortizationStartDate, effectiveDepartureDate);
                                        originalTotalAmortizedBeforeClawback = Math.min(bonusAmt, daysForAmortCalc * amortizationDetailForClawback.dailyAmortization);
                                    }
                                    
                                    const totalDaysInClawbackPeriod = daysBetween(paymentD, clawbackContractualEndDate);
                                    const daysServedInClawback = daysBetween(paymentD, departureD);
                                    const unservedDays = Math.max(0, totalDaysInClawbackPeriod - daysServedInClawback);

                                    let amountReversed = b.clawbackType === 'pro-rata' 
                                        ? (bonusAmt / totalDaysInClawbackPeriod) * unservedDays
                                        : bonusAmt;
                                    
                                    amountReversed = Math.round(Math.max(0, Math.min(amountReversed, originalTotalAmortizedBeforeClawback)) * 100) / 100;

                                    if (amountReversed > 0) {
                                        processedClawbackDetails = { amountReversed, reversalDate: data.employeeDepartureDate, originalTotalAmortizedBeforeClawback, reason: "Employee Departure (Bad Leaver)" };
                                        newStatus = 'Approved (Clawback Processed)';
                                        const details = `Reversed: ${formatNumber(amountReversed, 2)} ${b.currency}. Departure: ${formatDate(departureD)}.`;
                                        newAuditTrail.push({ timestamp: now, userId: userPerformingAction.id, username: userPerformingAction.username, action: 'Clawback Processed (Bad Leaver)', details });
                                        logGlobalEvent(userPerformingAction, 'Update', 'Bonus', b.id, `Processed clawback. ${details}`);
                                    }
                                }
                            }
                        }

                        // Log status changes that are not part of a more specific event already logged
                        if (originalStatus !== newStatus) {
                            const wasSpecificEventLogged = newAuditTrail.some(log => log.timestamp === now && (log.action.includes('Clawback') || log.action.includes('Leaver')));
                            if (!wasSpecificEventLogged) {
                                logGlobalEvent(userPerformingAction, 'Update', 'Bonus', data.id, `Status changed: '${originalStatus}' -> '${newStatus}'.`);
                            }
                        }

                        const updatedBonus = { ...b, ...data, status: newStatus, lastModifiedDate: now, inputter: userPerformingAction.username, auditTrail: newAuditTrail, clawbackTriggeredDetails: processedClawbackDetails, leaverType };
                        if (JSON.stringify(b) !== JSON.stringify(updatedBonus) && newAuditTrail.length === (b.auditTrail?.length || 0)) {
                           newAuditTrail.push({ timestamp: now, userId: userPerformingAction.id, username: userPerformingAction.username, action: 'Updated by ' + userPerformingAction.username });
                        }
                        return updatedBonus;
                    }
                    return b;
                });
            } else { 
                const newBonusId = `B${Date.now()}`;
                const initialStatus: BonusFormData['status'] = (userPerformingAction.roles.includes('Admin') || userPerformingAction.roles.includes('Reviewer - Group HR')) ? 'Pending Review' : 'Pending Input';
                const newBonus = { ...initialBonusFormDataForForm, ...data, id: newBonusId, inputter: userPerformingAction.username, lastModifiedDate: now, status: initialStatus, auditTrail: [{ timestamp: now, userId: userPerformingAction.id, username: userPerformingAction.username, action: 'Created', details: `Initial status: ${initialStatus}.` }] };
                logGlobalEvent(userPerformingAction, 'Create', 'Bonus', newBonusId, `New bonus created for employee ${newBonus.employeeId} with amount ${newBonus.amount} ${newBonus.currency}.`);
                return [...prevData, newBonus];
            }
        });
    };
    
    const handleDeleteBonusEntry = (bonusId: string) => {
        const bonusToDelete = bonusData.find(b => b.id === bonusId);
        setConfirmation({
            isOpen: true,
            title: "Confirm Deletion",
            message: `Are you sure you want to delete bonus entry ID: ${bonusId} (${bonusToDelete?.employeeId || 'N/A'})? This action cannot be undone.`,
            confirmText: "Delete",
            onConfirm: () => {
                setBonusData(prevData => prevData.filter(b => b.id !== bonusId));
                if (bonusToDelete && currentUser) {
                     logGlobalEvent(currentUser, 'Delete', 'Bonus', bonusId, `Deleted bonus for employee ${bonusToDelete.employeeId}.`);
                     users.filter(u => u.roles.includes('Admin') || u.roles.includes('Reviewer - Group HR')).forEach(admin => addNotification(admin.id, `Bonus ID ${bonusId} (${bonusToDelete.entity}) deleted by ${currentUser.username}.`, 'warning'));
                }
            }
        });
    };

    const handleApproveBonusEntry = (bonusId: string, userPerformingAction: User) => {
        const bonusToApprove = bonusData.find(b => b.id === bonusId);
        setConfirmation({
            isOpen: true,
            title: "Confirm Approval",
            message: `Are you sure you want to approve bonus entry ID: ${bonusId} (${bonusToApprove?.employeeId || 'N/A'})?`,
            confirmText: "Approve",
            onConfirm: () => {
                setBonusData(prevData => prevData.map(b => {
                    if (b.id === bonusId && b.status === 'Pending Review') {
                        const now = new Date().toISOString();
                        const newAuditTrail = [...(b.auditTrail || []), { timestamp: now, userId: userPerformingAction.id, username: userPerformingAction.username, action: `Status changed from Pending Review to Approved by ${userPerformingAction.username}` }];
                        logGlobalEvent(userPerformingAction, 'Approve', 'Bonus', b.id, 'Status changed from Pending Review to Approved.');
                        const originalInputterUser = users.find(u => u.username === b.inputter);
                        if(originalInputterUser) addNotification(originalInputterUser.id, `Your bonus submission ${b.id} (${b.entity}) has been approved.`, 'success', b.id);
                        users.filter(u => u.roles.includes('Finance Viewer') && u.accessibleEntities.includes(b.entity)).forEach(fUser => addNotification(fUser.id, `Bonus ${b.id} for your entity (${b.entity}) has been approved.`, 'info', b.id));
                        return { ...b, status: 'Approved', lastModifiedDate: now, reviewerComments: '', auditTrail: newAuditTrail };
                    }
                    return b;
                }));
            }
        });
    };
    
    const handleRequestRevisionEntry = (bonusId: string, userPerformingAction: User) => {
        const bonusToRevise = bonusData.find(b => b.id === bonusId);
        setConfirmation({
            isOpen: true,
            title: 'Request Revision',
            message: `Please enter comments for the revision request for bonus ID: ${bonusId} (${bonusToRevise?.employeeId || 'N/A'}).`,
            confirmText: 'Request Revision',
            requiresInput: true,
            inputLabel: 'Comments for revision request:',
            onConfirm: (comments) => {
                if (comments) { 
                    setBonusData(prevData => prevData.map(b => {
                        if (b.id === bonusId && b.status === 'Pending Review') {
                            const now = new Date().toISOString();
                            const newAuditTrail = [...(b.auditTrail || []), { timestamp: now, userId: userPerformingAction.id, username: userPerformingAction.username, action: `Status changed to Requires Revision by ${userPerformingAction.username}`, details: `Comments: ${comments}` }];
                            logGlobalEvent(userPerformingAction, 'RevisionRequest', 'Bonus', b.id, `Revision requested. Comments: ${comments}`);
                            const originalInputterUser = users.find(u => u.username === b.inputter);
                            if(originalInputterUser) addNotification(originalInputterUser.id, `Revision requested for bonus ${b.id} (${b.entity}). Comments: ${comments}`, 'warning', b.id);
                            return { ...b, status: 'Requires Revision', reviewerComments: comments, lastModifiedDate: now, auditTrail: newAuditTrail };
                        }
                        return b;
                    }));
                }
            },
        });
    };

    const handleSubmitForApproval = (bonusId: string, userPerformingAction: User) => {
        setBonusData(prevData => {
            const bonusToSubmit = prevData.find(b => b.id === bonusId);
            if (!bonusToSubmit || bonusToSubmit.status !== 'Pending Input') {
                return prevData;
            }
            
            const now = new Date().toISOString();
            const updatedBonus = {
                ...bonusToSubmit,
                status: 'Pending Review' as const,
                lastModifiedDate: now,
                auditTrail: [
                    ...(bonusToSubmit.auditTrail || []),
                    {
                        timestamp: now,
                        userId: userPerformingAction.id,
                        username: userPerformingAction.username,
                        action: 'Submitted for Approval',
                        details: 'Status changed from Pending Input to Pending Review.'
                    }
                ]
            };
            
            logGlobalEvent(userPerformingAction, 'Submit', 'Bonus', updatedBonus.id, 'Submitted for approval. Status: Pending Input -> Pending Review.');
            
            users.filter(u => u.roles.includes('Admin') || u.roles.includes('Reviewer - Group HR')).forEach(reviewer => {
                addNotification(
                    reviewer.id,
                    `Bonus ${updatedBonus.id} for ${updatedBonus.entity} submitted for review by ${userPerformingAction.username}.`,
                    'info',
                    updatedBonus.id
                );
            });

            return prevData.map(b => b.id === bonusId ? updatedBonus : b);
        });
    };

    const handleBulkApprove = (selectedIds: string[], userPerformingAction: User) => {
        setConfirmation({
            isOpen: true,
            title: 'Bulk Approve',
            message: `Are you sure you want to approve the ${selectedIds.length} selected bonus entries?`,
            confirmText: 'Approve Selected',
            onConfirm: () => {
                logGlobalEvent(userPerformingAction, 'BulkApprove', 'Bonus', `Multiple (${selectedIds.length})`, `Approved bonus IDs: ${selectedIds.join(', ')}.`);
                setBonusData(prevData => prevData.map(b => {
                    if (selectedIds.includes(b.id) && b.status === 'Pending Review') {
                        const now = new Date().toISOString();
                        const newAuditTrail = [...(b.auditTrail || []), { timestamp: now, userId: userPerformingAction.id, username: userPerformingAction.username, action: `Bulk Approved by ${userPerformingAction.username}` }];
                        const originalInputterUser = users.find(u => u.username === b.inputter);
                        if (originalInputterUser) addNotification(originalInputterUser.id, `Your bonus submission ${b.id} has been approved.`, 'success', b.id);
                        return { ...b, status: 'Approved', lastModifiedDate: now, reviewerComments: '', auditTrail: newAuditTrail };
                    }
                    return b;
                }));
            }
        });
    };

    const handleBulkRequestRevision = (selectedIds: string[], userPerformingAction: User) => {
        setConfirmation({
            isOpen: true,
            title: 'Bulk Request Revision',
            message: `Are you sure you want to request revision for the ${selectedIds.length} selected entries? A single comment will be applied to all.`,
            confirmText: 'Request Revision for All',
            requiresInput: true,
            inputLabel: 'Common revision comments for all selected entries:',
            onConfirm: (comments) => {
                if (comments) {
                    logGlobalEvent(userPerformingAction, 'BulkRevision', 'Bonus', `Multiple (${selectedIds.length})`, `Requested revision for IDs: ${selectedIds.join(', ')}. Comments: ${comments}`);
                    setBonusData(prevData => prevData.map(b => {
                        if (selectedIds.includes(b.id) && b.status === 'Pending Review') {
                            const now = new Date().toISOString();
                            const newAuditTrail = [...(b.auditTrail || []), { timestamp: now, userId: userPerformingAction.id, username: userPerformingAction.username, action: `Bulk Revision Requested by ${userPerformingAction.username}`, details: `Comments: ${comments}` }];
                            const originalInputterUser = users.find(u => u.username === b.inputter);
                            if (originalInputterUser) addNotification(originalInputterUser.id, `Revision requested for bonus ${b.id}. Comments: ${comments}`, 'warning', b.id);
                            return { ...b, status: 'Requires Revision', reviewerComments: comments, lastModifiedDate: now, auditTrail: newAuditTrail };
                        }
                        return b;
                    }));
                }
            }
        });
    };

    
    // --- Admin User Management ---
    const handleAddUser = (user: Omit<User, 'id'>) => {
        const newUserId = `U${Date.now()}`;
        setUsers(prev => [...prev, { ...user, id: newUserId }]);
        logGlobalEvent(currentUser, 'Create', 'User', newUserId, `Created new user: ${user.username} with roles: ${user.roles.join(', ')}.`);
    };
    const handleUpdateUser = (userId: string, updates: Partial<Omit<User, 'id' | 'username'>>) => {
        const oldUser = users.find(u => u.id === userId);
        setUsers(prev => prev.map(u => u.id === userId ? {...u, ...updates, password: updates.password || u.password} : u));
        if (oldUser) {
            logGlobalEvent(currentUser, 'Update', 'User', userId, `Updated user ${oldUser.username}.`);
        }
    };
    const handleDeleteUserAdmin = (userId: string) => {
        const userToDelete = users.find(u => u.id === userId);
        if (currentUser && userId === currentUser.id) {
            return;
        }
        setConfirmation({
            isOpen: true,
            title: "Confirm User Deletion",
            message: `Are you sure you want to delete user ${userToDelete?.username || 'N/A'}? This action cannot be undone.`,
            confirmText: "Delete User",
            onConfirm: () => {
                 setUsers(prev => prev.filter(u => u.id !== userId));
                 if (userToDelete) {
                    logGlobalEvent(currentUser, 'Delete', 'User', userId, `Deleted user ${userToDelete.username}.`);
                 }
            }
        });
    };
    const handleImpersonateUser = (userId: string) => { 
        const userToImpersonate = users.find(u => u.id === userId);
        if (userToImpersonate && currentUser && currentUser.id !== userId) {
            logGlobalEvent(currentUser, 'ImpersonateStart', 'Auth', userId, `Started impersonating ${userToImpersonate.username}.`);
            setOriginalUser(currentUser); 
            setCurrentUser(userToImpersonate);
            addNotification(userToImpersonate.id, `Admin ${originalUser?.username || currentUser?.username || 'N/A'} has started impersonating your account.`, 'warning');
        }
    };
    
    // --- Period Management ---
    const handleSelectedPeriodChange = (year: string, month: string) => setSelectedPeriod(`${year}-${month}`);
    const handleAddPeriod = (period: string) => {
        if (!/^\d{4}-\d{2}$/.test(period)) {
            return;
        }
        setFinancialPeriods(prev => {
            if (prev.includes(period)) {
                return prev;
            }
            const newPeriods = [...prev, period].sort().reverse();
            logGlobalEvent(currentUser, 'ConfigChange', 'Period', period, `Added financial period: ${formatPeriodForDisplay(period)}.`);
            return newPeriods;
        });
    };

    const handleDeletePeriod = (period: string) => {
        if (lockedPeriods.includes(period)) {
            return;
        }
        setConfirmation({
            isOpen: true,
            title: 'Confirm Period Deletion',
            message: `Are you sure you want to delete the period ${formatPeriodForDisplay(period)}? This action cannot be undone.`,
            confirmText: 'Delete Period',
            onConfirm: () => {
                logGlobalEvent(currentUser, 'ConfigChange', 'Period', period, `Deleted financial period: ${formatPeriodForDisplay(period)}.`);
                setFinancialPeriods(prev => prev.filter(p => p !== period));
                if (selectedPeriod === period) {
                    setSelectedPeriod(prev => {
                        const remainingPeriods = financialPeriods.filter(p => p !== period);
                        return remainingPeriods[0] || getCurrentPeriod();
                    });
                }
            }
        });
    };

    const handleLockPeriod = (period: string) => {
         setConfirmation({
            isOpen: true,
            title: 'Confirm Period Lock',
            message: `Are you sure you want to lock the period ${formatPeriodForDisplay(period)}? This will restrict edits for some users.`,
            confirmText: 'Lock Period',
            onConfirm: () => {
                logGlobalEvent(currentUser, 'ConfigChange', 'Period', period, `Locked period: ${formatPeriodForDisplay(period)}.`);
                setLockedPeriods(prev => prev.includes(period) ? prev : [...prev, period]);
            }
        });
    };

    const handleUnlockPeriod = (period: string) => {
        setConfirmation({
            isOpen: true,
            title: 'Confirm Period Unlock',
            message: `Are you sure you want to unlock the period ${formatPeriodForDisplay(period)}?`,
            confirmText: 'Unlock Period',
            onConfirm: () => {
                logGlobalEvent(currentUser, 'ConfigChange', 'Period', period, `Unlocked period: ${formatPeriodForDisplay(period)}.`);
                setLockedPeriods(prev => prev.filter(p => p !== period));
            }
        });
    };

    // --- Entity Management ---
    const handleAddEntity = (name: string) => {
        if (!name.trim()) {
            return;
        }
        setManagedEntities(prev => {
            if (prev.map(e => e.toLowerCase()).includes(name.toLowerCase())) {
                return prev;
            }
            logGlobalEvent(currentUser, 'ConfigChange', 'Entity', name.trim(), `Added new entity: ${name.trim()}.`);
            return [...prev, name.trim()].sort();
        });
    };

    const handleUpdateEntity = (oldName: string, newName: string) => {
        if (!newName.trim()) {
            return;
        }
        if (oldName.toLowerCase() === newName.toLowerCase() && oldName !== newName) {
             return;
        }
        if (managedEntities.map(e => e.toLowerCase()).includes(newName.toLowerCase()) && oldName.toLowerCase() !== newName.toLowerCase()) {
            return;
        }

        logGlobalEvent(currentUser, 'ConfigChange', 'Entity', oldName, `Updated entity name from '${oldName}' to '${newName.trim()}'. Associated users and bonuses updated.`);
        setManagedEntities(prev => prev.map(e => e === oldName ? newName.trim() : e).sort());
        setBonusData(prev => prev.map(b => b.entity === oldName ? { ...b, entity: newName.trim() } : b));
        setUsers(prev => prev.map(u => ({
            ...u,
            accessibleEntities: u.accessibleEntities.map(e => e === oldName ? newName.trim() : e)
        })));
        
        if (currentUser?.accessibleEntities.includes(oldName)) {
            setCurrentUser(prev => prev ? { ...prev, accessibleEntities: prev.accessibleEntities.map(e => e === oldName ? newName.trim() : e)} : null);
        }
        if (originalUser?.accessibleEntities.includes(oldName)) {
            setOriginalUser(prev => prev ? { ...prev, accessibleEntities: prev.accessibleEntities.map(e => e === oldName ? newName.trim() : e)} : null);
        }
    };

    const handleDeleteEntity = (name: string) => {
        const isUsedInBonuses = bonusData.some(b => b.entity === name);
        const isUsedInUsers = users.some(u => u.accessibleEntities.includes(name));

        if (isUsedInBonuses || isUsedInUsers) {
            return;
        }
        
        setConfirmation({
            isOpen: true,
            title: 'Confirm Entity Deletion',
            message: `Are you sure you want to permanently delete the entity "${name}"? This action cannot be undone.`,
            confirmText: 'Delete Entity',
            onConfirm: () => {
                logGlobalEvent(currentUser, 'ConfigChange', 'Entity', name, `Deleted entity: ${name}.`);
                setManagedEntities(prev => prev.filter(e => e !== name));
            }
        });
    };

    // --- Bonus Type Management ---
    const handleAddBonusType = (name: string) => {
        if (!name.trim()) {
            return;
        }
        setManagedBonusTypes(prev => {
            if (prev.map(t => t.toLowerCase()).includes(name.toLowerCase())) {
                return prev;
            }
            logGlobalEvent(currentUser, 'ConfigChange', 'BonusType', name.trim(), `Added new bonus type: ${name.trim()}.`);
            return [...prev, name.trim()].sort();
        });
    };

    const handleUpdateBonusType = (oldName: string, newName: string) => {
        if (!newName.trim()) return;
        if (managedBonusTypes.map(t => t.toLowerCase()).includes(newName.toLowerCase()) && oldName.toLowerCase() !== newName.toLowerCase()) {
            return;
        }
        logGlobalEvent(currentUser, 'ConfigChange', 'BonusType', oldName, `Updated bonus type from '${oldName}' to '${newName.trim()}'.`);
        setManagedBonusTypes(prev => prev.map(t => t === oldName ? newName.trim() : t).sort());
        setBonusData(prev => prev.map(b => b.bonusTypeCategory === oldName ? { ...b, bonusTypeCategory: newName.trim() } : b));
    };

    const handleDeleteBonusType = (name: string) => {
        const isUsed = bonusData.some(b => b.bonusTypeCategory === name);
        if (isUsed) {
            alert(`Cannot delete bonus type "${name}" as it is currently in use in bonus records.`);
            return;
        }
        setConfirmation({
            isOpen: true,
            title: 'Confirm Bonus Type Deletion',
            message: `Are you sure you want to permanently delete the bonus type "${name}"? This action cannot be undone.`,
            confirmText: 'Delete Bonus Type',
            onConfirm: () => {
                logGlobalEvent(currentUser, 'ConfigChange', 'BonusType', name, `Deleted bonus type: ${name}.`);
                setManagedBonusTypes(prev => prev.filter(t => t !== name));
            }
        });
    };

    // --- Currency Management ---
    const handleUpdateRates = (newRates: { [key: string]: number }) => {
        setFxRates(prev => ({...prev, ...newRates, 'CHF': 1}));
        logGlobalEvent(currentUser, 'ConfigChange', 'FXRate', 'Multiple', `Updated ${Object.keys(newRates).length} FX rates via file upload.`);
        if (currentUser) {
            addNotification(currentUser.id, 'FX Rates have been updated from a file upload.', 'success');
        }
    };

    const handleAddCurrency = (currency: string) => {
        if (!currency.trim()) {
            alert("Currency code cannot be empty.");
            return;
        }
        const upperCurrency = currency.trim().toUpperCase();
        if (fxRates[upperCurrency]) {
            alert(`Currency "${upperCurrency}" already exists.`);
            return;
        }
        logGlobalEvent(currentUser, 'ConfigChange', 'Currency', upperCurrency, `Added new currency: ${upperCurrency} with default rate 1.0.`);
        setFxRates(prev => ({ ...prev, [upperCurrency]: 1.0 }));
    };

    const handleDeleteCurrency = (currency: string) => {
        if (currency === 'CHF') {
            alert("Cannot delete the base currency 'CHF'.");
            return;
        }
        const isUsed = bonusData.some(b => b.currency === currency);
        if (isUsed) {
            alert(`Cannot delete currency "${currency}" as it is currently in use in bonus records.`);
            return;
        }
        setConfirmation({
            isOpen: true,
            title: "Confirm Currency Deletion",
            message: `Are you sure you want to permanently delete the currency "${currency}"? This action cannot be undone.`,
            confirmText: "Delete Currency",
            onConfirm: () => {
                logGlobalEvent(currentUser, 'ConfigChange', 'Currency', currency, `Deleted currency: ${currency}.`);
                setFxRates(prev => {
                    const newRates = { ...prev };
                    delete newRates[currency];
                    return newRates;
                });
            }
        });
    };

    const handleUpdateCurrency = (oldCurrency: string, newCurrency: string) => {
        if (!newCurrency.trim()) {
            alert("New currency code cannot be empty.");
            return;
        }
        const upperNewCurrency = newCurrency.trim().toUpperCase();
        if (oldCurrency === 'CHF') {
            alert("Cannot edit the base currency 'CHF'.");
            return;
        }
        if (fxRates[upperNewCurrency] && upperNewCurrency.toLowerCase() !== oldCurrency.toLowerCase()) {
            alert(`Currency "${upperNewCurrency}" already exists.`);
            return;
        }
        
        logGlobalEvent(currentUser, 'ConfigChange', 'Currency', oldCurrency, `Updated currency code from '${oldCurrency}' to '${upperNewCurrency}'. Associated bonuses updated.`);
        setFxRates(prev => {
            const newRates = { ...prev };
            if (oldCurrency !== upperNewCurrency) {
                newRates[upperNewCurrency] = newRates[oldCurrency];
                delete newRates[oldCurrency];
            }
            return newRates;
        });

        setBonusData(prev => prev.map(b => b.currency === oldCurrency ? { ...b, currency: upperNewCurrency } : b));
        
        if (currentUser) {
            addNotification(currentUser.id, `Currency code ${oldCurrency} has been updated to ${upperNewCurrency}.`, 'info');
        }
    };


    // --- File Upload ---
    const handleUploadBonuses = useCallback((fileContent: string, userPerformingAction: User) => {
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
            return;
        }

        const header = lines[0].trim().split('\t');
        const expectedHeaders = [
            'employeeId', 'firstName', 'lastName', 'isBluebird', 'entity', 'currency', 'isCro', 'notificationDate', 'bonusTypeCategory',
            'bonusTypePayment', 'amount', 'paymentDate', 'isPaid', 'hasClawback', 'clawbackPeriodMonths', 'clawbackType'
        ];

        if (JSON.stringify(header) !== JSON.stringify(expectedHeaders)) {
            return;
        }

        const newBonuses: BonusFormData[] = [];
        const errors: string[] = [];

        lines.slice(1).forEach((line, index) => {
            const values = line.trim().split('\t');
            if (values.length !== expectedHeaders.length) {
                errors.push(`Row ${index + 2}: Incorrect number of columns.`);
                return;
            }

            const rowData: { [key: string]: string } = header.reduce((obj, key, i) => ({ ...obj, [key]: values[i] || '' }), {});

            if (!rowData.employeeId || !rowData.firstName || !rowData.lastName || !rowData.entity || !rowData.currency || !rowData.amount || !rowData.notificationDate || !rowData.bonusTypeCategory) {
                errors.push(`Row ${index + 2}: Missing one or more required fields.`);
                return;
            }
            
            const now = new Date().toISOString();
            const newBonusId = `B${Date.now() + index}`;
            const initialStatus: BonusFormData['status'] = (userPerformingAction.roles.includes('Admin') || userPerformingAction.roles.includes('Reviewer - Group HR')) ? 'Pending Review' : 'Pending Input';

            const newBonus: BonusFormData = {
                ...initialBonusFormDataForForm,
                ...rowData,
                firstName: rowData.firstName,
                lastName: rowData.lastName,
                id: newBonusId,
                inputter: userPerformingAction.username,
                lastModifiedDate: now,
                status: initialStatus,
                auditTrail: [{ timestamp: now, userId: userPerformingAction.id, username: userPerformingAction.username, action: 'Created via file upload', details: `Initial status: ${initialStatus}.` }],
                reviewerComments: '',
            };
            newBonuses.push(newBonus);
        });
        
        if (errors.length > 0) {
            // Handle errors, maybe show a modal
            return;
        }

        if (newBonuses.length > 0) {
            logGlobalEvent(userPerformingAction, 'Upload', 'Bonus', `Multiple (${newBonuses.length})`, `Uploaded ${newBonuses.length} bonuses from file.`);
            setBonusData(prevData => [...prevData, ...newBonuses]);
            users.filter(u => u.roles.includes('Admin') || u.roles.includes('Reviewer - Group HR')).forEach(admin => {
                if (admin.id !== userPerformingAction.id) {
                    addNotification(admin.id, `${newBonuses.length} bonuses uploaded by ${userPerformingAction.username}.`, 'info');
                }
            });
        }
    }, [addNotification, users, logGlobalEvent]);

    // --- Modal Controls ---
    const [initialHrAction, setInitialHrAction] = useState<string | null>(null);
    const navigateToTabAndAction = (tab: Tab, action?: string) => { setInitialHrAction(action && tab === 'hr' ? action : null); setActiveTab(tab); };
    const handleHrActionHandled = () => setInitialHrAction(null); 
    const handleCloseBonusDetailModal = () => setSelectedBonusDetail(null);

    // --- Render Logic ---
    if (!currentUser) {
        return <LoginPage onLogin={handleLogin} setCurrentUser={setCurrentUser} />;
    }
    
    const userNotifications = notifications.filter(n => n.recipientUserId === currentUser.id);

    return (
        <div className={`app-layout-container ${isSidebarCollapsed ? 'sidebar-collapsed-layout' : ''}`}>
            <Sidebar
                isSidebarCollapsed={isSidebarCollapsed}
                activeTab={activeTab}
                currentUser={currentUser}
                originalUser={originalUser}
                selectedPeriod={selectedPeriod}
                financialPeriods={financialPeriods}
                onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                onNavigateToTab={navigateToTabAndAction}
                onLogout={handleLogout}
                onSelectedPeriodChange={handleSelectedPeriodChange}
                canUserAccessTab={(tab) => canUserAccessTab(tab, currentUser)}
            />
            <div className="main-content-wrapper">
                <PageHeader
                    activeTab={activeTab}
                    currentUser={currentUser}
                    originalUser={originalUser}
                    selectedPeriod={selectedPeriod}
                    userNotifications={userNotifications}
                    onMarkNotificationAsRead={handleMarkNotificationAsRead}
                    onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
                    onClearAllNotifications={handleClearAllNotifications}
                    onNotificationClick={handleNotificationClick}
                />
                <MainContent
                    activeTab={activeTab}
                    bonusData={bonusData}
                    currentUser={currentUser}
                    originalUser={originalUser}
                    users={users}
                    lockedPeriods={lockedPeriods}
                    selectedPeriod={selectedPeriod}
                    onSaveBonusEntry={handleSaveBonusEntry}
                    onDeleteBonusEntry={handleDeleteBonusEntry}
                    onApproveBonusEntry={handleApproveBonusEntry}
                    onRequestRevisionEntry={handleRequestRevisionEntry}
                    onSubmitForApproval={handleSubmitForApproval}
                    onBulkApprove={handleBulkApprove}
                    onBulkRequestRevision={handleBulkRequestRevision}
                    onUploadBonuses={handleUploadBonuses}
                    onAddUser={handleAddUser}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUserAdmin={handleDeleteUserAdmin}
                    onImpersonateUser={handleImpersonateUser}
                    financialPeriods={financialPeriods}
                    onAddPeriod={handleAddPeriod}
                    onDeletePeriod={handleDeletePeriod}
                    onLockPeriod={handleLockPeriod}
                    onUnlockPeriod={handleUnlockPeriod}
                    onNavigateToTab={navigateToTabAndAction}
                    initialHrAction={initialHrAction}
                    onHrActionHandled={handleHrActionHandled}
                    canUserAccessTab={(tab) => canUserAccessTab(tab, currentUser)}
                    determineInitialTab={determineInitialTab}
                    setActiveTab={setActiveTab}
                    managedEntities={managedEntities}
                    onAddEntity={handleAddEntity}
                    onUpdateEntity={handleUpdateEntity}
                    onDeleteEntity={handleDeleteEntity}
                    managedBonusTypes={managedBonusTypes}
                    onAddBonusType={handleAddBonusType}
                    onUpdateBonusType={handleUpdateBonusType}
                    onDeleteBonusType={handleDeleteBonusType}
                    fxRates={fxRates}
                    onUpdateRates={handleUpdateRates}
                    onAddCurrency={handleAddCurrency}
                    onUpdateCurrency={handleUpdateCurrency}
                    onDeleteCurrency={handleDeleteCurrency}
                    hrDashboardState={hrDashboardState}
                    setHrDashboardState={setHrDashboardState}
                    financialDashboardState={financialDashboardState}
                    setFinancialDashboardState={setFinancialDashboardState}
                    accountingDashboardState={accountingDashboardState}
                    setAccountingDashboardState={setAccountingDashboardState}
                    onSaveFinancialInfoContent={() => {}}
                    globalAuditLog={globalAuditLog}
                    auditDashboardState={auditDashboardState}
                    setAuditDashboardState={setAuditDashboardState}
                />
                 <footer className="page-footer">
                    <p>&copy; {new Date().getFullYear()} Bonus Management Inc. All rights reserved.</p>
                    <p>Confidential & Proprietary Information</p>
                </footer>
            </div>
            
            {confirmation?.isOpen && (
                <ConfirmationModal
                    isOpen={confirmation.isOpen}
                    onClose={() => setConfirmation(null)}
                    onConfirm={(inputText) => {
                        confirmation.onConfirm(inputText);
                        setConfirmation(null);
                    }}
                    title={confirmation.title}
                    message={confirmation.message}
                    confirmText={confirmation.confirmText}
                    cancelText={confirmation.cancelText}
                    requiresInput={confirmation.requiresInput}
                    inputLabel={confirmation.inputLabel}
                />
            )}
            {selectedBonusDetail && <BonusDetailModal bonus={selectedBonusDetail} onClose={handleCloseBonusDetailModal} />}
        </div>
    );
};

export default App;