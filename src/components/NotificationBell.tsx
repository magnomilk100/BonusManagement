
import React, { useState, useEffect, useRef } from 'react';
import { Notification } from '../types';
import { formatDateTime } from '../utils';

interface NotificationBellProps {
    notifications: Notification[];
    onMarkAsRead: (notificationId: string) => void;
    onMarkAllAsRead: () => void;
    onClearAll: () => void;
    onNotificationClick: (notification: Notification) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ notifications, onMarkAsRead, onMarkAllAsRead, onClearAll, onNotificationClick }) => {
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const bellRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation(); // Prevent event from bubbling up to document listener immediately
      setIsOpen(!isOpen);
    }
    const closeDropdown = () => setIsOpen(false);

    const handleItemClick = (notification: Notification) => {
        onNotificationClick(notification); 
        if (!notification.isRead) {
            onMarkAsRead(notification.id);
        }
        closeDropdown();
    }

    return (
        <div className="notification-bell-container" ref={bellRef}>
            <button
                className="notification-bell-button"
                onClick={toggleDropdown}
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label={`Notifications (${unreadCount} unread)`}
            >
                <i className="fas fa-bell"></i>
                {unreadCount > 0 && <span className="notification-badge" aria-hidden="true">{unreadCount}</span>}
            </button>
            {isOpen && (
                <div className="notification-dropdown" role="dialog" aria-labelledby="notification-heading">
                    <header className="notification-header">
                        <h4 id="notification-heading">Notifications</h4>
                        <button onClick={closeDropdown} className="close-notification-dropdown" aria-label="Close notifications">
                            <i className="fas fa-times" aria-hidden="true"></i>
                        </button>
                    </header>
                    {notifications.length === 0 ? (
                        <p className="no-notifications">No notifications.</p>
                    ) : (
                        <ul className="notification-list">
                            {notifications.slice().reverse().map(notification => (
                                <li
                                    key={notification.id}
                                    className={`notification-item ${notification.isRead ? '' : 'unread'} notification-type-${notification.type}`}
                                    onClick={() => handleItemClick(notification)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { handleItemClick(notification)}}}
                                    role="menuitem"
                                    tabIndex={0}
                                >
                                    <div className="notification-content">
                                        <p>{notification.message}</p>
                                        <small>{formatDateTime(notification.timestamp)}</small>
                                    </div>
                                    {!notification.isRead && (
                                        <button
                                            className="mark-as-read-btn"
                                            onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id); }}
                                            title="Mark as read"
                                            aria-label={`Mark notification "${notification.message}" as read`}
                                        >
                                            <i className="fas fa-check-circle" aria-hidden="true"></i>
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    {notifications.length > 0 && (
                        <div className="notification-actions">
                             <button 
                                onClick={(e) => { e.stopPropagation(); onMarkAllAsRead();}} 
                                disabled={unreadCount === 0} 
                                aria-label="Mark all notifications as read"
                             >
                                <i className="fas fa-check-double" aria-hidden="true"></i> Mark All Read
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClearAll();
                                }} 
                                aria-label="Clear all notifications"
                            >
                                <i className="fas fa-trash-alt" aria-hidden="true"></i> Clear All
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;