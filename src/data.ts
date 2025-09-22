
import { User, BonusFormData } from './types';

export const initialDemoUsers: User[] = [
    { id: 'admin001', username: 'admin', password: 'password123', roles: ['Admin'], accessibleEntities: ['Swiss', 'Israel', 'Luxembourg', 'Singapore', 'Panama'] },
    { id: 'hrgroup001', username: 'ch.hrgroup1', password: 'password123', roles: ['Reviewer - Group HR'], accessibleEntities: ['Swiss', 'Israel', 'Luxembourg', 'Singapore', 'Panama'] },
    { id: 'hrgroup002', username: 'ch.hrgroup2', password: 'password123', roles: ['Reviewer - Group HR'], accessibleEntities: ['Swiss', 'Israel', 'Luxembourg', 'Singapore', 'Panama'] },
    { id: 'hrlocal001', username: 'lu.hrlocal', password: 'password123', roles: ['Inputter - Local HR'], accessibleEntities: ['Luxembourg'] },
    { id: 'hrlocal002', username: 'il.hrlocal', password: 'password123', roles: ['Inputter - Local HR'], accessibleEntities: ['Israel'] },
    { id: 'hrlocal003', username: 'sg.hrlocal', password: 'password123', roles: ['Inputter - Local HR'], accessibleEntities: ['Singapore'] },
    { id: 'hrlocal004', username: 'pa.hrlocal', password: 'password123', roles: ['Inputter - Local HR'], accessibleEntities: ['Panama'] },
    { id: 'finance001', username: 'ch.finance', password: 'password123', roles: ['Finance Viewer'], accessibleEntities: ['Swiss', 'Luxembourg'] },
    { id: 'audit001', username: 'auditor', password: 'password123', roles: ['Auditor'], accessibleEntities: ['Swiss', 'Israel', 'Luxembourg', 'Singapore', 'Panama'] },
];

