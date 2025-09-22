
import { BonusFormData, User, Notification, GlobalAuditLogEntry } from '../types';
import { initialDemoBonusData, initialDemoUsers } from '../data';
import { generateInitialPeriods } from '../utils';
import { INITIAL_ENTITIES, MASTER_FX_RATES, INITIAL_BONUS_TYPES } from '../constants';

const BONUS_DATA_KEY = 'bonusData_v2_period';
const USERS_KEY = 'users_v2_period';
const NOTIFICATIONS_KEY = 'notifications_v2_period';
const LOCKED_PERIODS_KEY = 'lockedPeriods_v2';
const FINANCIAL_PERIODS_KEY = 'financialPeriods_v1';
const MANAGED_ENTITIES_KEY = 'managedEntities_v1';
const MANAGED_BONUS_TYPES_KEY = 'managedBonusTypes_v1';
const FX_RATES_KEY = 'fxRates_v1';
const GLOBAL_AUDIT_LOG_KEY = 'globalAuditLog_v1';


/**
 * Retrieves global audit log from localStorage.
 * @returns {GlobalAuditLogEntry[]} Array of global audit log entries.
 */
export const getGlobalAuditLog = (): GlobalAuditLogEntry[] => {
    const savedData = localStorage.getItem(GLOBAL_AUDIT_LOG_KEY);
    return savedData ? JSON.parse(savedData) : [];
};

/**
 * Saves global audit log to localStorage.
 * @param {GlobalAuditLogEntry[]} data - Array of global audit log entries to save.
 */
export const saveGlobalAuditLog = (data: GlobalAuditLogEntry[]): void => {
    localStorage.setItem(GLOBAL_AUDIT_LOG_KEY, JSON.stringify(data));
};


/**
 * Retrieves bonus data from localStorage.
 * @returns {BonusFormData[]} Array of bonus data.
 */
export const getBonusData = (): BonusFormData[] => {
    const savedData = localStorage.getItem(BONUS_DATA_KEY);
    return savedData ? JSON.parse(savedData) : initialDemoBonusData;
};

/**
 * Saves bonus data to localStorage.
 * @param {BonusFormData[]} data - Array of bonus data to save.
 */
export const saveBonusData = (data: BonusFormData[]): void => {
    localStorage.setItem(BONUS_DATA_KEY, JSON.stringify(data));
};

/**
 * Retrieves user data from localStorage.
 * @returns {User[]} Array of users.
 */
export const getUsers = (): User[] => {
    const savedUsers = localStorage.getItem(USERS_KEY);
    const users = savedUsers ? JSON.parse(savedUsers) : initialDemoUsers;

    // Migration logic for backward compatibility
    return users.map((user: any) => {
        // NEW MIGRATION: from single 'role' to array 'roles'
        if (user.role && !user.roles) {
            user.roles = [user.role];
            delete user.role;
        }

        if (user.entity && !user.accessibleEntities) {
            user.accessibleEntities = [user.entity];
            delete user.entity;
        } else if (!user.accessibleEntities) {
            // Fallback for older data that might not have either
            user.accessibleEntities = ['Unassigned'];
        }
        return user;
    });
};

/**
 * Saves user data to localStorage.
 * @param {User[]} users - Array of users to save.
 */
export const saveUsers = (users: User[]): void => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

/**
 * Retrieves notifications from localStorage.
 * @returns {Notification[]} Array of notifications.
 */
export const getNotifications = (): Notification[] => {
    const savedNotifications = localStorage.getItem(NOTIFICATIONS_KEY);
    return savedNotifications ? JSON.parse(savedNotifications) : [];
};

/**
 * Saves notifications to localStorage.
 * @param {Notification[]} notifications - Array of notifications to save.
 */
export const saveNotifications = (notifications: Notification[]): void => {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
};

/**
 * Retrieves locked periods from localStorage.
 * @returns {string[]} Array of locked period strings.
 */
