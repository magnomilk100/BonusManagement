
import React from 'react';
import { Tab, BonusFormData, User, AmortizationDetail, HRDashboardState, FinancialDashboardState, AccountingDashboardState, UserRole, GlobalAuditLogEntry, AuditDashboardState } from '../../types';

import OverviewDashboard from '../OverviewDashboard';
import HRDashboard from '../HRDashboard';
import FinancialDashboard from '../FinancialDashboard';
import FXRatesDashboard from '../FXRatesDashboard';
import AdminDashboard from '../AdminDashboard';

interface MainContentProps {
    activeTab: Tab | null;
    bonusData: BonusFormData[];
    currentUser: User;
    originalUser: User | null; // For AdminDashboard
    users: User[]; // For AdminDashboard
    lockedPeriods: string[]; // For HRDashboard, AdminDashboard
    selectedPeriod: string; // For FinancialDashboard, AccountingDashboard
    financialPeriods: string[]; // For AdminDashboard
    managedEntities: string[]; // For Admin, HR
    managedBonusTypes: string[]; // For Admin, HR, Finance
    fxRates: { [key: string]: number };
    globalAuditLog: GlobalAuditLogEntry[];

    // Callbacks for HRDashboard
    onSaveBonusEntry: (data: BonusFormData, isEditing: boolean, currentUser: User) => void;
    onDeleteBonusEntry: (bonusId: string) => void;
    onApproveBonusEntry: (bonusId: string, currentUser: User) => void;
    onRequestRevisionEntry: (bonusId: string, currentUser: User) => void;
    onSubmitForApproval: (bonusId: string, currentUser: User) => void;
    onBulkApprove: (selectedIds: string[], currentUser: User) => void;
    onBulkRequestRevision: (selectedIds: string[], currentUser: User) => void;
    onUploadBonuses: (fileContent: string, currentUser: User) => void;
    
    // Callbacks for AdminDashboard
    onAddUser: (user: Omit<User, 'id'>) => void;
    onUpdateUser: (userId: string, updates: Partial<Omit<User, 'id' | 'username'>>) => void;
    onDeleteUserAdmin: (userId: string) => void; 
    onImpersonateUser: (userId: string) => void;
    onAddPeriod: (period: string) => void;
    onDeletePeriod: (period: string) => void;
    onLockPeriod: (period: string) => void;
    onUnlockPeriod: (period: string) => void;
    onAddEntity: (name: string) => void;
    onUpdateEntity: (oldName: string, newName: string) => void;
    onDeleteEntity: (name: string) => void;
    onAddBonusType: (name: string) => void;
    onUpdateBonusType: (oldName: string, newName: string) => void;
    onDeleteBonusType: (name: string) => void;
    onAddCurrency: (currency: string) => void;
    onUpdateCurrency: (oldCurrency: string, newCurrency: string) => void;
    onDeleteCurrency: (currency: string) => void;
    
    // For FX Dashboard
    onUpdateRates: (newRates: { [key: string]: number }) => void;

    // For Overview
    onNavigateToTab: (tab: Tab, action?: string) => void;
    initialHrAction?: string | null; 
    onHrActionHandled?: () => void;

    // General
    canUserAccessTab: (tab: Tab) => boolean;
    determineInitialTab: (roles: UserRole[]) => Tab; // If needed for access denied scenario
    setActiveTab: (tab: Tab) => void; // For access denied recovery

    // Dashboard States
    hrDashboardState: HRDashboardState;
    setHrDashboardState: React.Dispatch<React.SetStateAction<HRDashboardState>>;
    financialDashboardState: FinancialDashboardState;
    setFinancialDashboardState: React.Dispatch<React.SetStateAction<FinancialDashboardState>>;
    accountingDashboardState: AccountingDashboardState;
    setAccountingDashboardState: React.Dispatch<React.SetStateAction<AccountingDashboardState>>;
    auditDashboardState: AuditDashboardState;
    setAuditDashboardState: React.Dispatch<React.SetStateAction<AuditDashboardState>>;
    onSaveFinancialInfoContent: (content: string) => void;
}

