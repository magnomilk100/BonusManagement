import React from 'react';
import { BonusFormData } from '../types';
import { formatNumber, formatDate, formatDateTime, parseDate } from '../utils';
import BaseModal from './common/BaseModal'; // Import BaseModal

interface BonusDetailModalProps {
    bonus: BonusFormData | null;
    onClose: () => void;
}

const BonusDetailModal: React.FC<BonusDetailModalProps> = ({ bonus, onClose }) => {
    if (!bonus) return null;

    const footerContent = (
        <button type="button" className="secondary action-button" onClick={onClose}>
            <i className="fas fa-times-circle" aria-hidden="true"></i> Close
        </button>
    );

    return (
        <BaseModal
            isOpen={!!bonus}
            onClose={onClose}
            title={`Bonus Details (ID: ${bonus.id})`}
            footerContent={footerContent}
            modalId="bonus-detail-modal"
            maxWidth="700px"
        >
            <div className="bonus-detail-grid">
                <p><strong>Employee ID:</strong> {bonus.employeeId}</p>
                <p><strong>First Name:</strong> {bonus.firstName}</p>
                <p><strong>Last Name:</strong> {bonus.lastName}</p>
                <p><strong>Entity:</strong> {bonus.entity}</p>
                <p><strong>Currency:</strong> {bonus.currency}</p>
                <p><strong>Amount:</strong> {formatNumber(bonus.amount, 2)}</p>
                <p><strong>Bluebird:</strong> {bonus.isBluebird}</p>
                <p><strong>CRO/Non-CRO:</strong> {bonus.isCro}</p>
                <p><strong>Notification Date:</strong> {formatDate(parseDate(bonus.notificationDate))}</p>
                <p><strong>Payment Date:</strong> {formatDate(parseDate(bonus.paymentDate))}</p>
                <p><strong>Bonus Category:</strong> {bonus.bonusTypeCategory}</p>
                <p><strong>Bonus Payment Type:</strong> {bonus.bonusTypePayment}</p>
                <p><strong>Paid:</strong> {bonus.isPaid}</p>
                <p><strong>Status:</strong> {bonus.status}</p>
                <p><strong>Has Clawback:</strong> {bonus.hasClawback}</p>
                {bonus.hasClawback === 'yes' && (
                    <>
                        <p><strong>Clawback Period:</strong> {bonus.clawbackPeriodMonths || 'N/A'} months</p>
                        <p><strong>Clawback Type:</strong> {bonus.clawbackType || 'N/A'}</p>
                    </>
                )}
                {bonus.employeeDepartureDate && <p><strong>Employee Departure Date:</strong> {formatDate(parseDate(bonus.employeeDepartureDate))}</p>}
                {bonus.clawbackTriggeredDetails && (
                    <div className="clawback-processed-info" style={{ gridColumn: '1 / -1' }}>
                        <p><strong>Clawback Processed:</strong> Yes</p>
                        <p><strong>Amount Reversed:</strong> {formatNumber(bonus.clawbackTriggeredDetails.amountReversed, 2)} {bonus.currency}</p>
                        <p><strong>Reversal Date:</strong> {formatDate(parseDate(bonus.clawbackTriggeredDetails.reversalDate))}</p>
                        <p><strong>Reason:</strong> {bonus.clawbackTriggeredDetails.reason}</p>
                        <p><strong>Original Amortized Before Clawback:</strong> {formatNumber(bonus.clawbackTriggeredDetails.originalTotalAmortizedBeforeClawback, 2)} {bonus.currency}</p>
                    </div>
                )}
                <p style={{ gridColumn: '1 / -1' }}><strong>Inputter:</strong> {bonus.inputter}</p>
                <p style={{ gridColumn: '1 / -1' }}><strong>Last Modified:</strong> {formatDateTime(bonus.lastModifiedDate)}</p>
                {bonus.reviewerComments && <p style={{ gridColumn: '1 / -1' }}><strong>Reviewer Comments:</strong> {bonus.reviewerComments}</p>}
            </div>
            {bonus.auditTrail && bonus.auditTrail.length > 0 && (
                <section className="audit-trail-section" aria-labelledby="audit-trail-modal-heading" style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: 'transparent' }}>
                    <h4 id="audit-trail-modal-heading" style={{ fontSize: '1rem' }}><i className="fas fa-history" aria-hidden="true"></i> Audit Trail</h4>
                    <ul className="audit-trail-list" style={{ maxHeight: '150px' }}>
                        {bonus.auditTrail.slice().reverse().map((log, index) => (
                            <li key={index}>
                                <strong>{formatDateTime(log.timestamp)}</strong> - {log.username} ({log.userId}): {log.action}.
                                {log.details && <span className="audit-details"> Details: {log.details}</span>}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </BaseModal>
    );
};

export default BonusDetailModal;