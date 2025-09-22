
export type Tab = 'overview' | 'hr' | 'finance' | 'fxrates' | 'admin';

export type GlobalAuditLogActionType = 'Create' | 'Update' | 'Delete' | 'Login' | 'Logout' | 'ImpersonateStart' | 'ImpersonateEnd' | 'Approve' | 'RevisionRequest' | 'Submit' | 'BulkApprove' | 'BulkRevision' | 'ConfigChange' | 'System' | 'Upload';
export type GlobalAuditLogTargetType = 'Bonus' | 'User' | 'Period' | 'Entity' | 'Currency' | 'FXRate' | 'Auth' | 'System' | 'FinancialInfo' | 'BonusType';

export interface GlobalAuditLogEntry {
    id: string;
    timestamp: string;
    userId: string;
    username: string;
    actionType: GlobalAuditLogActionType;
    targetType: GlobalAuditLogTargetType;
    targetId: string;
    details: string;
}


export interface AuditLogEntry {
    timestamp: string; // ISO date string
    userId: string;
    username: string;
    action: string;
    details?: string;
}

export interface ClawbackTriggeredDetails {
    amountReversed: number;
    reversalDate: string; // ISO date string
    originalTotalAmortizedBeforeClawback: number;
    reason: string;
}

export interface BonusFormData {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    isBluebird: string;
    entity: string;
    currency: string;
    isCro: string;
    notificationDate: string;
    bonusTypeCategory: string;
    bonusTypePayment: string;
    amount: string;
    paymentDate: string;
    isPaid: string;
    hasClawback: string;
    clawbackPeriodMonths?: string;
    clawbackType?: string;
    status: 'Pending Input' | 'Pending Review' | 'Approved' | 'Requires Revision' | 'Approved (Clawback Processed)' | 'Approved (Good Leaver)';
    inputter: string;
    lastModifiedDate: string;
    reviewerComments: string;
    auditTrail: AuditLogEntry[];
    employeeDepartureDate?: string;
    leaverType?: 'Good Leaver' | 'Bad Leaver';
    clawbackTriggeredDetails?: ClawbackTriggeredDetails;
}

export type UserRole = 'Admin' | 'Inputter - Local HR' | 'Reviewer - Group HR' | 'Finance Viewer' | 'Auditor';

export interface User {
    id: string;
    username: string;
    password: string; // Plaintext for prototype. HASH IN PRODUCTION!
    roles: UserRole[];
    accessibleEntities: string[];
}

export interface Notification {
    id: string;
    recipientUserId: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    relatedBonusId?: string;
    type: 'info' | 'success' | 'warning';
}

export interface AmortizationDetail {
    bonusId: string;
    employeeId: string;
    entity: string;
    currency: string;
    bonusAmount: number;
    notificationDate: Date;
    paymentDate: Date | null;
    amortizationStartDate: Date;
    amortizationEndDate: Date;
    contractualAmortizationEndDate: Date;
    totalDaysAmortization: number;
    dailyAmortization: number;
    yearlyAmortization: { [yearOrKey: string]: number };
    totalContractualAmortization: number;
    isClawbackProcessed: boolean;
    clawbackDetails?: ClawbackTriggeredDetails & { originalAmortizationEndDate: Date };
    originalBonusObject: BonusFormData;
    approvalDate: Date | null;
    amortizedUpToSelectedPeriodMonth?: number;
    amortizedInSelectedPeriodYearToDate?: number;
    remainingInSelectedPeriodYearAfterMonth?: number;
    totalRemainingOnContractAfterSelectedPeriod?: number;
}

export interface HRLogFilters {
    entity: string;
    currency: string;
    status: string;
    hasClawback: string;
    clawbackType: string;
    searchTerm: string;
}

export type SortableBonusKey = keyof BonusFormData;

export type HRColumnConfig = {
    key: SortableBonusKey;
    label: string;
    isAlwaysVisible?: boolean;
};


export interface AccountingEntry {
    id: string;
    bonusId: string;
    employeeId: string;
    entity: string;
    date: string;
    accountType: 'P&L' | 'B/S';
    accountName: string;
    description: string;
    drCr: 'Debit' | 'Credit';
    amountCHF: number;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
}

// --- Dashboard State Interfaces ---

export interface MonthlyLiabilityRow {
    month: string;
    openingBalance: number;
    monthlyAmortization: number;
    monthlyPayments: number;
    clawbackReceived: number;
    gainLossOnClawback: number;
    closingBalance: number;
}

export interface PeriodSummaryRow {
    bonusId: string;
    employeeId: string;
    entity: string;
    bonusAmount: number;
    ltdAmortization: number;
    ytdAmortization: number;
    amountPaid: number;
    closingBalance: number; // This is the remaining amount to amortize
    clawbackAmountReceived?: number;
    gainLossOnClawback?: number;
}


export interface HRDashboardState {
    filters: HRLogFilters;
    sortConfig: { key: SortableBonusKey, direction: 'ascending' | 'descending' } | null;
    showBonusForm: boolean;
    editingBonusId: string | null;
    selectedBonusIds: string[];
}

export interface FinancialDashboardState {
    activeSubTab: 'schedules' | 'log' | 'accounting' | 'ifrs';
    schedulesData: {
        monthlyLiability: MonthlyLiabilityRow[];
        periodSummary: PeriodSummaryRow[];
    } | null;
    generationParams: any | null;
    selectedReportCurrency: string;
    bonusIdFilter: string;
    globalFinancialFilters: {entity: string, bonusTypeCategory: string, isBluebird: string, isCro: string};
    logSortConfig: { key: keyof BonusFormData, direction: 'ascending' | 'descending' };
}

export interface AccountingDashboardFilters {
    period: string; // YYYY-MM
    bonusId: string;
    employeeId: string;
    entity: string;
    accountType: 'all' | 'P&L' | 'B/S';
}

export interface AccountingDashboardState {
    filters: AccountingDashboardFilters;
    viewMode: 'summary' | 'detail';
    selectedAccountForDetail: string | null;
}

export interface AuditDashboardState {
    filters: {
        user: string;
        actionType: string;
        targetType: string;
        targetId: string;
        startDate: string;
        endDate: string;
    }
}