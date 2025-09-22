
import React, { useState, useMemo, useCallback } from 'react';
import { BonusFormData, User, AmortizationDetail, FinancialDashboardState, MonthlyLiabilityRow, PeriodSummaryRow, AccountingDashboardState } from '../types';
import { formatNumber, formatDate, parseDate, formatPeriodForDisplay, addMonths, formatDateTime, getMonthEnd, monthsBetween, daysBetween } from '../utils';
import { calculateAmortizationDetails, getDailyExpenseRateCalculator } from '../bonusCalculations';
import AccountingDashboard from './AccountingDashboard';
import IFRSDashboard from './IFRSDashboard';
import CalculationBreakdownModal from './CalculationBreakdownModal';
import MonthlyAmortizationModal from './MonthlyAmortizationModal';

interface FinancialDashboardProps {
    bonusData: BonusFormData[];
    currentUser: User | null;
    selectedPeriod: string; 
    financialState: FinancialDashboardState;
    setFinancialState: React.Dispatch<React.SetStateAction<FinancialDashboardState>>;
    fxRates: { [key: string]: number };
    accountingState: AccountingDashboardState;
    setAccountingState: React.Dispatch<React.SetStateAction<AccountingDashboardState>>;
    financialPeriods: string[];
    managedBonusTypes: string[];
}

