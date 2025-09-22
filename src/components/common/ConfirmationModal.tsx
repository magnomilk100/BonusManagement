
import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (inputText?: string) => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    requiresInput?: boolean;
    inputLabel?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    requiresInput = false,
    inputLabel = 'Please provide a reason:',
}) => {
    const [inputText, setInputText] = useState('');

    useEffect(() => {
        if (isOpen) {
            setInputText(''); // Reset on open
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (requiresInput && !inputText.trim()) {
            return; // Or show an error
        }
        onConfirm(inputText);
    };

    const footer = (
        <div className="button-group" style={{ justifyContent: 'flex-end', width: '100%', marginBottom: 0 }}>
            <button type="button" className="secondary action-button" onClick={onClose}>
                <i className="fas fa-times-circle" aria-hidden="true"></i> {cancelText}
            </button>
            <button
                type="button"
                className="primary action-button"
                onClick={handleConfirm}
                autoFocus
                disabled={requiresInput && !inputText.trim()}
            >
                <i className="fas fa-check-circle" aria-hidden="true"></i> {confirmText}
            </button>
        </div>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            footerContent={footer}
            modalId="confirmation-modal"
            maxWidth="500px"
        >
            <p>{message}</p>
            {requiresInput && (
                <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
                    <label htmlFor="confirmation-input">{inputLabel}</label>
                    <textarea
                        id="confirmation-input"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        required
                        style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                    />
                </div>
            )}
        </BaseModal>
    );
};

export default ConfirmationModal;
