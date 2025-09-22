





import React, { useState, useEffect } from 'react';
import { BonusFormData, User } from '../types';
import { initialBonusFormDataForForm } from '../constants';
import { formatNumber, formatDate, parseDate, formatDateTime } from '../utils';

interface BonusFormProps {
    onSave: (data: BonusFormData) => void;
    onCancel: () => void;
    initialData?: BonusFormData | null;
    isEditing: boolean;
    currentUser: User | null;
    lockedPeriods: string[]; 
    managedEntities: string[];
    managedCurrencies: string[];
    managedBonusTypes: string[];
}

// Define a type for our errors state for better type safety
type FormErrors = Partial<Record<keyof Omit<BonusFormData, 'auditTrail' | 'clawbackTriggeredDetails'>, string>>;


const BonusForm: React.FC<BonusFormProps> = ({ onSave, onCancel, initialData, isEditing, currentUser, lockedPeriods, managedEntities, managedCurrencies, managedBonusTypes }) => {
    const [formData, setFormData] = useState<Omit<BonusFormData, 'id' | 'inputter' | 'status' | 'lastModifiedDate' > & Partial<Pick<BonusFormData, 'id' | 'inputter' | 'status' | 'lastModifiedDate' | 'auditTrail' | 'employeeDepartureDate' | 'clawbackTriggeredDetails' | 'leaverType'>>>(() => {
        const baseData = initialData ? 
            { ...initialData, auditTrail: initialData.auditTrail || [], reviewerComments: initialData.reviewerComments || '', employeeDepartureDate: initialData.employeeDepartureDate || '', leaverType: initialData.leaverType }
            : { ...initialBonusFormDataForForm };
        
        if (!isEditing && currentUser?.roles.includes('Inputter - Local HR') && currentUser.accessibleEntities.length > 0) {
            return { ...baseData, entity: currentUser.accessibleEntities[0] };
        }
        return baseData;
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isFormLocked, setIsFormLocked] = useState(false);
    const [lockMessage, setLockMessage] = useState<string | null>(null);

    const validateForm = (data: typeof formData): FormErrors => {
        const newErrors: FormErrors = {};

        if (!data.employeeId?.trim()) newErrors.employeeId = 'Employee ID is required.';
        if (!data.firstName?.trim()) newErrors.firstName = 'First name is required.';
        if (!data.lastName?.trim()) newErrors.lastName = 'Last name is required.';
        if (!data.entity) newErrors.entity = 'Entity is required.';
        if (!data.currency) newErrors.currency = 'Currency is required.';
        if (!data.notificationDate) newErrors.notificationDate = 'Notification date is required.';
        if (!data.bonusTypeCategory) newErrors.bonusTypeCategory = 'Bonus type category is required.';
        
        if (!data.amount) {
            newErrors.amount = 'Amount is required.';
        } else if (isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
            newErrors.amount = 'Amount must be a positive number.';
        }

        if (data.notificationDate && data.paymentDate && data.paymentDate < data.notificationDate) {
            newErrors.paymentDate = 'Payment date cannot be before notification date.';
        }

        if (data.hasClawback === 'yes') {
            if (!data.clawbackPeriodMonths) {
                newErrors.clawbackPeriodMonths = 'Clawback period is required when clawback is enabled.';
            } else if (isNaN(Number(data.clawbackPeriodMonths)) || Number(data.clawbackPeriodMonths) <= 0) {
                newErrors.clawbackPeriodMonths = 'Clawback period must be a positive number.';
            }
        }
        
        return newErrors;
    };

    useEffect(() => {
        const baseData = initialData ? 
            { ...initialData, auditTrail: initialData.auditTrail || [], reviewerComments: initialData.reviewerComments || '', employeeDepartureDate: initialData.employeeDepartureDate || '', leaverType: initialData.leaverType }
            : { ...initialBonusFormDataForForm };

        if (!isEditing && currentUser?.roles.includes('Inputter - Local HR') && currentUser.accessibleEntities.length > 0) {
            baseData.entity = currentUser.accessibleEntities[0];
        }
        
        setFormData(baseData);
        setErrors(validateForm(baseData)); // Validate initial data
    }, [initialData, isEditing, currentUser]);

    useEffect(() => {
        if (!currentUser || currentUser.roles.includes('Admin') || currentUser.roles.includes('Reviewer - Group HR')) {
            setIsFormLocked(false);
            setLockMessage(null);
            return;
        }

        const notificationDatePeriod = formData.notificationDate ? formData.notificationDate.substring(0, 7) : null;
        const paymentDatePeriod = formData.paymentDate ? formData.paymentDate.substring(0, 7) : null;
        
        let locked = false;
        let message = "";

        if (notificationDatePeriod && lockedPeriods.includes(notificationDatePeriod)) {
            locked = true;
            message = `The period for the notification date (${formatDate(parseDate(formData.notificationDate))}) is locked.`;
        }
        if (!locked && paymentDatePeriod && lockedPeriods.includes(paymentDatePeriod)) {
            locked = true;
            message = `The period for the payment date (${formatDate(parseDate(formData.paymentDate))}) is locked.`;
        }
        
        setIsFormLocked(locked);
        setLockMessage(locked ? `${message} Changes are restricted.` : null);

    }, [formData.notificationDate, formData.paymentDate, lockedPeriods, currentUser]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            
            if (name === 'employeeDepartureDate') {
                if (value) {
                    // If a departure date is set or changed, and there's no leaver type selected yet,
                    // default to 'Bad Leaver'. This prevents overwriting 'Good Leaver' if already chosen.
                    if (!newData.leaverType) {
                        newData.leaverType = 'Bad Leaver';
                    }
                } else {
                    // If the departure date is cleared, also clear the leaver type.
                    newData.leaverType = undefined;
                }
            }
            
            setErrors(validateForm(newData)); // Re-validate the entire form on each change
            return newData;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const formErrors = validateForm(formData);
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            alert('Please correct the errors before saving.');
            return; // Stop submission
        }

        if (isFormLocked) {
            alert("This record cannot be modified because a relevant period is locked.");
            return;
        }
        
        const completeFormData: BonusFormData = {
            ...initialBonusFormDataForForm, 
            ...formData, 
            id: formData.id || '', 
            status: formData.status || 'Pending Input', 
            inputter: formData.inputter || (currentUser?.username || 'System'), 
            lastModifiedDate: formData.lastModifiedDate || new Date().toISOString(), 
            auditTrail: formData.auditTrail || [], 
            reviewerComments: formData.reviewerComments || '', 
            employeeDepartureDate: formData.employeeDepartureDate || undefined,
            leaverType: formData.leaverType,
            clawbackTriggeredDetails: formData.clawbackTriggeredDetails || undefined,
        };
        onSave(completeFormData);
    };
    
    const entityOptions = (currentUser?.roles.includes('Inputter - Local HR') && currentUser.accessibleEntities.length > 0)
        ? currentUser.accessibleEntities
        : managedEntities;

    const isEntityDisabled = currentUser?.roles.includes('Inputter - Local HR') && !isEditing && currentUser.accessibleEntities.length === 1;
    const formCompletelyDisabled = isFormLocked && !(currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Reviewer - Group HR'));
    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <form onSubmit={handleSubmit} className="bonus-form" aria-labelledby="bonus-form-heading">
            <h3 id="bonus-form-heading" className="visually-hidden">{isEditing ? 'Edit Bonus Details' : 'Add New Bonus'}</h3>
            {lockMessage && <div className="warning-message" role="alert" style={{marginBottom: '1rem'}}>{lockMessage}</div>}
            <fieldset disabled={formCompletelyDisabled} style={{border: 'none', padding: 0, margin: 0}}>
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="employeeId">Employee ID</label>
                        <input type="text" id="employeeId" name="employeeId" value={formData.employeeId || ''} onChange={handleChange} required className={errors.employeeId ? 'is-invalid' : ''} aria-describedby="employeeId-desc employeeId-error"/>
                        {errors.employeeId && <span id="employeeId-error" className="form-field-error">{errors.employeeId}</span>}
                        <small id="employeeId-desc" className="visually-hidden">Enter the employee's unique identifier.</small>
                    </div>
                     <div className="form-group">
                        <label htmlFor="firstName">First Name</label>
                        <input type="text" id="firstName" name="firstName" value={formData.firstName || ''} onChange={handleChange} required className={errors.firstName ? 'is-invalid' : ''} aria-describedby="firstName-error"/>
                        {errors.firstName && <span id="firstName-error" className="form-field-error">{errors.firstName}</span>}
                    </div>
                     <div className="form-group">
                        <label htmlFor="lastName">Last Name</label>
                        <input type="text" id="lastName" name="lastName" value={formData.lastName || ''} onChange={handleChange} required className={errors.lastName ? 'is-invalid' : ''} aria-describedby="lastName-error"/>
                        {errors.lastName && <span id="lastName-error" className="form-field-error">{errors.lastName}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="id">Bonus Record ID</label>
                        <input type="text" id="id" name="id" value={formData.id || ''}
                            readOnly
                            placeholder={isEditing && formData.id ? formData.id : "Auto-generated on save"}
                            aria-describedby="id-desc"
                        />
                        <small id="id-desc" className="visually-hidden">Unique identifier for this bonus record. Auto-generated if new.</small>
                    </div>
                    <div className="form-group">
                        <label htmlFor="isBluebird">Part of Bluebird population</label>
                        <select id="isBluebird" name="isBluebird" value={formData.isBluebird} onChange={handleChange} className={errors.isBluebird ? 'is-invalid' : ''}>
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                        </select>
                        {errors.isBluebird && <span className="form-field-error">{errors.isBluebird}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="entity">Entity</label>
                        <select id="entity" name="entity" value={formData.entity} onChange={handleChange} required disabled={isEntityDisabled || formCompletelyDisabled} className={errors.entity ? 'is-invalid' : ''}>
                            <option value="">Select Entity</option>
                            {entityOptions.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                        {errors.entity && <span className="form-field-error">{errors.entity}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="currency">Currency</label>
                        <select id="currency" name="currency" value={formData.currency} onChange={handleChange} required className={errors.currency ? 'is-invalid' : ''}>
                            <option value="">Select Currency</option>
                            {managedCurrencies.sort().map(curr => <option key={curr} value={curr}>{curr}</option>)}
                        </select>
                        {errors.currency && <span className="form-field-error">{errors.currency}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="isCro">CRO / Non-CRO</label>
                        <select id="isCro" name="isCro" value={formData.isCro} onChange={handleChange} className={errors.isCro ? 'is-invalid' : ''}>
                            <option value="non-cro">Non-CRO</option>
                            <option value="cro">CRO</option>
                        </select>
                         {errors.isCro && <span className="form-field-error">{errors.isCro}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="notificationDate">Bonus Notification Date</label>
                        <input type="date" id="notificationDate" name="notificationDate" value={formData.notificationDate} onChange={handleChange} required className={errors.notificationDate ? 'is-invalid' : ''}/>
                        {errors.notificationDate && <span className="form-field-error">{errors.notificationDate}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="bonusTypeCategory">Type of Bonus (Category)</label>
                        <select id="bonusTypeCategory" name="bonusTypeCategory" value={formData.bonusTypeCategory} onChange={handleChange} required className={errors.bonusTypeCategory ? 'is-invalid' : ''}>
                            <option value="">Select Type</option>
                            {managedBonusTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                        {errors.bonusTypeCategory && <span className="form-field-error">{errors.bonusTypeCategory}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="bonusTypePayment">Type of Bonus (Payment)</label>
                        <select id="bonusTypePayment" name="bonusTypePayment" value={formData.bonusTypePayment} onChange={handleChange} className={errors.bonusTypePayment ? 'is-invalid' : ''}>
                            <option value="cash">Cash</option>
                            <option value="shares">Shares</option>
                        </select>
                        {errors.bonusTypePayment && <span className="form-field-error">{errors.bonusTypePayment}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="amount">Amount</label>
                        <input type="number" id="amount" name="amount" value={formData.amount} onChange={handleChange} step="0.01" required className={errors.amount ? 'is-invalid' : ''} />
                        {errors.amount && <span className="form-field-error">{errors.amount}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="paymentDate">Payment Date</label>
                        <input type="date" id="paymentDate" name="paymentDate" value={formData.paymentDate} onChange={handleChange} className={errors.paymentDate ? 'is-invalid' : ''}/>
                        {errors.paymentDate && <span className="form-field-error">{errors.paymentDate}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="isPaid">Paid</label>
                        <select id="isPaid" name="isPaid" value={formData.isPaid} onChange={handleChange} className={errors.isPaid ? 'is-invalid' : ''}>
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                        </select>
                        {errors.isPaid && <span className="form-field-error">{errors.isPaid}</span>}
                    </div>
                    <fieldset className="form-group form-fieldset" style={{gridColumn: formData.hasClawback === 'yes' ? '1 / -1' : 'auto'}}>
                        <legend className="fieldset-legend">Clawback Information</legend>
                        <div className="form-group">
                            <label htmlFor="hasClawback">Clawback</label>
                            <select id="hasClawback" name="hasClawback" value={formData.hasClawback} onChange={handleChange} className={errors.hasClawback ? 'is-invalid' : ''}>
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                            </select>
                            {errors.hasClawback && <span className="form-field-error">{errors.hasClawback}</span>}
                        </div>
                        {formData.hasClawback === 'yes' && (
                            <>
                                <div className="form-group">
                                    <label htmlFor="clawbackPeriodMonths">Clawback Period (Months from Payment Date)</label>
                                    <input type="number" id="clawbackPeriodMonths" name="clawbackPeriodMonths" value={formData.clawbackPeriodMonths || ''} onChange={handleChange} step="1" className={errors.clawbackPeriodMonths ? 'is-invalid' : ''}/>
                                    {errors.clawbackPeriodMonths && <span className="form-field-error">{errors.clawbackPeriodMonths}</span>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="clawbackType">Clawback Type</label>
                                    <select id="clawbackType" name="clawbackType" value={formData.clawbackType || 'pro-rata'} onChange={handleChange} className={errors.clawbackType ? 'is-invalid' : ''}>
                                        <option value="pro-rata">Pro-rata</option>
                                        <option value="full-refund">Full refund</option>
                                    </select>
                                    {errors.clawbackType && <span className="form-field-error">{errors.clawbackType}</span>}
                                </div>
                            </>
                        )}
                    </fieldset>
                    {isEditing && formData.status && (formData.status.startsWith('Approved')) && (
                        <div className="form-group form-group-highlight" style={{gridColumn: '1 / -1'}}>
                            <label htmlFor="employeeDepartureDate" style={{fontWeight: 'bold'}}>
                                <i className="fas fa-user-times" aria-hidden="true"></i> Employee Departure & Event Processing
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label htmlFor="employeeDepartureDate">Departure Date</label>
                                    <input
                                        type="date"
                                        id="employeeDepartureDate"
                                        name="employeeDepartureDate"
                                        value={formData.employeeDepartureDate || ''}
                                        onChange={handleChange}
                                        aria-describedby="departureDateHelp"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="leaverType">Leaver Type</label>
                                    <select 
                                        id="leaverType" 
                                        name="leaverType" 
                                        value={formData.leaverType || ''} 
                                        onChange={handleChange}
                                        disabled={!formData.employeeDepartureDate}
                                    >
                                        <option value="Bad Leaver">Bad Leaver (Triggers Clawback)</option>
                                        <option value="Good Leaver">Good Leaver (No Clawback)</option>
                                    </select>
                                </div>
                            </div>
                            <small id="departureDateHelp">If an employee departs, enter their departure date and classify the event. Saving will process any applicable changes to amortization or clawback.</small>
                            {formData.clawbackTriggeredDetails && (
                                <div className="clawback-processed-info" role="status">
                                    <p>
                                        <i className="fas fa-check-circle" style={{color: 'green'}} aria-hidden="true"></i> Clawback processed: 
                                        Amount Reversed: {formatNumber(formData.clawbackTriggeredDetails.amountReversed, 2)} {formData.currency}, 
                                        Effective {formatDate(parseDate(formData.clawbackTriggeredDetails.reversalDate))}.
                                    </p>
                                    <p>Original amortized before clawback (up to departure): {formatNumber(formData.clawbackTriggeredDetails.originalTotalAmortizedBeforeClawback, 2)} {formData.currency}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </fieldset>
             {isEditing && formData.auditTrail && formData.auditTrail.length > 0 && (
                <section className="audit-trail-section" aria-labelledby="audit-trail-heading">
                    <h4 id="audit-trail-heading"><i className="fas fa-history" aria-hidden="true"></i> Audit Trail</h4>
                    <ul className="audit-trail-list">
                        {formData.auditTrail.slice().reverse().map((log, index) => ( 
                            <li key={index}>
                                <strong>{formatDateTime(log.timestamp)}</strong> - {log.username} ({log.userId}): {log.action}.
                                {log.details && <span className="audit-details"> Details: {log.details}</span>}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
            <div className="form-actions">
                <button type="submit" className="primary" disabled={formCompletelyDisabled || isFormInvalid}><i className="fas fa-save" aria-hidden="true"></i> {isEditing ? 'Update Bonus' : 'Save Bonus'}</button>
                <button type="button" className="secondary" onClick={onCancel}><i className="fas fa-times-circle" aria-hidden="true"></i> Cancel</button>
            </div>
        </form>
    );
};

export default BonusForm;