interface BreakdownItem {
    bonusId: string;
    employeeId: string;
    bonusAmount: number;
    currency: string;
    contributionOrigCcy: number;
    contributionRptCcy: number;
    fxRate: number;
    calculationFormula: string;
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ bonusData, currentUser, selectedPeriod, financialState, setFinancialState, fxRates, accountingState, setAccountingState, financialPeriods, managedBonusTypes }) => {
    const {
        activeSubTab,
        schedulesData,
        generationParams,
        selectedReportCurrency,
        bonusIdFilter,
        globalFinancialFilters,
        logSortConfig
    } = financialState;

    const [breakdownModalData, setBreakdownModalData] = useState<{
        isOpen: boolean;
        title: string;
        items: BreakdownItem[];
        total: number;
        currency: string;
        formula: string;
    } | null>(null);
    const [monthlyAmortizationDetail, setMonthlyAmortizationDetail] = useState<AmortizationDetail | null>(null);

    const convertAmount = useCallback((amount: number, fromCurrency: string, toCurrency: string): number => {
        if (fromCurrency === toCurrency) return amount;
        const rateFromToCHF = fxRates[fromCurrency] || 1; 
        const amountInCHF = amount * rateFromToCHF;
        if (toCurrency === 'CHF') return amountInCHF; 
        const rateToToCHF = fxRates[toCurrency] || 1; 
        if (rateToToCHF === 0) return amountInCHF; 
        return amountInCHF / rateToToCHF;
    }, [fxRates]);

    const amortizationData = useMemo(() => {
        const dataScope = bonusData.filter(bonus => {
             if (currentUser?.roles.includes('Finance Viewer') || currentUser?.roles.includes('Auditor')) {
                if (currentUser.accessibleEntities.length > 0) {
                    return currentUser.accessibleEntities.includes(bonus.entity) && (bonus.status.startsWith('Approved'));
                }
                return false; 
            }
            return bonus.status.startsWith('Approved');
        });

        return dataScope
            .map(bonus => calculateAmortizationDetails(bonus, selectedPeriod))
            .filter((detail): detail is AmortizationDetail => detail !== null);
    }, [bonusData, currentUser, selectedPeriod]);


    const handleGenerateSchedules = () => {
        const filteredForSchedules = amortizationData.filter(detail => {
            const bonus = detail.originalBonusObject;
            if (globalFinancialFilters.entity !== 'all' && bonus.entity !== globalFinancialFilters.entity) return false;
            if (globalFinancialFilters.bonusTypeCategory !== 'all' && bonus.bonusTypeCategory !== globalFinancialFilters.bonusTypeCategory) return false;
            if (globalFinancialFilters.isBluebird !== 'all' && bonus.isBluebird !== globalFinancialFilters.isBluebird) return false;
            if (globalFinancialFilters.isCro !== 'all' && bonus.isCro !== globalFinancialFilters.isCro) return false;
            if (bonusIdFilter.trim() && !bonus.id.toLowerCase().includes(bonusIdFilter.trim().toLowerCase())) return false;
            return true;
        });

        const newGenerationParams = {
            currency: selectedReportCurrency,
            period: selectedPeriod,
            filters: { ...globalFinancialFilters, bonusIdFilter }
        };

        if (filteredForSchedules.length === 0) {
            setFinancialState(prev => ({
                ...prev,
                schedulesData: null,
                generationParams: newGenerationParams
            }));
            return;
        }

        // --- Calculate Monthly Liability Schedule ---
        let minDate: Date | null = null;
        let maxDate: Date | null = null;
        filteredForSchedules.forEach(d => {
            if (!minDate || d.amortizationStartDate < minDate) minDate = d.amortizationStartDate;
            if (!maxDate || d.contractualAmortizationEndDate > maxDate) maxDate = d.contractualAmortizationEndDate;
        });

        const monthlyLiabilitySchedule: MonthlyLiabilityRow[] = [];
        if (minDate && maxDate) {
            let currentMonthStart = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1));
            let openingBalance = 0;

            const dailyCalculators = new Map(filteredForSchedules.map(detail => [
                detail.bonusId,
                getDailyExpenseRateCalculator(detail.originalBonusObject, detail.contractualAmortizationEndDate, detail.bonusAmount)
            ]));

            while (currentMonthStart <= maxDate) {
                let monthlyAmortization = 0;
                let monthlyPayments = 0;
                let monthlyClawbackReceived = 0;
                let monthlyGainLossOnClawback = 0;
                const currentMonthEnd = getMonthEnd(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth());

                filteredForSchedules.forEach(detail => {
                    const approvalDate = detail.approvalDate;
                    if (!approvalDate) return;

                    let amortForMonth = 0;
                    const dailyCalc = dailyCalculators.get(detail.bonusId);
                    if (!dailyCalc) return;
                    
                    let dayInMonth = new Date(currentMonthStart);
                    while (dayInMonth <= currentMonthEnd) {
                        // Amortization expense is only booked from the approval date onwards.
                        if (dayInMonth >= approvalDate && dayInMonth >= detail.amortizationStartDate && dayInMonth <= detail.amortizationEndDate) {
                           amortForMonth += dailyCalc(dayInMonth);
                        }
                        dayInMonth.setUTCDate(dayInMonth.getUTCDate() + 1);
                    }
                    
                    // Catch-up amortization: if this is the approval month, calculate amortization from service start to approval date
                    if (approvalDate >= currentMonthStart && approvalDate <= currentMonthEnd) {
                        let catchUpDate = new Date(detail.amortizationStartDate);
                        while(catchUpDate < approvalDate) {
                            amortForMonth += dailyCalc(catchUpDate);
                            catchUpDate.setUTCDate(catchUpDate.getUTCDate() + 1);
                        }
                    }
                    
                    monthlyAmortization += convertAmount(amortForMonth, detail.currency, selectedReportCurrency);


                    // Payment Calculation
                    if (detail.paymentDate && detail.paymentDate >= currentMonthStart && detail.paymentDate <= currentMonthEnd) {
                        monthlyPayments += convertAmount(detail.bonusAmount, detail.currency, selectedReportCurrency);
                    }
                    
                    const bonus = detail.originalBonusObject;

                    // Clawback Received and Gain/Loss calculation for liability derecognition
                    if (bonus.employeeDepartureDate && detail.isClawbackProcessed && detail.clawbackDetails) {
                        const reversalDate = parseDate(detail.clawbackDetails.reversalDate);
                        if (reversalDate && reversalDate >= currentMonthStart && reversalDate <= currentMonthEnd) {
                            const clawbackReceivedCHF = convertAmount(detail.clawbackDetails.amountReversed, detail.currency, selectedReportCurrency);
                            monthlyClawbackReceived += clawbackReceivedCHF;

                            const totalAmortizedAtDeparture = convertAmount(detail.totalContractualAmortization, detail.currency, selectedReportCurrency);
                            let paymentMadeAtDeparture = 0;
                            const departureDate = parseDate(bonus.employeeDepartureDate);

                            if (bonus.isPaid === 'yes' && detail.paymentDate && departureDate && detail.paymentDate <= departureDate) {
                                paymentMadeAtDeparture = convertAmount(detail.bonusAmount, detail.currency, selectedReportCurrency);
                            }
                            
                            const remainingCarryingValue = paymentMadeAtDeparture - totalAmortizedAtDeparture;
                            const gainLossCHF = clawbackReceivedCHF - remainingCarryingValue;
                            monthlyGainLossOnClawback += gainLossCHF;
                        }
                    }
                });
                
                const totalMovementForClawback = monthlyClawbackReceived - monthlyGainLossOnClawback;

                const closingBalance = openingBalance + monthlyAmortization - monthlyPayments + totalMovementForClawback;

                monthlyLiabilitySchedule.push({
                    month: `${currentMonthStart.getUTCFullYear()}-${(currentMonthStart.getUTCMonth() + 1).toString().padStart(2, '0')}`,
                    openingBalance,
                    monthlyAmortization,
                    monthlyPayments,
                    clawbackReceived: monthlyClawbackReceived,
                    gainLossOnClawback: monthlyGainLossOnClawback,
                    closingBalance
                });

                openingBalance = closingBalance;
                currentMonthStart = addMonths(currentMonthStart, 1);
            }
        }
        
        // --- Calculate Period Amortization Summary ---
        const [selectedYear, selectedMonth] = selectedPeriod.split('-').map(Number);
        const periodSummarySchedule: PeriodSummaryRow[] = filteredForSchedules.map(detail => {
            const selectedPeriodMonthEnd = getMonthEnd(selectedYear, selectedMonth - 1);
            let amountPaid = 0;
            const bonus = detail.originalBonusObject;
            const paymentDate = parseDate(bonus.paymentDate);

            if (bonus.isPaid === 'yes' && paymentDate && paymentDate <= selectedPeriodMonthEnd) {
                amountPaid = parseFloat(bonus.amount);
            }

            let clawbackAmountReceived: number | undefined = undefined;
            let gainLossOnClawback: number | undefined = undefined;

            if (detail.isClawbackProcessed && detail.clawbackDetails) {
                clawbackAmountReceived = convertAmount(detail.clawbackDetails.amountReversed, detail.currency, selectedReportCurrency);
                const totalAmortizedAtDeparture = convertAmount(detail.totalContractualAmortization, detail.currency, selectedReportCurrency);
                
                let paymentMadeAtDeparture = 0;
                const bonusDetailsForPayment = detail.originalBonusObject;
                const bonusPaymentDate = parseDate(bonusDetailsForPayment.paymentDate);
                const departureDate = parseDate(bonusDetailsForPayment.employeeDepartureDate);

                if (bonusDetailsForPayment.isPaid === 'yes' && bonusPaymentDate && departureDate && bonusPaymentDate <= departureDate) {
                    paymentMadeAtDeparture = convertAmount(parseFloat(bonusDetailsForPayment.amount), bonusDetailsForPayment.currency, selectedReportCurrency);
                }

                const remainingCarryingValue = paymentMadeAtDeparture - totalAmortizedAtDeparture;
                gainLossOnClawback = clawbackAmountReceived - remainingCarryingValue;
            }

            return {
                bonusId: detail.bonusId,
                employeeId: detail.employeeId,
                entity: detail.entity,
                bonusAmount: convertAmount(detail.bonusAmount, detail.currency, selectedReportCurrency),
                ltdAmortization: convertAmount(detail.amortizedUpToSelectedPeriodMonth || 0, detail.currency, selectedReportCurrency),
                ytdAmortization: convertAmount(detail.amortizedInSelectedPeriodYearToDate || 0, detail.currency, selectedReportCurrency),
                amountPaid: convertAmount(amountPaid, detail.currency, selectedReportCurrency),
                closingBalance: convertAmount(detail.totalRemainingOnContractAfterSelectedPeriod || 0, detail.currency, selectedReportCurrency),
                clawbackAmountReceived,
                gainLossOnClawback
            };
        });

        setFinancialState(prev => ({
            ...prev,
            schedulesData: {
                monthlyLiability: monthlyLiabilitySchedule,
                periodSummary: periodSummarySchedule,
            },
            generationParams: newGenerationParams
        }));
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFinancialState(prev => ({...prev, globalFinancialFilters: {...prev.globalFinancialFilters, [name]: value}}));
    };
    
    const handleBonusIdFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFinancialState(prev => ({ ...prev, bonusIdFilter: e.target.value }));
    };
    
    const handleReportCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFinancialState(prev => ({ ...prev, selectedReportCurrency: e.target.value }));
    };

    const setActiveSubTab = (tab: 'schedules' | 'log' | 'accounting' | 'ifrs') => {
        setFinancialState(prev => ({ ...prev, activeSubTab: tab }));
    };

    const uniqueEntitiesForFilter = useMemo(() => {
        if (currentUser?.roles.includes('Finance Viewer') || currentUser?.roles.includes('Auditor')) return ['all', ...currentUser.accessibleEntities];
        return ['all', ...new Set(bonusData.map(b => b.entity).filter(e => e && e !== 'Unassigned'))]
    }, [bonusData, currentUser]);
    const uniqueBonusCategoriesForFilter = useMemo(() => ['all', ...managedBonusTypes.sort()], [managedBonusTypes]);

    const logColumns: { key: keyof BonusFormData; label: string; }[] = [
        { key: 'id', label: 'Bonus ID' },
        { key: 'employeeId', label: 'Emp. ID' },
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'entity', label: 'Entity' },
        { key: 'status', label: 'Status' },
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
    
    // Bonus Log Logic
    const handleLogSort = (key: keyof BonusFormData) => {
        setFinancialState(prev => ({
            ...prev,
            logSortConfig: {
                key,
                direction: prev.logSortConfig && prev.logSortConfig.key === key && prev.logSortConfig.direction === 'ascending' ? 'descending' : 'ascending',
            }
        }));
    };

    const getLogSortIndicator = (key: keyof BonusFormData) => {
        if (!logSortConfig || logSortConfig.key !== key) return <i className="fas fa-sort"></i>;
        return logSortConfig.direction === 'ascending' ? <i className="fas fa-sort-up"></i> : <i className="fas fa-sort-down"></i>;
    };

    const sortedLogData = useMemo(() => {
        const dataToSort = [...amortizationData];
        if (logSortConfig) {
            dataToSort.sort((a, b) => {
                const aBonus = a.originalBonusObject;
                const bBonus = b.originalBonusObject;
                const aValue = aBonus[logSortConfig.key];
                const bValue = bBonus[logSortConfig.key];
                let comparison = 0;
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    if (logSortConfig.key === 'amount') comparison = parseFloat(aValue) - parseFloat(bValue);
                    else if (logSortConfig.key.toLowerCase().includes('date')) comparison = (parseDate(aValue)?.getTime() ?? 0) - (parseDate(bValue)?.getTime() ?? 0);
                    else comparison = aValue.localeCompare(bValue);
                } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    comparison = aValue - bValue;
                } else {
                    const valA = aValue ?? '';
                    const valB = bValue ?? '';
                    if (valA < valB) comparison = -1;
                    if (valA > valB) comparison = 1;
                }
                return logSortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        return dataToSort;
    }, [amortizationData, logSortConfig]);

    const handleCellClick = (month: string, metric: keyof Omit<MonthlyLiabilityRow, 'month' | 'openingBalance' | 'closingBalance'>, cellValue: number) => {
        if (cellValue === 0) return; // Don't open modal for zero values
    
        const filteredForSchedules = amortizationData.filter(detail => {
            const bonus = detail.originalBonusObject;
            if (globalFinancialFilters.entity !== 'all' && bonus.entity !== globalFinancialFilters.entity) return false;
            if (globalFinancialFilters.bonusTypeCategory !== 'all' && bonus.bonusTypeCategory !== globalFinancialFilters.bonusTypeCategory) return false;
            if (globalFinancialFilters.isBluebird !== 'all' && bonus.isBluebird !== globalFinancialFilters.isBluebird) return false;
            if (globalFinancialFilters.isCro !== 'all' && bonus.isCro !== globalFinancialFilters.isCro) return false;
            if (bonusIdFilter.trim() && !bonus.id.toLowerCase().includes(bonusIdFilter.trim().toLowerCase())) return false;
            return true;
        });
    
        const [year, monthNum] = month.split('-').map(Number);
        const monthStart = new Date(Date.UTC(year, monthNum - 1, 1));
        const monthEnd = getMonthEnd(year, monthNum - 1);
    
        let title = '';
        let formula = '';
        const items: BreakdownItem[] = [];
        
        switch (metric) {
            case 'monthlyAmortization': {
                title = `Breakdown for Monthly Amortization - ${formatPeriodForDisplay(month)}`;
                formula = `Total is the sum of contributions from all bonuses listed below. Individual bonus contributions for the month are calculated daily based on their specific amortization method and summed up.`;
    
                filteredForSchedules.forEach(detail => {
                    const approvalDate = detail.approvalDate;
                    if (!approvalDate) return;
    
                    let contributionOrigCcy = 0;
                    const dailyCalc = getDailyExpenseRateCalculator(detail.originalBonusObject, detail.contractualAmortizationEndDate, detail.bonusAmount);

                    let firstDayInCalc: Date | null = null;
                    let lastDayInCalc: Date | null = null;

                    const recordDate = (d: Date) => {
                        if (!firstDayInCalc || d < firstDayInCalc) firstDayInCalc = new Date(d);
                        if (!lastDayInCalc || d > lastDayInCalc) lastDayInCalc = new Date(d);
                    };

                    // Normal monthly loop
                    let dayInMonth = new Date(monthStart);
                    while (dayInMonth <= monthEnd) {
                        if (dayInMonth >= approvalDate && dayInMonth >= detail.amortizationStartDate && dayInMonth <= detail.amortizationEndDate) {
                           const expense = dailyCalc(dayInMonth);
                           contributionOrigCcy += expense;
                           if (expense > 0.0001) recordDate(dayInMonth);
                        }
                        dayInMonth.setUTCDate(dayInMonth.getUTCDate() + 1);
                    }
                    
                    // Catch-up loop
                    if (approvalDate >= monthStart && approvalDate <= monthEnd) {
                        let catchUpDate = new Date(detail.amortizationStartDate);
                        while(catchUpDate < approvalDate) {
                            const expense = dailyCalc(catchUpDate);
                            contributionOrigCcy += expense;
                            if (expense > 0.0001) recordDate(catchUpDate);
                            catchUpDate.setUTCDate(catchUpDate.getUTCDate() + 1);
                        }
                    }
    
                    if (contributionOrigCcy > 0.005) { // Threshold to avoid floating point dust
                        const bonus = detail.originalBonusObject;
                        const paymentDate = parseDate(bonus.paymentDate);
                        const hasClawback = bonus.hasClawback === 'yes' && paymentDate && bonus.clawbackPeriodMonths && parseInt(bonus.clawbackPeriodMonths, 10) > 0;
                        const hasProRataClawback = hasClawback && bonus.clawbackType === 'pro-rata';
                        const totalContractualDays = daysBetween(detail.amortizationStartDate, detail.contractualAmortizationEndDate);
                        let calculationFormula = '';

                        if (hasProRataClawback && totalContractualDays > 0) {
                            const sumOfDigits = (totalContractualDays * (totalContractualDays + 1)) / 2;
                            if (sumOfDigits > 0 && firstDayInCalc && lastDayInCalc) {
                                const daysRemainingStart = daysBetween(firstDayInCalc, detail.contractualAmortizationEndDate);
                                const dailyExpenseStart = (detail.bonusAmount * daysRemainingStart) / sumOfDigits;
                        
                                calculationFormula = `S.o.D. Sum = ${formatNumber(sumOfDigits, 0)}. ` +
                                                     `Day 1 exp = (${formatNumber(detail.bonusAmount, 0)} * ${daysRemainingStart} days rem.) / ${formatNumber(sumOfDigits, 0)} ` +
                                                     `= ${formatNumber(dailyExpenseStart, 2)}`;
                            } else {
                                calculationFormula = `Sum-of-Digits on ${formatNumber(detail.bonusAmount, 0)} ${detail.currency} (front-loaded).`;
                            }
                        } else {
                            const dailyRate = totalContractualDays > 0 ? detail.bonusAmount / totalContractualDays : 0;
                            const effectiveDays = dailyRate > 0 ? contributionOrigCcy / dailyRate : 0;
                            calculationFormula = `(${formatNumber(detail.bonusAmount, 2)} / ${totalContractualDays} days) * ${effectiveDays.toFixed(2)} effective days`;
                        }

                        items.push({
                            bonusId: detail.bonusId,
                            employeeId: detail.employeeId,
                            bonusAmount: detail.bonusAmount,
                            currency: detail.currency,
                            contributionOrigCcy,
                            contributionRptCcy: convertAmount(contributionOrigCcy, detail.currency, selectedReportCurrency),
                            fxRate: (fxRates[detail.currency] || 1) / (fxRates[selectedReportCurrency] || 1),
                            calculationFormula,
                        });
                    }
                });
                break;
            }
            case 'monthlyPayments': {
                title = `Breakdown for Payments - ${formatPeriodForDisplay(month)}`;
                formula = `Formula: Sum of bonus payments with a payment date within the month.`;
                filteredForSchedules.forEach(detail => {
                    if (detail.paymentDate && detail.paymentDate >= monthStart && detail.paymentDate <= monthEnd) {
                        const contributionOrigCcy = detail.bonusAmount;
                        items.push({
                            bonusId: detail.bonusId,
                            employeeId: detail.employeeId,
                            bonusAmount: detail.bonusAmount,
                            currency: detail.currency,
                            contributionOrigCcy,
                            contributionRptCcy: convertAmount(contributionOrigCcy, detail.currency, selectedReportCurrency),
                            fxRate: (fxRates[detail.currency] || 1) / (fxRates[selectedReportCurrency] || 1),
                            calculationFormula: 'N/A - Payment Event'
                        });
                    }
                });
                break;
            }
            case 'clawbackReceived':
            case 'gainLossOnClawback': {
                title = `Breakdown for ${metric === 'clawbackReceived' ? 'Clawback Received' : 'Gain/Loss on Clawback'} - ${formatPeriodForDisplay(month)}`;
                formula = metric === 'clawbackReceived' ? `Formula: Sum of cash received from clawbacks with a reversal date within the month.` : `Formula: Difference between clawback received and the carrying value of the written-off liability.`;
    
                filteredForSchedules.forEach(detail => {
                    const bonus = detail.originalBonusObject;
                    if (bonus.employeeDepartureDate && detail.isClawbackProcessed && detail.clawbackDetails) {
                        const reversalDate = parseDate(detail.clawbackDetails.reversalDate);
                        if (reversalDate && reversalDate >= monthStart && reversalDate <= monthEnd) {
                            const clawbackReceivedOrigCcy = detail.clawbackDetails.amountReversed;
                            
                            if(metric === 'clawbackReceived') {
                                items.push({
                                    bonusId: detail.bonusId, employeeId: detail.employeeId, bonusAmount: detail.bonusAmount, currency: detail.currency,
                                    contributionOrigCcy: clawbackReceivedOrigCcy,
                                    contributionRptCcy: convertAmount(clawbackReceivedOrigCcy, detail.currency, selectedReportCurrency),
                                    fxRate: (fxRates[detail.currency] || 1) / (fxRates[selectedReportCurrency] || 1),
                                    calculationFormula: 'N/A - Clawback Event'
                                });
                            } else {
                                const totalAmortizedAtDeparture = detail.totalContractualAmortization;
                                let paymentMadeAtDeparture = 0;
                                const departureDate = parseDate(bonus.employeeDepartureDate);
                                if (bonus.isPaid === 'yes' && detail.paymentDate && departureDate && detail.paymentDate <= departureDate) {
                                    paymentMadeAtDeparture = detail.bonusAmount;
                                }
                                const remainingCarryingValue = paymentMadeAtDeparture - totalAmortizedAtDeparture;
                                const gainLossOrigCcy = clawbackReceivedOrigCcy - remainingCarryingValue;
    
                                 items.push({
                                    bonusId: detail.bonusId, employeeId: detail.employeeId, bonusAmount: detail.bonusAmount, currency: detail.currency,
                                    contributionOrigCcy: gainLossOrigCcy,
                                    contributionRptCcy: convertAmount(gainLossOrigCcy, detail.currency, selectedReportCurrency),
                                    fxRate: (fxRates[detail.currency] || 1) / (fxRates[selectedReportCurrency] || 1),
                                    calculationFormula: `Received - (Paid - Amort.) = ${formatNumber(clawbackReceivedOrigCcy, 2)} - (${formatNumber(paymentMadeAtDeparture, 2)} - ${formatNumber(totalAmortizedAtDeparture, 2)})`
                                });
                            }
                        }
                    }
                });
                break;
            }
        }
        
        setBreakdownModalData({
            isOpen: true,
            title,
            items,
            total: items.reduce((sum, item) => sum + item.contributionRptCcy, 0),
            currency: selectedReportCurrency,
            formula,
        });
    };

    return (
        <div id="financial-dashboard" className="module-content">
            <h2><i className="fas fa-chart-line" aria-hidden="true"></i> Finance Dashboard</h2>

             <div className="sub-module-navigation">
                <button onClick={() => setActiveSubTab('schedules')} className={activeSubTab === 'schedules' ? 'active' : ''}>Amortization Schedules</button>
                <button onClick={() => setActiveSubTab('log')} className={activeSubTab === 'log' ? 'active' : ''}>Bonus Log</button>
                <button onClick={() => setActiveSubTab('accounting')} className={activeSubTab === 'accounting' ? 'active' : ''}>Accounting Ledger</button>
                <button onClick={() => setActiveSubTab('ifrs')} className={activeSubTab === 'ifrs' ? 'active' : ''}>IFRS Guidance</button>
            </div>

            {activeSubTab === 'schedules' && (
                <section className="dashboard-section" aria-labelledby="schedule-generator-heading">
                    <h3 id="schedule-generator-heading" className="admin-section-title"><i className="fas fa-filter" aria-hidden="true"></i> Generate Schedules</h3>
                    <div className="filters-group">
                         <div>
                            <label htmlFor="finBonusIdFilter">Bonus ID:</label>
                            <input type="text" id="finBonusIdFilter" name="bonusIdFilter" value={bonusIdFilter} onChange={handleBonusIdFilterChange} placeholder="Filter by Bonus ID..." />
                        </div>
                        <div>
                            <label htmlFor="finEntityFilter">Entity:</label>
                            <select id="finEntityFilter" name="entity" value={globalFinancialFilters.entity} onChange={handleFilterChange}>
                                {uniqueEntitiesForFilter.map(e => <option key={e} value={e}>{e === 'all' ? 'All Entities' : e}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="finBonusTypeCategoryFilter">Bonus Category:</label>
                            <select id="finBonusTypeCategoryFilter" name="bonusTypeCategory" value={globalFinancialFilters.bonusTypeCategory} onChange={handleFilterChange}>
                                <option value="all">All Categories</option>
                                {uniqueBonusCategoriesForFilter.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="finIsBluebirdFilter">Bluebird:</label>
                            <select id="finIsBluebirdFilter" name="isBluebird" value={globalFinancialFilters.isBluebird} onChange={handleFilterChange}>
                                <option value="all">Any</option><option value="yes">Yes</option><option value="no">No</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="finIsCroFilter">CRO/Non-CRO:</label>
                            <select id="finIsCroFilter" name="isCro" value={globalFinancialFilters.isCro} onChange={handleFilterChange}>
                                <option value="all">Any</option><option value="cro">CRO</option><option value="non-cro">Non-CRO</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="currencySelectorFinancial">Reporting Currency:</label>
                            <select id="currencySelectorFinancial" value={selectedReportCurrency} onChange={handleReportCurrencyChange}>
                                {Object.keys(fxRates).sort().map(curr => <option key={curr} value={curr}>{curr}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="button-group" style={{marginTop: '1rem'}}>
                         <button onClick={handleGenerateSchedules} className="primary action-button">
                            <i className="fas fa-cogs" aria-hidden="true"></i> Generate Schedules
                        </button>
                    </div>

                    {schedulesData && generationParams && (
                        <>
                            <section className="dashboard-section" aria-labelledby="monthly-liability-heading" style={{marginTop: '2rem'}}>
                                <h3 id="monthly-liability-heading">Monthly Liability Schedule ({generationParams.currency})</h3>
                                <div className="table-responsive" style={{maxHeight: '400px'}}>
                                    <table className="financial-table">
                                        <thead>
                                            <tr>
                                                <th>Month</th>
                                                <th className="amount-column">Opening Balance</th>
                                                <th className="amount-column">Monthly Amortization</th>
                                                <th className="amount-column">Payments</th>
                                                <th className="amount-column">Clawback Received</th>
                                                <th className="amount-column">Gain/Loss on Clawback</th>
                                                <th className="amount-column">Closing Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {schedulesData.monthlyLiability.map(row => (
                                                <tr key={row.month}>
                                                    <td>{formatPeriodForDisplay(row.month)}</td>
                                                    <td className="amount-column">{formatNumber(row.openingBalance, 2)}</td>
                                                    <td className={`amount-column ${row.monthlyAmortization !== 0 ? 'clickable-cell' : ''}`} onClick={() => handleCellClick(row.month, 'monthlyAmortization', row.monthlyAmortization)}>{formatNumber(row.monthlyAmortization, 2)}</td>
                                                    <td className={`amount-column ${row.monthlyPayments !== 0 ? 'clickable-cell' : ''}`} onClick={() => handleCellClick(row.month, 'monthlyPayments', row.monthlyPayments)}>{formatNumber(row.monthlyPayments, 2)}</td>
                                                    <td className={`amount-column ${row.clawbackReceived !== 0 ? 'clickable-cell' : ''}`} onClick={() => handleCellClick(row.month, 'clawbackReceived', row.clawbackReceived)}>{formatNumber(row.clawbackReceived, 2)}</td>
                                                    <td className={`amount-column ${row.gainLossOnClawback !== 0 ? 'clickable-cell' : ''}`} onClick={() => handleCellClick(row.month, 'gainLossOnClawback', row.gainLossOnClawback)}>{formatNumber(row.gainLossOnClawback, 2)}</td>
                                                    <td className="amount-column">{formatNumber(row.closingBalance, 2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="dashboard-section" aria-labelledby="period-summary-heading" style={{marginTop: '2rem'}}>
                                <h3 id="period-summary-heading">Period Amortization Summary for {formatPeriodForDisplay(generationParams.period)} ({generationParams.currency})</h3>
                                <div className="table-responsive">
                                    <table className="financial-table">
                                        <thead>
                                            <tr>
                                                <th>Bonus ID</th>
                                                <th>Employee ID</th>
                                                <th>Entity</th>
                                                <th className="amount-column">Bonus Amount</th>
                                                <th className="amount-column">LTD Amortization</th>
                                                <th className="amount-column">YTD Amortization ({generationParams.period.split('-')[0]})</th>
                                                <th className="amount-column">Amount Paid</th>
                                                <th className="amount-column">Remaining to Amortize</th>
                                                <th className="amount-column">Clawback Received</th>
                                                <th className="amount-column">Gain/Loss on Clawback</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {schedulesData.periodSummary.map(row => (
                                                <tr key={row.bonusId}>
                                                    <td>{row.bonusId}</td>
                                                    <td>{row.employeeId}</td>
                                                    <td>{row.entity}</td>
                                                    <td className="amount-column">{formatNumber(row.bonusAmount, 2)}</td>
                                                    <td className={`amount-column ${row.ltdAmortization !== 0 ? 'clickable-cell' : ''}`} onClick={() => setMonthlyAmortizationDetail(amortizationData.find(d => d.bonusId === row.bonusId) || null)}>{formatNumber(row.ltdAmortization, 2)}</td>
                                                    <td className={`amount-column ${row.ytdAmortization !== 0 ? 'clickable-cell' : ''}`} onClick={() => setMonthlyAmortizationDetail(amortizationData.find(d => d.bonusId === row.bonusId) || null)}>{formatNumber(row.ytdAmortization, 2)}</td>
                                                    <td className="amount-column">{formatNumber(row.amountPaid, 2)}</td>
                                                    <td className="amount-column">{formatNumber(row.closingBalance, 2)}</td>
                                                    <td className="amount-column">{typeof row.clawbackAmountReceived === 'number' ? formatNumber(row.clawbackAmountReceived, 2) : 'N/A'}</td>
                                                    <td className="amount-column">{typeof row.gainLossOnClawback === 'number' ? formatNumber(row.gainLossOnClawback, 2) : 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}
                </section>
            )}

            {activeSubTab === 'log' && (
                <section className="dashboard-section" aria-labelledby="bonus-log-details-heading">
                    <h3 id="bonus-log-details-heading"><i className="fas fa-clipboard-list" aria-hidden="true"></i> Bonus Log Details</h3>
                    <div className="table-responsive">
                        <table aria-live="polite">
                             <thead>
                                <tr>
                                    {logColumns.filter(c => c.key !== 'firstName' && c.key !== 'lastName').map(({ key, label }) => (
                                        <th key={key} onClick={() => handleLogSort(key)} scope="col" role="columnheader" aria-sort={logSortConfig?.key === key ? (logSortConfig.direction === 'ascending' ? 'ascending' : 'descending') : 'none'} style={{cursor: 'pointer'}}>
                                            {label} {getLogSortIndicator(key)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedLogData.length > 0 ? sortedLogData.map(detail => {
                                    const bonus = detail.originalBonusObject;
                                    return (
                                        <tr key={bonus.id}>
                                            {logColumns.filter(c => c.key !== 'firstName' && c.key !== 'lastName').map(({ key }) => {
                                                const value = bonus[key];
                                                let cellContent: React.ReactNode;
                                                switch(key) {
                                                    case 'amount': 
                                                        cellContent = formatNumber(value as string, 2);
                                                        break;
                                                    case 'notificationDate':
                                                    case 'paymentDate':
                                                    case 'employeeDepartureDate':
                                                        cellContent = formatDate(parseDate(value as string));
                                                        break;
                                                    case 'lastModifiedDate':
                                                        cellContent = formatDateTime(value as string);
                                                        break;
                                                    case 'hasClawback':
                                                        cellContent = bonus.hasClawback === 'yes'
                                                            ? `${bonus.clawbackPeriodMonths || 'N/A'} mo, ${bonus.clawbackType || 'pro-rata'}`
                                                            : 'No';
                                                        break;
                                                    case 'status':
                                                        const statusClassName = bonus.status.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '');
                                                        cellContent = <span className={`status-cell status-${statusClassName}`}>{bonus.status}</span>;
                                                        break;
                                                    default:
                                                        cellContent = value === null || typeof value === 'undefined' ? 'N/A' : String(value);
                                                }
                                                return (
                                                    <td key={key} style={{textAlign: key === 'amount' ? 'right' : 'left'}}>
                                                        {cellContent}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={logColumns.length - 2} className="no-data-message">No bonus data available for the current filters.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {activeSubTab === 'accounting' && (
                <AccountingDashboard 
                    bonusData={bonusData}
                    fxRates={fxRates}
                    currentUser={currentUser}
                    selectedPeriod={selectedPeriod}
                    accountingState={accountingState}
                    setAccountingState={setAccountingState}
                    financialPeriods={financialPeriods}
                />
            )}
            
            {activeSubTab === 'ifrs' && (
                <IFRSDashboard />
            )}
            
            {breakdownModalData && (
                <CalculationBreakdownModal
                    isOpen={breakdownModalData.isOpen}
                    onClose={() => setBreakdownModalData(null)}
                    title={breakdownModalData.title}
                    items={breakdownModalData.items}
                    total={breakdownModalData.total}
                    currency={breakdownModalData.currency}
                    formula={breakdownModalData.formula}
                />
            )}

            {monthlyAmortizationDetail && (
                <MonthlyAmortizationModal
                    detail={monthlyAmortizationDetail}
                    onClose={() => setMonthlyAmortizationDetail(null)}
                />
            )}
        </div>
    );
};

export default FinancialDashboard;
