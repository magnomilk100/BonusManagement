import React from 'react';
import { AmortizationDetail } from '../types';
import { formatNumber, parseDate, addMonths, daysBetween } from '../utils';
import BaseModal from './common/BaseModal'; // Import BaseModal

interface AmortizationBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    entity: string;
    year: number;
    reportingCurrency: string;
    data: AmortizationDetail[];
    fxRates: { [key: string]: number }; 
    dateRange: { start: string, end: string };
}

const AmortizationBreakdownModal: React.FC<AmortizationBreakdownModalProps> = ({
    isOpen, onClose, entity, year, reportingCurrency, data, fxRates, dateRange
}) => {
    if (!isOpen) return null;
    
    const convertToReportingCurrency = (amount: number, fromCurrency: string): number => {
        if (fromCurrency === reportingCurrency) return amount;
        const rateFromToCHF = fxRates[fromCurrency] || 1;
        const amountInCHF = amount * rateFromToCHF;
        const rateToToCHF = fxRates[reportingCurrency] || 1;
        if (rateToToCHF === 0) return amountInCHF; // Avoid division by zero
        return amountInCHF / rateToToCHF;
    };

    let totalBreakdownValue = 0;
    
    const breakdownItems = data.map(detail => {
        const rangeStart = parseDate(dateRange.start);
        const rangeEnd = parseDate(dateRange.end);
        let valueForPeriodInOriginalCcy = 0;
        
        if(rangeStart && rangeEnd && detail.dailyAmortization > 0) {
            const effectiveStart = detail.amortizationStartDate > rangeStart ? detail.amortizationStartDate : rangeStart;
            const effectiveEnd = detail.amortizationEndDate < rangeEnd ? detail.amortizationEndDate : rangeEnd;
            
            if (effectiveEnd >= effectiveStart) {
                const daysInPeriod = daysBetween(effectiveStart, effectiveEnd);
                valueForPeriodInOriginalCcy = daysInPeriod * detail.dailyAmortization;
            }
        }
        
        const valueForPeriodInReportingCcy = convertToReportingCurrency(valueForPeriodInOriginalCcy, detail.currency);
        totalBreakdownValue += valueForPeriodInReportingCcy;
        return {
            ...detail,
            valueForPeriodInOriginalCcy,
            valueForPeriodInReportingCcy
        };
    }).filter(item => item.valueForPeriodInReportingCcy !== 0);


    const footerContent = (
        <button type="button" className="secondary action-button" onClick={onClose}>
            <i className="fas fa-times-circle" aria-hidden="true"></i> Close
        </button>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Amortization Breakdown: ${entity} - ${year}`}
            footerContent={footerContent}
            modalId="amortization-breakdown-modal"
            maxWidth="900px"
        >
            <p>Showing bonus entries contributing to this period in <strong>{reportingCurrency}</strong> for the year {year}.</p>
            <div className="table-responsive">
                <table className="amortization-breakdown-modal-table">
                    <thead>
                        <tr>
                            <th>Bonus ID</th>
                            <th>Orig. Amount</th>
                            <th>Orig. Ccy</th>
                            <th style={{ textAlign: 'right' }}>Amort. in {year} (Orig. Ccy)</th>
                            <th style={{ textAlign: 'right' }}>Amort. in {year} ({reportingCurrency})</th>
                        </tr>
                    </thead>
                    <tbody>
                        {breakdownItems.length > 0 ? breakdownItems.map(item => (
                            <tr key={item.bonusId}>
                                <td>{item.bonusId}</td>
                                <td>{formatNumber(item.bonusAmount, 2)}</td>
                                <td>{item.currency}</td>
                                <td style={{ textAlign: 'right' }}>{formatNumber(item.valueForPeriodInOriginalCcy, 2)}</td>
                                <td style={{ textAlign: 'right' }}>{formatNumber(item.valueForPeriodInReportingCcy, 2)}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} style={{ textAlign: 'center' }}>No contributing entries found.</td></tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total for {year} in {reportingCurrency}:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatNumber(totalBreakdownValue, 2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </BaseModal>
    );
};

export default AmortizationBreakdownModal;