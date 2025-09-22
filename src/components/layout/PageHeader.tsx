
import React from 'react';
import { Tab, User, Notification } from '../../types';
import NotificationBell from '../NotificationBell';
import { formatPeriodForDisplay } from '../../utils';

interface PageHeaderProps {
    activeTab: Tab | null;
    currentUser: User;
    originalUser: User | null;
    selectedPeriod: string;
    userNotifications: Notification[];
    onMarkNotificationAsRead: (notificationId: string) => void;
    onMarkAllNotificationsAsRead: () => void;
    onClearAllNotifications: () => void;
    onNotificationClick: (notification: Notification) => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    activeTab,
    currentUser,
    originalUser,
    selectedPeriod,
    userNotifications,
    onMarkNotificationAsRead,
    onMarkAllNotificationsAsRead,
    onClearAllNotifications,
    onNotificationClick,
}) => {
    const getPageTitle = (currentTab: Tab | null): string => {
        const baseTitle = (() => {
            switch (currentTab) {
                case 'overview': return 'Overview';
                case 'hr': return 'HR Bonus Management';
                case 'finance': return 'Finance Dashboard';
                case 'fxrates': return 'FX Rates Management';
                case 'admin': return 'Admin Dashboard';
                default: return 'Bonus Management';
            }
        })();

        if (originalUser && currentUser) {
            return `${currentUser.username} (Impersonated ${originalUser.username}) - ${baseTitle} - ${formatPeriodForDisplay(selectedPeriod)}`;
        }
        
        return `${baseTitle} - ${formatPeriodForDisplay(selectedPeriod)}`;
    };


    return (
        <>
            {originalUser && (
                <div className="impersonation-banner">
                    <span>Currently impersonating: <strong>{currentUser.username}</strong> ({currentUser.roles.join(' / ')} of {currentUser.accessibleEntities.join(', ')}) from your account: {originalUser.username}</span>
                </div>
            )}
            <header className="page-header-controls">
                <div className="header-left-group">
                    <h2 className="page-title-area">{getPageTitle(activeTab)}</h2>
                </div>
                <div className="header-actions-group">
                    <NotificationBell
                        notifications={userNotifications}
                        onMarkAsRead={onMarkNotificationAsRead}
                        onMarkAllAsRead={onMarkAllNotificationsAsRead}
                        onClearAll={onClearAllNotifications}
                        onNotificationClick={onNotificationClick}
                    />
                </div>
            </header>
        </>
    );
};

export default PageHeader;