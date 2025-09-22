

import { BonusFormData, AmortizationDetail } from './types';
import { parseDate, addMonths, getMonthEnd, monthsBetween, daysBetween } from './utils';

const getApprovalDate = (bonus: BonusFormData): Date | null => {
    if (!bonus.auditTrail || !bonus.status.startsWith('Approved')) return null;

    // Find the most recent approval log entry.
    const approvalLog = [...bonus.auditTrail].reverse().find(log =>
        log.action.toLowerCase().includes('approved') ||
        log.action.toLowerCase().includes('status changed from pending review to approved')
    );

    // If an approval log is found, parse its timestamp. Otherwise, for initial data or edge cases,
    // we can use the last modified date as a fallback if the status is 'Approved'.
    if (approvalLog) {
        return parseDate(approvalLog.timestamp);
    }
    if (bonus.status.startsWith('Approved')) {
        return parseDate(bonus.lastModifiedDate);
    }
    return null;
};


/**
 * Calculates detailed amortization information for a given bonus,
 * including yearly breakdowns and amounts relative to a selected period.
 * This function now uses a day-based calculation for higher precision and supports
 * different amortization patterns for clawback types.
 * @param {BonusFormData} bonus - The bonus data object.
 * @param {string} [selectedPeriod] - Optional. The selected period in "YYYY-MM" format.
 * If provided, calculates amortization up to and remaining after this period.
 * @returns {AmortizationDetail | null} An object with amortization details, or null if essential dates are missing.
 */
