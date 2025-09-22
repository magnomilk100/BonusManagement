import React from 'react';
import { formatNumber } from '../utils';
import BaseModal from './common/BaseModal';

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

interface CalculationBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items: BreakdownItem[];
    total: number;
    currency: string;
    formula: string;
}

const CalculationBreakdownModal: React.FC<CalculationBreakdownModalProps> = ({
    isOpen,
    onClose,
    title,
    items,
    total,
    currency,
    formula
}) => {
    if (!isOpen) return null;

    const footerContent = (
        <button type="button" className="secondary action-button" onClick={onClose}>
            <i className="fas fa-times-circle" aria-hidden="true"></i> Close
        </button>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            footerContent={footerContent}
            modalId="calculation-breakdown-modal"
            maxWidth="1100px"
        >
            {formula && <p className="calculation-formula-display"><em>{formula}</em></p>}

            <div className="table-responsive" style={{ maxHeight: '60vh' }}>
                <table className="admin-table calculation-breakdown-table">
                    <thead>
                        <tr>
                            <th>Bonus ID</th>
                            <th>Employee ID</th>
                            <th className="amount-column">Orig. Contribution</th>
                            <th>Orig. Ccy</th>
                            <th className="amount-column">FX Rate Used</th>
                            <th className="amount-column">Contribution ({currency})</th>
                            <th className="formula-column">Calculation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? items.map(item => (
                            <tr key={item.bonusId}>
                                <td>{item.bonusId}</td>
                                <td>{item.employeeId}</td>
                                <td className="amount-column">{formatNumber(item.contributionOrigCcy, 2)}</td>
                                <td>{item.currency}</td>
                                <td className="amount-column">{item.fxRate.toFixed(4)}</td>
                                <td className="amount-column">{formatNumber(item.contributionRptCcy, 2)}</td>
                                <td className="formula-column">{item.calculationFormula}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={7} className="no-data-message">No contributing entries for this calculation.</td></tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total ({currency}):</td>
                            <td className="amount-column" style={{ fontWeight: 'bold' }}>{formatNumber(total, 2)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </BaseModal>
    );
};

export default CalculationBreakdownModal;