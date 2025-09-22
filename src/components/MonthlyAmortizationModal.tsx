

import React, { useMemo } from 'react';
import { AmortizationDetail } from '../types';
import { formatNumber, formatDate, addMonths, getMonthEnd, daysBetween } from '../utils';
import BaseModal from './common/BaseModal';

interface MonthlyAmortizationModalProps {
    detail: AmortizationDetail | null;
    onClose: () => void;
}

const MonthlyAmortizationModal: React.FC<MonthlyAmortizationModalProps> = ({ detail, onClose }) => {
    
    const schedule = useMemo(() => {
        if (!detail) return [];

        const items: { date: string, amount: number, cumulative: number }[] = [];
        let cumulativeAmount = 0;
        let currentMonthStart = new Date(Date.UTC(detail.amortizationStartDate.getUTCFullYear(), detail.amortizationStartDate.getUTCMonth(), 1));

        while (currentMonthStart <= detail.amortizationEndDate) {
            const currentMonthEnd = getMonthEnd(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth());
            
            const effectiveDayStart = detail.amortizationStartDate > currentMonthStart ? detail.amortizationStartDate : currentMonthStart;
            const effectiveDayEnd = detail.amortizationEndDate < currentMonthEnd ? detail.amortizationEndDate : currentMonthEnd;

            let amountForThisMonth = 0;
            if (effectiveDayEnd >= effectiveDayStart) {
                const daysInMonthForBonus = daysBetween(effectiveDayStart, effectiveDayEnd);
                amountForThisMonth = daysInMonthForBonus * detail.dailyAmortization;
            }

            cumulativeAmount += amountForThisMonth;
            
            items.push({
                date: `${currentMonthStart.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })} ${currentMonthStart.getUTCFullYear()}`,
                amount: amountForThisMonth,
                cumulative: cumulativeAmount,
            });

            currentMonthStart = addMonths(currentMonthStart, 1);
        }
        
        // Final rounding adjustment
        if (items.length > 0) {
            const roundingDiff = detail.totalContractualAmortization - items[items.length - 1].cumulative;
            if (Math.abs(roundingDiff) > 0.001) {
                items[items.length - 1].amount += roundingDiff;
                items[items.length - 1].cumulative += roundingDiff;
            }
        }
        
        return items;
    }, [detail]);
    
    if (!detail) return null;

    const footerContent = (
        <button type="button" className="secondary action-button" onClick={onClose}>
            <i className="fas fa-times-circle" aria-hidden="true"></i> Close
        </button>
    );

    return (
        <BaseModal
            isOpen={!!detail}
            onClose={onClose}
            title={`Amortization Schedule (ID: ${detail.bonusId})`}
            footerContent={footerContent}
            modalId="monthly-amortization-modal"
            maxWidth="600px"
        >
            <p>
                <strong>Bonus ID:</strong> {detail.bonusId}<br/>
                <strong>Employee ID:</strong> {detail.employeeId}<br/>
                <strong>Total Amount:</strong> {formatNumber(detail.bonusAmount, 2)} {detail.currency}<br/>
                <strong>Amortization Period:</strong> {formatDate(detail.amortizationStartDate)} to {formatDate(detail.amortizationEndDate)} ({detail.totalDaysAmortization} days)
            </p>
            <div className="table-responsive" style={{ maxHeight: '50vh' }}>
                <table className="amortization-breakdown-modal-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th style={{ textAlign: 'right' }}>Monthly Amount ({detail.currency})</th>
                            <th style={{ textAlign: 'right' }}>Cumulative Amount ({detail.currency})</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schedule.map((item, index) => (
                            <tr key={index}>
                                <td>{item.date}</td>
                                <td style={{ textAlign: 'right' }}>{formatNumber(item.amount, 2)}</td>
                                <td style={{ textAlign: 'right' }}>{formatNumber(item.cumulative, 2)}</td>
                            </tr>
                        ))}
                    </tbody>
                     <tfoot>
                        <tr>
                            <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>Final Total:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatNumber(detail.totalContractualAmortization, 2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </BaseModal>
    );
};

export default MonthlyAmortizationModal;