const MainContent: React.FC<MainContentProps> = (props) => {
    const { activeTab, currentUser, canUserAccessTab, determineInitialTab, setActiveTab } = props;

    if (activeTab && !canUserAccessTab(activeTab)) {
        return (
            <main className="content-area">
                <div className="module-content">
                    <h2>Access Denied</h2>
                    <p className="error-message">You do not have permission to view this page. Please contact an administrator if you believe this is an error.</p>
                    <button onClick={() => setActiveTab(determineInitialTab(currentUser.roles))} className="primary action-button">
                        <i className="fas fa-arrow-left" aria-hidden="true"></i> Go to My Dashboard
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="content-area">
            {activeTab === 'overview' && <OverviewDashboard bonusData={props.bonusData} currentUser={props.currentUser} onNavigateToTab={props.onNavigateToTab} fxRates={props.fxRates} />}
            {activeTab === 'hr' && (
                <HRDashboard
                    bonusLogData={props.bonusData}
                    onSaveBonusEntry={props.onSaveBonusEntry}
                    onDeleteBonusEntry={props.onDeleteBonusEntry}
                    onApproveBonusEntry={props.onApproveBonusEntry}
                    onRequestRevisionEntry={props.onRequestRevisionEntry}
                    onSubmitForApproval={props.onSubmitForApproval}
                    onBulkApprove={props.onBulkApprove}
                    onBulkRequestRevision={props.onBulkRequestRevision}
                    onUploadBonuses={props.onUploadBonuses}
                    currentUser={props.currentUser}
                    initialAction={props.initialHrAction}
                    onActionHandled={props.onHrActionHandled}
                    lockedPeriods={props.lockedPeriods}
                    managedEntities={props.managedEntities}
                    managedBonusTypes={props.managedBonusTypes}
                    managedCurrencies={Object.keys(props.fxRates)}
                    hrState={props.hrDashboardState}
                    setHrState={props.setHrDashboardState}
                />
            )}
            {activeTab === 'finance' && (
                <FinancialDashboard 
                    bonusData={props.bonusData} 
                    currentUser={props.currentUser} 
                    selectedPeriod={props.selectedPeriod}
                    financialState={props.financialDashboardState}
                    setFinancialState={props.setFinancialDashboardState}
                    fxRates={props.fxRates}
                    accountingState={props.accountingDashboardState}
                    setAccountingState={props.setAccountingDashboardState}
                    financialPeriods={props.financialPeriods}
                    managedBonusTypes={props.managedBonusTypes}
                />
            )}
            {activeTab === 'fxrates' && <FXRatesDashboard fxRates={props.fxRates} onUpdateRates={props.onUpdateRates} currentUser={props.currentUser} />}
            {activeTab === 'admin' && (
                <AdminDashboard 
                    users={props.users} 
                    onAddUser={props.onAddUser} 
                    onUpdateUser={props.onUpdateUser} 
                    onDeleteUser={props.onDeleteUserAdmin} 
                    onImpersonateUser={props.onImpersonateUser} 
                    currentUser={props.currentUser} 
                    originalUser={props.originalUser}
                    lockedPeriods={props.lockedPeriods}
                    financialPeriods={props.financialPeriods}
                    onAddPeriod={props.onAddPeriod}
                    onDeletePeriod={props.onDeletePeriod}
                    onLockPeriod={props.onLockPeriod}
                    onUnlockPeriod={props.onUnlockPeriod}
                    managedEntities={props.managedEntities}
                    onAddEntity={props.onAddEntity}
                    onUpdateEntity={props.onUpdateEntity}
                    onDeleteEntity={props.onDeleteEntity}
                    managedBonusTypes={props.managedBonusTypes}
                    onAddBonusType={props.onAddBonusType}
                    onUpdateBonusType={props.onUpdateBonusType}
                    onDeleteBonusType={props.onDeleteBonusType}
                    fxRates={props.fxRates}
                    onAddCurrency={props.onAddCurrency}
                    onUpdateCurrency={props.onUpdateCurrency}
                    onDeleteCurrency={props.onDeleteCurrency}
                    auditLog={props.globalAuditLog}
                    auditState={props.auditDashboardState}
                    setAuditState={props.setAuditDashboardState}
                />
            )}
        </main>
    );
};

export default MainContent;