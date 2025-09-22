import React, { useEffect, useRef, ReactNode } from 'react';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footerContent?: ReactNode;
    modalId: string;
    maxWidth?: string;
}

const BaseModal: React.FC<BaseModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footerContent,
    modalId,
    maxWidth = '800px' 
}) => {
    const modalContentRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            // Focus the modal content or the close button when it opens
            // Allow a tick for the modal to render before focusing
            setTimeout(() => {
                closeButtonRef.current?.focus(); 
            }, 0);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby={`${modalId}-title`}>
            <div 
                className="modal-content" 
                ref={modalContentRef} 
                tabIndex={-1} 
                style={{ maxWidth: maxWidth }}
            >
                <div className="modal-header">
                    <h3 id={`${modalId}-title`}>{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="close-modal-button" 
                        aria-label={`Close ${title} modal`} 
                        ref={closeButtonRef}
                    >
                        <i className="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                {footerContent && (
                    <div className="modal-footer">
                        {footerContent}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BaseModal;