export const initialDemoBonusData: BonusFormData[] = [
    {
        id: 'B1700000000001', employeeId: 'E001', firstName: 'John', lastName: 'Doe', entity: 'Swiss', currency: 'CHF', amount: '50000', bonusTypeCategory: 'Guaranteed bonus',
        bonusTypePayment: 'cash', notificationDate: '2024-01-15', paymentDate: '2024-12-31', isPaid: 'no', hasClawback: 'yes',
        clawbackPeriodMonths: '12', clawbackType: 'pro-rata', status: 'Pending Review', inputter: 'lu.hrlocal',
        lastModifiedDate: '2024-03-01T10:00:00Z', reviewerComments: '', isBluebird: 'no', isCro: 'non-cro',
        auditTrail: [{ timestamp: '2024-03-01T10:00:00Z', userId: 'hrlocal001', username: 'lu.hrlocal', action: 'Created', details: 'Initial status: Pending Review.'}]
    },
    {
        id: 'B1700000000002', employeeId: 'E002', firstName: 'Jane', lastName: 'Smith', entity: 'Israel', currency: 'ILS', amount: '120000', bonusTypeCategory: 'Lost bonus',
        bonusTypePayment: 'cash', notificationDate: '2023-11-01', paymentDate: '2024-03-31', isPaid: 'yes', hasClawback: 'no',
        status: 'Approved', inputter: 'il.hrlocal', lastModifiedDate: '2024-02-15T11:00:00Z', reviewerComments: '', isBluebird: 'yes', isCro: 'cro',
        auditTrail: [
            { timestamp: '2024-02-10T09:00:00Z', userId: 'hrlocal002', username: 'il.hrlocal', action: 'Created', details: 'Initial status: Pending Review.'},
            { timestamp: '2024-02-15T11:00:00Z', userId: 'hrgroup001', username: 'ch.hrgroup1', action: 'Approved by ch.hrgroup1'}
        ], employeeDepartureDate: undefined
    },
    {
        id: 'B1700000000003', employeeId: 'E003', firstName: 'Peter', lastName: 'Jones', entity: 'Luxembourg', currency: 'EUR', amount: '30000', bonusTypeCategory: 'Replacement bonus',
        bonusTypePayment: 'cash', notificationDate: '2024-02-01', paymentDate: '2024-04-30', isPaid: 'no', hasClawback: 'yes',
        clawbackPeriodMonths: '24', clawbackType: 'full-refund', status: 'Requires Revision', inputter: 'lu.hrlocal',
        lastModifiedDate: '2024-03-05T14:30:00Z', reviewerComments: 'Please verify payment date.', isBluebird: 'no', isCro: 'non-cro',
        auditTrail: [
            { timestamp: '2024-03-02T16:00:00Z', userId: 'hrlocal001', username: 'lu.hrlocal', action: 'Created', details: 'Initial status: Pending Review.'},
            { timestamp: '2024-03-05T14:30:00Z', userId: 'hrgroup002', username: 'ch.hrgroup2', action: 'Revision Requested by ch.hrgroup2', details: 'Comments: Please verify payment date.'}
        ]
    },
    {
        id: 'B1700000000004', employeeId: 'E004', firstName: 'Mary', lastName: 'Johnson', entity: 'Singapore', currency: 'USD', amount: '75000', bonusTypeCategory: 'Guaranteed bonus',
        bonusTypePayment: 'shares', notificationDate: '2024-03-10', paymentDate: '2025-12-31', isPaid: 'no', hasClawback: 'no',
        status: 'Approved', inputter: 'sg.hrlocal', lastModifiedDate: '2024-03-15T09:00:00Z', reviewerComments: '', isBluebird: 'yes', isCro: 'non-cro',
        auditTrail: [
             { timestamp: '2024-03-12T08:00:00Z', userId: 'hrlocal003', username: 'sg.hrlocal', action: 'Created', details: 'Initial status: Pending Review.'},
            { timestamp: '2024-03-15T09:00:00Z', userId: 'admin001', username: 'admin', action: 'Approved by admin'}
        ]
    },
    {
        id: 'B1700000000005', employeeId: 'E005', firstName: 'David', lastName: 'Williams', entity: 'Swiss', currency: 'CHF', amount: '60000', bonusTypeCategory: 'Guaranteed bonus',
        bonusTypePayment: 'cash', notificationDate: '2023-01-10', paymentDate: '2023-12-31', isPaid: 'yes', hasClawback: 'yes',
        clawbackPeriodMonths: '12', clawbackType: 'pro-rata', status: 'Approved (Clawback Processed)', inputter: 'ch.hrgroup1',
        lastModifiedDate: '2024-07-01T10:00:00Z', reviewerComments: '', employeeDepartureDate: '2024-06-30',
        isBluebird: 'no', isCro: 'non-cro',
        clawbackTriggeredDetails: { amountReversed: 30000, reversalDate: '2024-06-30', originalTotalAmortizedBeforeClawback: 30000, reason: "Employee Departure"},
        auditTrail: [
            { timestamp: '2023-01-10T09:00:00Z', userId: 'hrgroup001', username: 'ch.hrgroup1', action: 'Created', details: 'Initial status: Pending Review.'},
            { timestamp: '2023-01-15T11:00:00Z', userId: 'hrgroup001', username: 'ch.hrgroup1', action: 'Approved by ch.hrgroup1'},
            { timestamp: '2024-07-01T10:00:00Z', userId: 'admin001', username: 'admin', action: 'Employee departure processed by admin', details: 'Clawback triggered. Reversed: 30\'000 CHF. Departure: 2024-06-30.'}
        ]
    },
    {
        id: 'B1700000000006', employeeId: 'E006', firstName: 'Maria', lastName: 'Garcia', entity: 'Panama', currency: 'USD', amount: '25000', bonusTypeCategory: 'Future guaranteed bonus',
        bonusTypePayment: 'cash', notificationDate: '2024-04-01', paymentDate: '2025-06-30', isPaid: 'no', hasClawback: 'no',
        status: 'Pending Review', inputter: 'pa.hrlocal', lastModifiedDate: '2024-04-01T15:00:00Z', reviewerComments: '', isBluebird: 'no', isCro: 'cro',
        auditTrail: [{ timestamp: '2024-04-01T15:00:00Z', userId: 'hrlocal004', username: 'pa.hrlocal', action: 'Created', details: 'Initial status: Pending Review.'}]
    },
    {
        id: 'B1700000000007', employeeId: 'E007', firstName: 'Robert', lastName: 'Miller', entity: 'Swiss', currency: 'EUR', amount: '40000', bonusTypeCategory: 'Guaranteed bonus',
        bonusTypePayment: 'cash', notificationDate: '2024-05-01', paymentDate: '2026-12-31', isPaid: 'no', hasClawback: 'yes',
        clawbackPeriodMonths: '36', clawbackType: 'pro-rata', status: 'Pending Review', inputter: 'ch.hrgroup2',
        lastModifiedDate: '2024-05-01T11:00:00Z', reviewerComments: '', isBluebird: 'yes', isCro: 'non-cro',
        auditTrail: [{ timestamp: '2024-05-01T11:00:00Z', userId: 'hrgroup002', username: 'ch.hrgroup2', action: 'Created', details: 'Initial status: Pending Review.'}]
    },
];