export const calculateAmortizationDetails = (bonus: BonusFormData, selectedPeriod?: string): AmortizationDetail | null => {
    if (bonus.bonusTypePayment === 'shares') {
        return null;
    }
    const notificationDate = parseDate(bonus.notificationDate);
    if (!notificationDate) return null;

    const paymentDate = parseDate(bonus.paymentDate);
    const bonusAmount = parseFloat(bonus.amount);
    if (isNaN(bonusAmount)) return null;

    // Amortization starts from the exact notification date.
    const amortizationStartDate = notificationDate;
    let contractualAmortizationEndDate: Date;
    
    const hasClawback = bonus.hasClawback === 'yes' && paymentDate && bonus.clawbackPeriodMonths && parseInt(bonus.clawbackPeriodMonths, 10) > 0;

    if (hasClawback) {
        // Rule 1: With clawback, amortize from notification to the end of the clawback period. End date is exact.
        const clawbackMonths = parseInt(bonus.clawbackPeriodMonths!, 10);
        contractualAmortizationEndDate = addMonths(paymentDate!, clawbackMonths);
    } else {
        // Rule 2: Without clawback, amortize from notification to payment date.
        if (paymentDate && paymentDate >= notificationDate) {
            contractualAmortizationEndDate = paymentDate;
        } else {
            // Fallback if no payment date or it's before notification: amortize over a single day.
            contractualAmortizationEndDate = notificationDate;
        }
    }
    
    // Safety check: if start is after end, cap end date to start date.
    if (amortizationStartDate > contractualAmortizationEndDate) {
        contractualAmortizationEndDate = new Date(amortizationStartDate);
    }

    let effectiveAmortizationEndDate = new Date(contractualAmortizationEndDate); 
    
    // Adjust for early departure (good or bad leaver)
    if ((bonus.leaverType || bonus.clawbackTriggeredDetails) && bonus.employeeDepartureDate) {
        const departureDate = parseDate(bonus.employeeDepartureDate);
        if (departureDate && departureDate < effectiveAmortizationEndDate) {
            effectiveAmortizationEndDate = departureDate;
        }
    }

    const hasProRataClawback = hasClawback && bonus.clawbackType === 'pro-rata';
    const totalContractualDays = daysBetween(amortizationStartDate, contractualAmortizationEndDate);

    // --- Pre-calculate amortization parameters ---
    let straightLineDailyRate = totalContractualDays > 0 ? bonusAmount / totalContractualDays : 0;
    let sumOfDigitsData: { totalDays: number, sum: number } | null = null;
    if (hasProRataClawback && totalContractualDays > 0) {
        sumOfDigitsData = {
            totalDays: totalContractualDays,
            sum: (totalContractualDays * (totalContractualDays + 1)) / 2
        };
    }
    
    // --- Day-by-day calculation loop ---
    const yearlyAmortization: { [year: string]: number } = {};
    let finalTotalAmortization = 0;
    let amortizedUpToSelectedPeriodMonthVal = 0;
    let amortizedInSelectedPeriodYearToDateVal = 0;

    const selPeriodData = selectedPeriod ? {
        year: parseInt(selectedPeriod.split('-')[0]),
        monthEnd: getMonthEnd(parseInt(selectedPeriod.split('-')[0]), parseInt(selectedPeriod.split('-')[1]) - 1)
    } : null;

    if (amortizationStartDate <= effectiveAmortizationEndDate) {
        let currentDate = new Date(amortizationStartDate);
        while (currentDate <= effectiveAmortizationEndDate) {
            let expenseForDay = 0;
            if (sumOfDigitsData && sumOfDigitsData.sum > 0) { // Pro-rata logic
                const daysRemaining = daysBetween(currentDate, contractualAmortizationEndDate);
                expenseForDay = (bonusAmount * daysRemaining) / sumOfDigitsData.sum;
            } else { // Straight-line logic for 'full-refund' or no clawback
                expenseForDay = straightLineDailyRate;
            }

            finalTotalAmortization += expenseForDay;
            const year = currentDate.getUTCFullYear();
            yearlyAmortization[year] = (yearlyAmortization[year] || 0) + expenseForDay;

            if (selPeriodData) {
                if (currentDate <= selPeriodData.monthEnd) {
                    amortizedUpToSelectedPeriodMonthVal += expenseForDay;
                    if (currentDate.getUTCFullYear() === selPeriodData.year) {
                        amortizedInSelectedPeriodYearToDateVal += expenseForDay;
                    }
                }
            }
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
    }
    
    // After loop, calculate remaining values for the period
    let totalRemainingOnContractAfterSelectedPeriodVal = 0;
    let remainingInSelectedPeriodYearAfterMonthVal = 0;
    if (selPeriodData) {
        totalRemainingOnContractAfterSelectedPeriodVal = finalTotalAmortization - amortizedUpToSelectedPeriodMonthVal;
        const yearTotal = yearlyAmortization[selPeriodData.year] || 0;
        remainingInSelectedPeriodYearAfterMonthVal = yearTotal - amortizedInSelectedPeriodYearToDateVal;
    }

    const actualTotalDaysForExpense = daysBetween(amortizationStartDate, effectiveAmortizationEndDate);
    const averageDailyAmortization = actualTotalDaysForExpense > 0 ? finalTotalAmortization / actualTotalDaysForExpense : 0;
    
    return {
        bonusId: bonus.id, employeeId: bonus.employeeId, entity: bonus.entity, currency: bonus.currency,
        bonusAmount: bonusAmount, notificationDate, paymentDate,
        amortizationStartDate, 
        amortizationEndDate: effectiveAmortizationEndDate, 
        contractualAmortizationEndDate: contractualAmortizationEndDate,
        totalDaysAmortization: actualTotalDaysForExpense, 
        dailyAmortization: averageDailyAmortization, // Returning an average rate now
        yearlyAmortization,
        totalContractualAmortization: finalTotalAmortization,
        isClawbackProcessed: !!bonus.clawbackTriggeredDetails,
        clawbackDetails: bonus.clawbackTriggeredDetails ? { ...bonus.clawbackTriggeredDetails, originalAmortizationEndDate: contractualAmortizationEndDate } : undefined,
        originalBonusObject: bonus,
        approvalDate: getApprovalDate(bonus),
        amortizedUpToSelectedPeriodMonth: selectedPeriod ? Math.round(amortizedUpToSelectedPeriodMonthVal * 100) / 100 : undefined,
        amortizedInSelectedPeriodYearToDate: selectedPeriod ? Math.round(amortizedInSelectedPeriodYearToDateVal * 100) / 100 : undefined,
        remainingInSelectedPeriodYearAfterMonth: selectedPeriod ? Math.round(remainingInSelectedPeriodYearAfterMonthVal * 100) / 100 : undefined,
        totalRemainingOnContractAfterSelectedPeriod: selectedPeriod ? Math.round(totalRemainingOnContractAfterSelectedPeriodVal * 100) / 100 : undefined,
    };
};

/**
 * Calculates contractual amortization details, primarily for clawback logic.
 * This focuses on the original contractual terms, irrespective of actual departures or selected periods.
 * This function now uses a day-based calculation.
 * @param {BonusFormData} bonus - The bonus data object.
 * @returns {AmortizationDetail | null} 
 * An object with contractual amortization details, or null if essential dates are missing.
 */
export const calculateAmortizationDetailsForClawback = (bonus: BonusFormData): AmortizationDetail | null => {
    if (bonus.bonusTypePayment === 'shares') {
        return null;
    }
    const notificationDate = parseDate(bonus.notificationDate);
    if (!notificationDate) return null;
    const paymentDate = parseDate(bonus.paymentDate);
    const bonusAmount = parseFloat(bonus.amount);
    if (isNaN(bonusAmount)) return null;

    const amortizationStartDate = notificationDate;
    let contractualAmortizationEndDate: Date;

    const hasClawback = bonus.hasClawback === 'yes' && paymentDate && bonus.clawbackPeriodMonths && parseInt(bonus.clawbackPeriodMonths, 10) > 0;

    if (hasClawback) {
        const clawbackMonths = parseInt(bonus.clawbackPeriodMonths!, 10);
        contractualAmortizationEndDate = addMonths(paymentDate!, clawbackMonths);
    } else {
        if (paymentDate && paymentDate >= notificationDate) {
            contractualAmortizationEndDate = paymentDate;
        } else {
            contractualAmortizationEndDate = notificationDate;
        }
    }
    
    if (amortizationStartDate > contractualAmortizationEndDate) {
        contractualAmortizationEndDate = new Date(amortizationStartDate);
    }

    const totalContractualDaysAmortization = daysBetween(amortizationStartDate, contractualAmortizationEndDate);
    const dailyAmortization = totalContractualDaysAmortization > 0 ? bonusAmount / totalContractualDaysAmortization : 0;

    return {
        bonusId: bonus.id, employeeId: bonus.employeeId, entity: bonus.entity, currency: bonus.currency,
        bonusAmount, notificationDate, paymentDate, amortizationStartDate, 
        amortizationEndDate: contractualAmortizationEndDate,
        contractualAmortizationEndDate: contractualAmortizationEndDate,
        totalDaysAmortization: totalContractualDaysAmortization, 
        dailyAmortization, 
        yearlyAmortization: {}, // Not populated by this specific function as it's for contractual terms
        totalContractualAmortization: bonusAmount,
        isClawbackProcessed: false, // This function describes pre-clawback state
        originalBonusObject: bonus,
        approvalDate: getApprovalDate(bonus),
        // Selected period fields are not relevant for this contractual calculation
    };
};