export const getLockedPeriods = (): string[] => {
    const savedLockedPeriods = localStorage.getItem(LOCKED_PERIODS_KEY);
    return savedLockedPeriods ? JSON.parse(savedLockedPeriods) : [];
};

/**
 * Saves locked periods to localStorage.
 * @param {string[]} periods - Array of locked period strings to save.
 */
export const saveLockedPeriods = (periods: string[]): void => {
    localStorage.setItem(LOCKED_PERIODS_KEY, JSON.stringify(periods));
};


/**
 * Retrieves the list of manageable financial periods from localStorage.
 * If no periods are saved, it generates an initial set.
 * @returns {string[]} An array of period strings (e.g., "2024-01").
 */
export const getFinancialPeriods = (): string[] => {
    const savedPeriods = localStorage.getItem(FINANCIAL_PERIODS_KEY);
    if (savedPeriods) {
        return JSON.parse(savedPeriods);
    } else {
        const initialPeriods = generateInitialPeriods(12, 6);
        localStorage.setItem(FINANCIAL_PERIODS_KEY, JSON.stringify(initialPeriods));
        return initialPeriods;
    }
};

/**
 * Saves the list of manageable financial periods to localStorage.
 * @param {string[]} periods - The array of period strings to save.
 */
export const saveFinancialPeriods = (periods: string[]): void => {
    localStorage.setItem(FINANCIAL_PERIODS_KEY, JSON.stringify(periods));
};

/**
 * Retrieves managed entities from localStorage, falling back to an initial default set.
 * Filters out the 'Unassigned' entity as it is not a manageable entity.
 * @returns {string[]} Array of manageable entity names.
 */
export const getManagedEntities = (): string[] => {
    const savedEntities = localStorage.getItem(MANAGED_ENTITIES_KEY);
    if (savedEntities) {
        return JSON.parse(savedEntities);
    }
    const initial = INITIAL_ENTITIES.filter(e => e !== 'Unassigned');
    localStorage.setItem(MANAGED_ENTITIES_KEY, JSON.stringify(initial));
    return initial;
};

/**
 * Saves the list of managed entities to localStorage.
 * @param {string[]} entities - The array of entity names to save.
 */
export const saveManagedEntities = (entities: string[]): void => {
    localStorage.setItem(MANAGED_ENTITIES_KEY, JSON.stringify(entities));
};


/**
 * Retrieves managed bonus types from localStorage, falling back to an initial default set.
 * @returns {string[]} Array of manageable bonus type names.
 */
export const getManagedBonusTypes = (): string[] => {
    const savedBonusTypes = localStorage.getItem(MANAGED_BONUS_TYPES_KEY);
    if (savedBonusTypes) {
        return JSON.parse(savedBonusTypes);
    }
    const initial = INITIAL_BONUS_TYPES;
    localStorage.setItem(MANAGED_BONUS_TYPES_KEY, JSON.stringify(initial));
    return initial;
};

/**
 * Saves the list of managed bonus types to localStorage.
 * @param {string[]} types - The array of bonus type names to save.
 */
export const saveManagedBonusTypes = (types: string[]): void => {
    localStorage.setItem(MANAGED_BONUS_TYPES_KEY, JSON.stringify(types));
};


/**
 * Retrieves FX rates from localStorage.
 * @returns {{[key: string]: number}} The FX rates object.
 */
export const getFxRates = (): { [key: string]: number } => {
    const savedRates = localStorage.getItem(FX_RATES_KEY);
    if (savedRates) {
        return JSON.parse(savedRates);
    }
    // No saved rates, use the constant and save it
    localStorage.setItem(FX_RATES_KEY, JSON.stringify(MASTER_FX_RATES));
    return MASTER_FX_RATES;
};

/**
 * Saves FX rates to localStorage.
 * @param rates The FX rates object to save.
 */
export const saveFxRates = (rates: { [key: string]: number }): void => {
    localStorage.setItem(FX_RATES_KEY, JSON.stringify(rates));
};