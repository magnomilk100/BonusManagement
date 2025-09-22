import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { ToastMessage, ToastType } from '../types';

interface ToastContextType {
    addToast: (message: string, type: ToastType) => void;
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    }, []);

    const value = { toasts, addToast, removeToast };

    return (
        <ToastContext.Provider value={value}>
            {children}
        </ToastContext.Provider>
    );
};
