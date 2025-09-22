

import React, { useState, useMemo, useCallback } from 'react';
import { BonusFormData, User, AccountingEntry as AccountingEntryType, AccountingDashboardState, AccountingDashboardFilters } from '../types';
import { formatNumber, formatDate, parseDate, addMonths, getMonthEnd, formatPeriodForDisplay } from '../utils';
import { calculateAmortizationDetails, getDailyExpenseRateCalculator } from '../bonusCalculations';

interface AccountingDashboardProps {
    bonusData: BonusFormData[];
    fxRates: { [key: string]: number };
    currentUser: User | null;
    selectedPeriod: string;
    accountingState: AccountingDashboardState;
    setAccountingState: React.Dispatch<React.SetStateAction<AccountingDashboardState>>;
    financialPeriods: string[];
}

const AccountingDashboard: React.FC<AccountingDashboardProps> = ({ bonusData, fxRates, currentUser, selectedPeriod, accountingState, setAccountingState, financialPeriods }) => {
    const { filters, viewMode, selectedAccountForDetail } = accountingState;
    
    const convertToCHF = useCallback((amount: number, currency: string): number => {
        if (currency === 'CHF') return amount;
        const rate = fxRates[currency] || 1;
        return amount * rate;
    }, [fxRates]);
    
    const accountingEntries = useMemo(() => {
        const entries: AccountingEntryType[] = [];
        let entryCounter = 0;

        const approvedBonuses = bonusData.filter(b => b.status.startsWith('Approved') && b.bonusTypePayment !== 'shares');

        approvedBonuses.forEach(bonus => {
            const bonusAmountNum = parseFloat(bonus.amount);
            if (isNaN(bonusAmountNum)) return;

            const amortizationDetail = calculateAmortizationDetails(bonus);
            if (!amortizationDetail) return;
            
            const approvalDate = amortizationDetail.approvalDate;
            if (!approvalDate) return; 

            // --- Amortization Entries ---
            const dailyExpenseCalculator = getDailyExpenseRateCalculator(bonus, amortizationDetail.contractualAmortizationEndDate, bonusAmountNum);
            
            const monthlyAggregates: { [periodYYYYMM: string]: number } = {};

            let currentDate = new Date(amortizationDetail.amortizationStartDate);
            while (currentDate <= amortizationDetail.amortizationEndDate) {
                if (currentDate >= approvalDate) {
                    const periodKey = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}`;
                    if (!monthlyAggregates[periodKey]) {
                        monthlyAggregates[periodKey] = 0;
                    }
                    monthlyAggregates[periodKey] += dailyExpenseCalculator(currentDate);
                }
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }

            // Add catch-up amount for the approval month
            const approvalPeriodKey = `${approvalDate.getUTCFullYear()}-${String(approvalDate.getUTCMonth() + 1).padStart(2, '0')}`;
            if (!monthlyAggregates[approvalPeriodKey]) monthlyAggregates[approvalPeriodKey] = 0;

            let catchUpDate = new Date(amortizationDetail.amortizationStartDate);
            while (catchUpDate < approvalDate) {
                monthlyAggregates[approvalPeriodKey] += dailyExpenseCalculator(catchUpDate);
                catchUpDate.setUTCDate(catchUpDate.getUTCDate() + 1);
            }

            // Create journal entries from monthly aggregates
            for (const periodKey in monthlyAggregates) {
                const amountOrigCcy = monthlyAggregates[periodKey];
                if (amountOrigCcy <= 0) continue;

                const amountCHF = convertToCHF(amountOrigCcy, bonus.currency);
                const periodMonthEnd = getMonthEnd(parseInt(periodKey.slice(0, 4)), parseInt(periodKey.slice(5, 7)) - 1);
                const entryDate = `${periodMonthEnd.getUTCFullYear()}-${String(periodMonthEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(periodMonthEnd.getUTCDate()).padStart(2, '0')}`;

                entries.push({
                    id: `AE${Date.now()}${entryCounter++}`, bonusId: bonus.id, employeeId: bonus.employeeId, entity: bonus.entity,
                    date: entryDate, accountType: 'P&L', accountName: 'Bonus Expense',
                    description: `Amortization for ${formatPeriodForDisplay(periodKey)} - ${bonus.id}`,
                    drCr: 'Debit', amountCHF
                });
                entries.push({
                    id: `AE${Date.now()}${entryCounter++}`, bonusId: bonus.id, employeeId: bonus.employeeId, entity: bonus.entity,
                    date: entryDate, accountType: 'B/S', accountName: 'Accrued Bonus Liability',
                    description: `Accrual for ${formatPeriodForDisplay(periodKey)} - ${bonus.id}`,
                    drCr: 'Credit', amountCHF
                });
            }

            // --- Payment Entries ---
            if (bonus.isPaid === 'yes' && bonus.paymentDate) {
                const paymentDateParsed = parseDate(bonus.paymentDate);
                const bonusAmountCHF = convertToCHF(bonusAmountNum, bonus.currency);
                if (paymentDateParsed) {
                    const paymentDateYYYYMMDD = `${paymentDateParsed.getUTCFullYear()}-${String(paymentDateParsed.getUTCMonth() + 1).padStart(2, '0')}-${String(paymentDateParsed.getUTCDate()).padStart(2, '0')}`;
                    entries.push({ id: `AE${Date.now()}${entryCounter++}`, bonusId: bonus.id, employeeId: bonus.employeeId, entity: bonus.entity, date: paymentDateYYYYMMDD, accountType: 'B/S', accountName: 'Accrued Bonus Liability', description: `Payment of Bonus - ${bonus.id}`, drCr: 'Debit', amountCHF: bonusAmountCHF });
                    entries.push({ id: `AE${Date.now()}${entryCounter++}`, bonusId: bonus.id, employeeId: bonus.employeeId, entity: bonus.entity, date: paymentDateYYYYMMDD, accountType: 'B/S', accountName: 'Cash', description: `Cash Payment for Bonus - ${bonus.id}`, drCr: 'Credit', amountCHF: bonusAmountCHF });
                }
            }
            
            // --- Clawback Entries ---
            if (bonus.status === 'Approved (Clawback Processed)' && bonus.clawbackTriggeredDetails) {
                const reversalDateParsed = parseDate(bonus.clawbackTriggeredDetails.reversalDate);
                if (reversalDateParsed) {
                    const reversalDateYYYYMMDD = `${reversalDateParsed.getUTCFullYear()}-${String(reversalDateParsed.getUTCMonth() + 1).padStart(2, '0')}-${String(reversalDateParsed.getUTCDate()).padStart(2, '0')}`;
                    
                    const clawbackReceivedCHF = convertToCHF(bonus.clawbackTriggeredDetails.amountReversed, bonus.currency);
                    const totalAmortizedAtDepartureCHF = convertToCHF(amortizationDetail.totalContractualAmortization, bonus.currency);
                    
                    let paymentMadeCHF = 0;
                    const departureDate = parseDate(bonus.employeeDepartureDate);
                    const paymentDate = parseDate(bonus.paymentDate);
                    if (bonus.isPaid === 'yes' && paymentDate && departureDate && paymentDate <= departureDate) {
                        paymentMadeCHF = convertToCHF(bonusAmountNum, bonus.currency);
                    }

                    const remainingCarryingValueCHF = paymentMadeCHF - totalAmortizedAtDepartureCHF;
                    const gainLossOnClawbackCHF = clawbackReceivedCHF - remainingCarryingValueCHF;

                    if (clawbackReceivedCHF > 0) entries.push({ id: `AE${Date.now()}${entryCounter++}`, bonusId: bonus.id, employeeId: bonus.employeeId, entity: bonus.entity, date: reversalDateYYYYMMDD, accountType: 'B/S', accountName: 'Cash/Receivable', description: `Clawback Received - ${bonus.id}`, drCr: 'Debit', amountCHF: clawbackReceivedCHF });
                    if (Math.abs(remainingCarryingValueCHF) > 0.005) entries.push({ id: `AE${Date.now()}${entryCounter++}`, bonusId: bonus.id, employeeId: bonus.employeeId, entity: bonus.entity, date: reversalDateYYYYMMDD, accountType: 'B/S', accountName: 'Accrued Bonus Liability', description: `Write-off of bonus carrying value - ${bonus.id}`, drCr: remainingCarryingValueCHF > 0 ? 'Credit' : 'Debit', amountCHF: Math.abs(remainingCarryingValueCHF) });
                    if (Math.abs(gainLossOnClawbackCHF) > 0.005) entries.push({ id: `AE${Date.now()}${entryCounter++}`, bonusId: bonus.id, employeeId: bonus.employeeId, entity: bonus.entity, date: reversalDateYYYYMMDD, accountType: 'P&L', accountName: gainLossOnClawbackCHF > 0 ? 'Gain on Clawback' : 'Loss on Clawback', description: `P&L on clawback - ${bonus.id}`, drCr: gainLossOnClawbackCHF > 0 ? 'Credit' : 'Debit', amountCHF: Math.abs(gainLossOnClawbackCHF) });
                }
            }
        });
        return entries;
    }, [bonusData, convertToCHF]);


    const filteredEntries = useMemo(() => {
        return accountingEntries.filter(entry => {
            if (filters.period && !entry.date.startsWith(filters.period)) return false;
            if (filters.bonusId && !entry.bonusId.toLowerCase().includes(filters.bonusId.toLowerCase())) return false;
            if (filters.employeeId && !entry.employeeId.toLowerCase().includes(filters.employeeId.toLowerCase())) return false;
            if (filters.entity !== 'all' && entry.entity !== filters.entity) return false;
            if (filters.accountType !== 'all' && entry.accountType !== filters.accountType) return false;
            if (currentUser?.roles.includes('Finance Viewer') && !currentUser.accessibleEntities.includes(entry.entity)) return false;
            return true;
        });
    }, [accountingEntries, filters, currentUser]);

    const summaryData = useMemo(() => {
        const summary: { [key: string]: { debits: number, credits: number, type: 'P&L' | 'B/S' } } = {};
        filteredEntries.forEach(entry => {
            if (!summary[entry.accountName]) {
                summary[entry.accountName] = { debits: 0, credits: 0, type: entry.accountType };
            }
            if (entry.drCr === 'Debit') summary[entry.accountName].debits += entry.amountCHF;
            else summary[entry.accountName].credits += entry.amountCHF;
        });
        return Object.entries(summary).map(([accountName, data]) => ({
            accountName,
            ...data,
            net: data.debits - data.credits
        })).sort((a,b) => a.accountName.localeCompare(b.accountName));
    }, [filteredEntries]);

    const detailViewEntries = useMemo(() => {
        if (viewMode === 'detail' && selectedAccountForDetail) {
            return filteredEntries.filter(entry => entry.accountName === selectedAccountForDetail);
        }
        return [];
    }, [filteredEntries, viewMode, selectedAccountForDetail]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setAccountingState(prev => ({...prev, filters: { ...prev.filters, [name]: value }}));
    };
    
    const resetFilters = () => {
        setAccountingState(prev => ({ ...prev, filters: { period: selectedPeriod, bonusId: '', employeeId: '', entity: 'all', accountType: 'all' }}));
    };
    
    const uniqueEntitiesForFilter = useMemo(() => {
        if (currentUser?.roles.includes('Finance Viewer')) return ['all', ...currentUser.accessibleEntities];
        return ['all', ...new Set(bonusData.map(b => b.entity).filter(e => e && e !== 'Unassigned'))];
    }, [bonusData, currentUser]);

    const handleDrillDown = (accountName: string) => {
        setAccountingState(prev => ({...prev, selectedAccountForDetail: accountName, viewMode: 'detail'}));
    };
    
    const handleReturnToSummary = () => {
        setAccountingState(prev => ({...prev, selectedAccountForDetail: null, viewMode: 'summary'}));
    };

    return (
        <div id="accounting-dashboard" className="module-content"> 
            <h2><i className="fas fa-book" aria-hidden="true"></i> Accounting Ledger Entries</h2>
            
            <section className="dashboard-section filters-section" aria-labelledby="accounting-filters-heading"> 
                <h3 id="accounting-filters-heading"><i className="fas fa-filter" aria-hidden="true"></i> Filter Entries</h3>
                <div className="filters-group">
                    <div>
                        <label htmlFor="accPeriodFilter">Period:</label>
                        <select
                            id="accPeriodFilter"
                            name="period"
                            value={filters.period}
                            onChange={handleFilterChange}
                        >
                            {financialPeriods.map(p => (
                                <option key={p} value={p}>
                                    {formatPeriodForDisplay(p)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div><label htmlFor="accBonusId">Bonus ID:</label><input type="text" id="accBonusId" name="bonusId" value={filters.bonusId} onChange={handleFilterChange} placeholder="Search Bonus ID" /></div>
                    <div><label htmlFor="accEntityFilter">Entity:</label><select id="accEntityFilter" name="entity" value={filters.entity} onChange={handleFilterChange}>{uniqueEntitiesForFilter.map(e => <option key={e} value={e}>{e === 'all' ? 'All Entities' : e}</option>)}</select></div>
                    <div><label htmlFor="accAccountType">Account Type:</label><select id="accAccountType" name="accountType" value={filters.accountType} onChange={handleFilterChange}><option value="all">All</option><option value="P&L">P&L</option><option value="B/S">B/S</option></select></div>
                    <div><button type="button" onClick={resetFilters} className="secondary action-button"><i className="fas fa-undo" aria-hidden="true"></i> Reset</button></div>
                </div>
            </section>

            <section className="dashboard-section" aria-labelledby="entries-table-heading">
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem'}}>
                    <h3 id="entries-table-heading" style={{margin: 0}}>
                        {viewMode === 'summary' ? `T-Account Summary for ${formatPeriodForDisplay(filters.period)}` : `Detail: ${selectedAccountForDetail} for ${formatPeriodForDisplay(filters.period)}`}
                    </h3>
                    {viewMode === 'detail' && (
                        <button onClick={handleReturnToSummary} className="secondary action-button">
                            <i className="fas fa-arrow-left"></i> Back to Summary
                        </button>
                    )}
                </div>

                <div className="table-responsive">
                    {viewMode === 'summary' ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>Account Name</th>
                                    <th>Type</th>
                                    <th style={{textAlign: 'right'}}>Total Debit (CHF)</th>
                                    <th style={{textAlign: 'right'}}>Total Credit (CHF)</th>
                                    <th style={{textAlign: 'right'}}>Net Movement (CHF)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summaryData.length > 0 ? summaryData.map(row => (
                                    <tr key={row.accountName} onClick={() => handleDrillDown(row.accountName)} style={{cursor: 'pointer'}} title={`Click to view details for ${row.accountName}`}>
                                        <td>{row.accountName}</td>
                                        <td>{row.type}</td>
                                        <td style={{textAlign: 'right'}}>{formatNumber(row.debits, 2)}</td>
                                        <td style={{textAlign: 'right'}}>{formatNumber(row.credits, 2)}</td>
                                        <td style={{textAlign: 'right'}}>{formatNumber(row.net, 2)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={5} className="no-data-message">No data for summary view based on current filters.</td></tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th><th>Bonus ID</th><th>Entity</th><th>Description</th>
                                    <th style={{textAlign: 'right'}}>Debit (CHF)</th><th style={{textAlign: 'right'}}>Credit (CHF)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detailViewEntries.length > 0 ? detailViewEntries.sort((a, b) => (parseDate(a.date)?.getTime() ?? 0) - (parseDate(b.date)?.getTime() ?? 0)).map(entry => (
                                    <tr key={entry.id}>
                                        <td>{formatDate(parseDate(entry.date))}</td><td>{entry.bonusId}</td><td>{entry.entity}</td><td>{entry.description}</td>
                                        <td style={{textAlign: 'right'}}>{entry.drCr === 'Debit' ? formatNumber(entry.amountCHF, 2) : ''}</td>
                                        <td style={{textAlign: 'right'}}>{entry.drCr === 'Credit' ? formatNumber(entry.amountCHF, 2) : ''}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="no-data-message">No detailed entries for this account.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>
        </div>
    );
};

export default AccountingDashboard;