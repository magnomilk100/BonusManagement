
import { UserRole } from './types';

export const USER_ROLES: UserRole[] = ['Admin', 'Inputter - Local HR', 'Reviewer - Group HR', 'Finance Viewer', 'Auditor'];
export const INITIAL_ENTITIES: string[] = ['Swiss', 'Israel', 'Luxembourg', 'Singapore', 'Panama', 'Unassigned'];

export const INITIAL_BONUS_TYPES: string[] = [
    'Guaranteed bonus',
    'Lost bonus',
    'Replacement bonus',
    'Future guaranteed bonus',
    'Non-CRO discretionary',
    'CRO formula-driven'
];

export const MASTER_FX_RATES: { [key: string]: number } = {
    'CHF': 1,
    'USD': 1.10,
    'EUR': 1.05,
    'ILS': 0.30
};

export const SYSTEM_CURRENT_DATE = new Date();

export const initialBonusFormDataForForm = {
    employeeId: '',
    firstName: '',
    lastName: '',
    isBluebird: 'no',
    entity: '',
    currency: '',
    isCro: 'non-cro',
    notificationDate: '',
    bonusTypeCategory: '',
    bonusTypePayment: 'cash',
    amount: '',
    paymentDate: '',
    isPaid: 'no',
    hasClawback: 'no',
    clawbackPeriodMonths: '',
    clawbackType: 'pro-rata',
    reviewerComments: '',
    auditTrail: [],
    employeeDepartureDate: '',
    clawbackTriggeredDetails: undefined,
};