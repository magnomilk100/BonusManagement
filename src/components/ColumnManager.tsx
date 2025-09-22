
import React, { useState, useRef, useEffect } from 'react';
import { HRColumnConfig, SortableBonusKey } from '../types';
import BaseModal from './common/BaseModal';

interface ColumnManagerProps {
    isOpen: boolean;
    onClose: () => void;
    columnConfig: {
        visibleKeys: SortableBonusKey[];
        orderedColumns: HRColumnConfig[];
    };
    onConfigChange: (newConfig: { visibleKeys: SortableBonusKey[], orderedColumns: HRColumnConfig[] }) => void;
    defaultColumns: HRColumnConfig[];
}

const ColumnManager: React.FC<ColumnManagerProps> = ({ isOpen, onClose, columnConfig, onConfigChange, defaultColumns }) => {
    const [visibleKeys, setVisibleKeys] = useState(new Set(columnConfig.visibleKeys));
    const [orderedColumns, setOrderedColumns] = useState(columnConfig.orderedColumns);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        setVisibleKeys(new Set(columnConfig.visibleKeys));
        setOrderedColumns(columnConfig.orderedColumns);
    }, [columnConfig]);

    const handleToggleVisibility = (key: SortableBonusKey) => {
        const newVisibleKeys = new Set(visibleKeys);
        if (newVisibleKeys.has(key)) {
            newVisibleKeys.delete(key);
        } else {
            newVisibleKeys.add(key);
        }
        setVisibleKeys(newVisibleKeys);
    };

    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnter = (e: React.DragEvent<HTMLLIElement>, index: number) => {
        dragOverItem.current = index;
        const list = [...orderedColumns];
        const draggedItemContent = list[dragItem.current!];
        if (draggedItemContent) {
            list.splice(dragItem.current!, 1);
            list.splice(dragOverItem.current!, 0, draggedItemContent);
            dragItem.current = dragOverItem.current;
            setOrderedColumns(list);
        }
    };

    const handleDragEnd = () => {
        dragItem.current = null;
        dragOverItem.current = null;
    };

    const handleSaveChanges = () => {
        onConfigChange({
            visibleKeys: Array.from(visibleKeys),
            orderedColumns: orderedColumns
        });
        onClose();
    };

    const handleResetToDefault = () => {
        const defaultVisibleKeys = new Set(defaultColumns.map(c => c.key));
        setVisibleKeys(defaultVisibleKeys);
        setOrderedColumns(defaultColumns);
    };

    const footerContent = (
        <>
            <button type="button" className="secondary action-button" onClick={handleResetToDefault}>
                <i className="fas fa-undo" aria-hidden="true"></i> Reset to Default
            </button>
            <button type="button" className="secondary action-button" onClick={onClose}>
                <i className="fas fa-times" aria-hidden="true"></i> Cancel
            </button>
            <button type="button" className="primary action-button" onClick={handleSaveChanges}>
                <i className="fas fa-save" aria-hidden="true"></i> Save Changes
            </button>
        </>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Manage Table Columns"
            footerContent={footerContent}
            modalId="column-manager-modal"
            maxWidth="600px"
        >
            <p>Check columns to show them. Drag and drop to reorder.</p>
            <ul className="column-manager-list">
                {orderedColumns.map((col, index) => (
                    <li
                        key={col.key}
                        className="column-manager-item"
                        draggable={!col.isAlwaysVisible}
                        onDragStart={(e) => col.isAlwaysVisible ? e.preventDefault() : handleDragStart(e, index)}
                        onDragEnter={(e) => col.isAlwaysVisible ? e.preventDefault() : handleDragEnter(e, index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnd={handleDragEnd}
                    >
                        <i className={`fas ${col.isAlwaysVisible ? 'fa-lock' : 'fa-grip-vertical'} column-drag-handle`} aria-hidden="true"></i>
                        <input
                            type="checkbox"
                            id={`col-toggle-${col.key}`}
                            checked={visibleKeys.has(col.key) || col.isAlwaysVisible}
                            onChange={() => handleToggleVisibility(col.key)}
                            disabled={col.isAlwaysVisible}
                        />
                        <label htmlFor={`col-toggle-${col.key}`}>{col.label}</label>
                    </li>
                ))}
            </ul>
        </BaseModal>
    );
};

export default ColumnManager;