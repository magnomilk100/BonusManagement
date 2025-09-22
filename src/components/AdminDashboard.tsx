
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, UserRole, GlobalAuditLogEntry, AuditDashboardState } from '../types';
import { USER_ROLES } from '../constants';
import { groupAndSortPeriods, formatPeriodForDisplay, getYearOptions, getMonthOptions, getCurrentPeriod } from '../utils';
import AuditDashboard from './AuditDashboard';

interface AdminDashboardProps {
    users: User[];
    onAddUser: (user: Omit<User, 'id'>) => void;
    onUpdateUser: (userId: string, updates: Partial<Omit<User, 'id' | 'username'>>) => void;
    onDeleteUser: (userId: string) => void;
    onImpersonateUser: (userId: string) => void;
    currentUser: User | null;
    originalUser: User | null; 
    lockedPeriods: string[];
    financialPeriods: string[];
    onAddPeriod: (period: string) => void;
    onDeletePeriod: (period: string) => void;
    onLockPeriod: (period: string) => void;
    onUnlockPeriod: (period: string) => void;
    managedEntities: string[];
    onAddEntity: (name: string) => void;
    onUpdateEntity: (oldName: string, newName: string) => void;
    onDeleteEntity: (name: string) => void;
    managedBonusTypes: string[];
    onAddBonusType: (name: string) => void;
    onUpdateBonusType: (oldName: string, newName: string) => void;
    onDeleteBonusType: (name: string) => void;
    fxRates: { [key: string]: number };
    onAddCurrency: (currency: string) => void;
    onUpdateCurrency: (oldCurrency: string, newCurrency: string) => void;
    onDeleteCurrency: (currency: string) => void;
    auditLog: GlobalAuditLogEntry[];
    auditState: AuditDashboardState;
    setAuditState: React.Dispatch<React.SetStateAction<AuditDashboardState>>;
}

const EntitySelector: React.FC<{
    selectedEntities: string[];
    onChange: (entities: string[]) => void;
    allEntities: string[];
    idPrefix: string;
    disabled?: boolean;
}> = ({ selectedEntities, onChange, allEntities, idPrefix, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);
    
    const handleCheckboxChange = (entity: string) => {
        const newSelection = selectedEntities.includes(entity)
          ? selectedEntities.filter(e => e !== entity)
          : [...selectedEntities, entity];
        onChange(newSelection.sort());
    };

    const sortedAllEntities = useMemo(() => [...allEntities].sort((a, b) => a.localeCompare(b)), [allEntities]);

    const displayValue = selectedEntities.length === 0
        ? "Select entities..."
        : selectedEntities.length === 1
        ? selectedEntities[0]
        : `${selectedEntities.length} entities selected`;

    return (
        <div className="entity-selector-wrapper" ref={wrapperRef}>
            <label id={`${idPrefix}-label`} className="entity-selector-label">Accessible Entities</label>
            <button 
                type="button" 
                className="entity-selector-button" 
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-labelledby={`${idPrefix}-label`}
                disabled={disabled}
            >
                <span>{displayValue}</span>
                <i className={`fas fa-chevron-down entity-selector-caret ${isOpen ? 'open' : ''}`} aria-hidden="true"></i>
            </button>
            {isOpen && (
                <div className="entity-selector-dropdown" role="listbox" aria-labelledby={`${idPrefix}-label`}>
                    <div className="entity-selector-grid">
                        {sortedAllEntities.map(entity => (
                            <div key={entity} className="entity-selector-item">
                                <input
                                    type="checkbox"
                                    id={`${idPrefix}-${entity}`}
                                    name={entity}
                                    checked={selectedEntities.includes(entity)}
                                    onChange={() => handleCheckboxChange(entity)}
                                />
                                <label htmlFor={`${idPrefix}-${entity}`}>{entity}</label>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const RoleSelector: React.FC<{
    selectedRoles: UserRole[];
    onChange: (roles: UserRole[]) => void;
    allRoles: UserRole[];
    idPrefix: string;
    disabled?: boolean;
}> = ({ selectedRoles, onChange, allRoles, idPrefix, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);
    
    const handleCheckboxChange = (role: UserRole) => {
        const newSelection = selectedRoles.includes(role)
          ? selectedRoles.filter(r => r !== role)
          : [...selectedRoles, role];
        onChange(newSelection);
    };

    const displayValue = selectedRoles.length === 0
        ? "Select roles..."
        : selectedRoles.join(', ');

    return (
        <div className="entity-selector-wrapper" ref={wrapperRef}>
            <label id={`${idPrefix}-label`} className="entity-selector-label">Roles</label>
            <button 
                type="button" 
                className="entity-selector-button" 
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-labelledby={`${idPrefix}-label`}
                disabled={disabled}
            >
                <span style={{color: selectedRoles.length === 0 ? 'var(--text-tertiary-color)' : 'inherit'}}>{displayValue}</span>
                <i className={`fas fa-chevron-down entity-selector-caret ${isOpen ? 'open' : ''}`} aria-hidden="true"></i>
            </button>
            {isOpen && (
                <div className="entity-selector-dropdown" role="listbox" aria-labelledby={`${idPrefix}-label`}>
                    <div className="entity-selector-grid">
                        {allRoles.map(role => (
                            <div key={role} className="entity-selector-item">
                                <input
                                    type="checkbox"
                                    id={`${idPrefix}-${role.replace(/\s/g, '-')}`}
                                    name={role}
                                    checked={selectedRoles.includes(role)}
                                    onChange={() => handleCheckboxChange(role)}
                                />
                                <label htmlFor={`${idPrefix}-${role.replace(/\s/g, '-')}`}>{role}</label>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    users, onAddUser, onUpdateUser, onDeleteUser, onImpersonateUser, currentUser, originalUser,
    lockedPeriods, financialPeriods, onAddPeriod, onDeletePeriod, onLockPeriod, onUnlockPeriod,
    managedEntities, onAddEntity, onUpdateEntity, onDeleteEntity,
    managedBonusTypes, onAddBonusType, onUpdateBonusType, onDeleteBonusType,
    fxRates, onAddCurrency, onUpdateCurrency, onDeleteCurrency,
    auditLog, auditState, setAuditState
}) => {
    const [adminTab, setAdminTab] = useState<'users' | 'periods' | 'entities' | 'bonusTypes' | 'fx' | 'audit'>(currentUser?.roles.includes('Auditor') ? 'audit' : 'users');

    // State for New User Form
    const [newUserUsername, setNewUserUsername] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRoles, setNewUserRoles] = useState<UserRole[]>([]);
    const [newUserAccessibleEntities, setNewUserAccessibleEntities] = useState<string[]>([]); 

    // State for Editing User Form
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editUserRoles, setEditUserRoles] = useState<UserRole[]>([]);
    const [editUserAccessibleEntities, setEditUserAccessibleEntities] = useState<string[]>([]);
    const [editUserPassword, setEditUserPassword] = useState('');

    // State for Adding New Period Form
    const currentPeriodDate = new Date(getCurrentPeriod() + '-01');
    const [newPeriodYear, setNewPeriodYear] = useState(String(currentPeriodDate.getFullYear()));
    const [newPeriodMonth, setNewPeriodMonth] = useState(String(currentPeriodDate.getMonth() + 1).padStart(2, '0'));
    
    // State for Collapsible Period Groups
    const [expandedYears, setExpandedYears] = useState<Set<string>>(() => new Set([String(new Date().getFullYear())]));
    
    // State for Entity Management
    const [newEntityName, setNewEntityName] = useState('');
    const [editingEntity, setEditingEntity] = useState<{ name: string; newName: string } | null>(null);

    // State for Bonus Type Management
    const [newBonusTypeName, setNewBonusTypeName] = useState('');
    const [editingBonusType, setEditingBonusType] = useState<{ name: string; newName: string } | null>(null);

    // State for FX Management
    const [newCurrencyName, setNewCurrencyName] = useState('');
    const [editingCurrency, setEditingCurrency] = useState<{ name: string; newName: string } | null>(null);

    const isReadOnly = currentUser?.roles.includes('Auditor');


    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserUsername || !newUserPassword || newUserRoles.length === 0) {
            alert("Username, password, and at least one role are required.");
            return;
        }
        if (users.find(u => u.username.toLowerCase() === newUserUsername.toLowerCase())) {
            alert("Username already exists.");
            return;
        }
        onAddUser({ username: newUserUsername, password: newUserPassword, roles: newUserRoles, accessibleEntities: newUserAccessibleEntities });
        setNewUserUsername('');
        setNewUserPassword('');
        setNewUserRoles([]);
        setNewUserAccessibleEntities([]);
    };

    const handleStartEditUser = (user: User) => {
        setEditingUser(user);
        setEditUserRoles(user.roles);
        setEditUserAccessibleEntities(user.accessibleEntities);
        setEditUserPassword(''); 
    };

    const handleUpdateUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        if (editUserRoles.length === 0) {
            alert("User must have at least one role.");
            return;
        }
        const updates: Partial<Omit<User, 'id' | 'username'>> = {
            roles: editUserRoles,
            accessibleEntities: editUserAccessibleEntities,
        };
        if (editUserPassword) { 
            updates.password = editUserPassword;
        }
        onUpdateUser(editingUser.id, updates);
        setEditingUser(null);
        setEditUserPassword('');
    };
    
    const requestDeleteUser = (userId: string) => {
        if (currentUser && userId === currentUser.id) {
            alert("You cannot delete your own account.");
            return;
        }
        onDeleteUser(userId); 
    };
    
    const handleAddPeriod = (e: React.FormEvent) => {
        e.preventDefault();
        const periodToAdd = `${newPeriodYear}-${newPeriodMonth}`;
        onAddPeriod(periodToAdd);
    };

    const toggleYearExpansion = (year: string) => {
        setExpandedYears(prev => {
            const newSet = new Set(prev);
            if (newSet.has(year)) {
                newSet.delete(year);
            } else {
                newSet.add(year);
            }
            return newSet;
        });
    };

    const handleAddEntity = (e: React.FormEvent) => {
        e.preventDefault();
        onAddEntity(newEntityName);
        setNewEntityName('');
    };

    const handleStartEditEntity = (name: string) => {
        setEditingEntity({ name, newName: name });
    };

    const handleSaveEntityEdit = () => {
        if (!editingEntity) return;
        onUpdateEntity(editingEntity.name, editingEntity.newName);
        setEditingEntity(null);
    };

    const handleAddBonusType = (e: React.FormEvent) => {
        e.preventDefault();
        onAddBonusType(newBonusTypeName);
        setNewBonusTypeName('');
    };

    const handleStartEditBonusType = (name: string) => {
        setEditingBonusType({ name, newName: name });
    };

    const handleSaveBonusTypeEdit = () => {
        if (!editingBonusType) return;
        onUpdateBonusType(editingBonusType.name, editingBonusType.newName);
        setEditingBonusType(null);
    };

    const handleAddCurrency = (e: React.FormEvent) => {
        e.preventDefault();
        onAddCurrency(newCurrencyName);
        setNewCurrencyName('');
    };

    const handleStartEditCurrency = (name: string) => {
        setEditingCurrency({ name, newName: name });
    };

    const handleSaveCurrencyEdit = () => {
        if (!editingCurrency) return;
        onUpdateCurrency(editingCurrency.name, editingCurrency.newName);
        setEditingCurrency(null);
    };

    const groupedPeriods = useMemo(() => groupAndSortPeriods(financialPeriods), [financialPeriods]);
    const sortedYears = useMemo(() => Object.keys(groupedPeriods).sort((a, b) => b.localeCompare(a)), [groupedPeriods]);
    const managedCurrencies = useMemo(() => Object.keys(fxRates).sort(), [fxRates]);


    return (
        <div id="admin-dashboard" className="module-content"> 
            <h2><i className="fas fa-user-shield" aria-hidden="true"></i> Admin Dashboard</h2>

            <div className="admin-tabs">
                {currentUser?.roles.includes('Admin') && (
                    <>
                        <button onClick={() => setAdminTab('users')} className={`admin-tab-button ${adminTab === 'users' ? 'active' : ''}`}>Manage Users</button>
                        <button onClick={() => setAdminTab('periods')} className={`admin-tab-button ${adminTab === 'periods' ? 'active' : ''}`}>Manage Periods</button>
                        <button onClick={() => setAdminTab('entities')} className={`admin-tab-button ${adminTab === 'entities' ? 'active' : ''}`}>Manage Entities</button>
                        <button onClick={() => setAdminTab('bonusTypes')} className={`admin-tab-button ${adminTab === 'bonusTypes' ? 'active' : ''}`}>Manage Bonus Types</button>
                        <button onClick={() => setAdminTab('fx')} className={`admin-tab-button ${adminTab === 'fx' ? 'active' : ''}`}>Manage FX Currencies</button>
                    </>
                )}
                 <button onClick={() => setAdminTab('audit')} className={`admin-tab-button ${adminTab === 'audit' ? 'active' : ''}`}>Audit Log</button>
            </div>

            {adminTab === 'users' && currentUser?.roles.includes('Admin') && (
                <>
                    <section className="dashboard-section" aria-labelledby="add-user-heading"> 
                        <h3 id="add-user-heading" className="admin-section-title"><i className="fas fa-user-plus" aria-hidden="true"></i> Create New User</h3>
                        <form onSubmit={handleAddUser} className="admin-form"> 
                            <fieldset disabled={isReadOnly}>
                                <div className="form-grid" style={{gridTemplateColumns: '1fr 1fr'}}>
                                    <div className="form-group">
                                        <label htmlFor="newUserUsername">Username</label>
                                        <input type="text" id="newUserUsername" value={newUserUsername} onChange={e => setNewUserUsername(e.target.value)} required />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="newUserPassword">Password</label>
                                        <input type="password" id="newUserPassword" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="form-grid" style={{gridTemplateColumns: '1fr 1fr'}}>
                                    <div className="form-group">
                                        <RoleSelector
                                            selectedRoles={newUserRoles}
                                            onChange={setNewUserRoles}
                                            allRoles={USER_ROLES}
                                            idPrefix="new-user-role"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <EntitySelector
                                            selectedEntities={newUserAccessibleEntities}
                                            onChange={setNewUserAccessibleEntities}
                                            allEntities={managedEntities}
                                            idPrefix="new-user-entity"
                                        />
                                    </div>
                                </div>
                                <div className="form-actions" style={{justifyContent: 'flex-start', marginTop: '10px'}}> 
                                    <button type="submit" className="primary action-button" disabled={isReadOnly}><i className="fas fa-plus" aria-hidden="true"></i> Add User</button>
                                </div>
                            </fieldset>
                        </form>
                    </section>

                    {editingUser && (
                        <section className="dashboard-section" aria-labelledby="edit-user-heading">
                            <h3 id="edit-user-heading" className="admin-section-title"><i className="fas fa-user-edit" aria-hidden="true"></i> Edit User: {editingUser.username}</h3>
                             <form onSubmit={handleUpdateUser} className="admin-form">
                                <fieldset disabled={isReadOnly}>
                                    <div className="form-grid" style={{gridTemplateColumns: '1fr 1fr'}}>
                                        <div className="form-group">
                                            <label htmlFor="editUserPassword">New Password (optional)</label>
                                            <input type="password" id="editUserPassword" value={editUserPassword} onChange={e => setEditUserPassword(e.target.value)} placeholder="Leave blank to keep current password" />
                                        </div>
                                        <div className="form-group">
                                            <RoleSelector
                                                selectedRoles={editUserRoles}
                                                onChange={setEditUserRoles}
                                                allRoles={USER_ROLES}
                                                idPrefix="edit-user-role"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <EntitySelector
                                            selectedEntities={editUserAccessibleEntities}
                                            onChange={setEditUserAccessibleEntities}
                                            allEntities={managedEntities}
                                            idPrefix="edit-user-entity"
                                        />
                                    </div>
                                    <div className="form-actions" style={{ marginTop: '10px' }}>
                                        <button type="submit" className="primary action-button" disabled={isReadOnly}><i className="fas fa-save" aria-hidden="true"></i> Save Changes</button>
                                        <button type="button" className="secondary action-button" onClick={() => setEditingUser(null)}><i className="fas fa-times" aria-hidden="true"></i> Cancel</button>
                                    </div>
                                </fieldset>
                            </form>
                        </section>
                    )}

                    <section className="dashboard-section" aria-labelledby="manage-users-heading">
                        <h3 id="manage-users-heading" className="admin-section-title"><i className="fas fa-users" aria-hidden="true"></i> Manage Existing Users</h3>
                        <div className="table-responsive">
                            <table> 
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Roles</th>
                                        <th>Accessible Entities</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id}>
                                            <td>{user.username}</td>
                                            <td>{user.roles.join(', ')}</td>
                                            <td>{user.accessibleEntities.join(', ')}</td>
                                            <td className="actions-cell">
                                                <button onClick={() => handleStartEditUser(user)} className="action-button edit" title="Edit User" disabled={isReadOnly}>
                                                    <i className="fas fa-edit" aria-hidden="true"></i>
                                                </button>
                                                <button 
                                                    onClick={() => requestDeleteUser(user.id)} 
                                                    className="action-button delete" 
                                                    title="Delete User"
                                                    disabled={currentUser?.id === user.id || isReadOnly}
                                                >
                                                    <i className="fas fa-trash-alt" aria-hidden="true"></i>
                                                </button>
                                                 <button 
                                                    onClick={() => onImpersonateUser(user.id)} 
                                                    className="action-button revision" 
                                                    title={`Impersonate ${user.username}`}
                                                    disabled={currentUser?.id === user.id || !!originalUser || isReadOnly} 
                                                >
                                                    <i className="fas fa-user-secret" aria-hidden="true"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}

            {adminTab === 'periods' && currentUser?.roles.includes('Admin') && (
                <section className="dashboard-section" aria-labelledby="manage-periods-heading">
                    <h3 id="manage-periods-heading" className="admin-section-title"><i className="fas fa-calendar-alt" aria-hidden="true"></i> Manage Reporting Periods</h3>
                    <p>Locking a period prevents further data modifications for non-Admin/Group HR users that affect that period's calculations.</p>
                    
                    <form onSubmit={handleAddPeriod} className="add-period-form">
                        <fieldset disabled={isReadOnly} style={{border: 'none', padding: 0, margin: 0, display: 'contents'}}>
                            <div className="form-group">
                                <label htmlFor="newPeriodYear">Year</label>
                                <select id="newPeriodYear" value={newPeriodYear} onChange={e => setNewPeriodYear(e.target.value)}>
                                    {getYearOptions(5).map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                             <div className="form-group">
                                <label htmlFor="newPeriodMonth">Month</label>
                                <select id="newPeriodMonth" value={newPeriodMonth} onChange={e => setNewPeriodMonth(e.target.value)}>
                                    {getMonthOptions().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="primary action-button" disabled={isReadOnly}><i className="fas fa-plus-circle" aria-hidden="true"></i> Add Period</button>
                        </fieldset>
                    </form>

                    {sortedYears.map(year => {
                        const isExpanded = expandedYears.has(year);
                        return (
                            <div key={year} className="period-year-group">
                                <button
                                    className="period-year-header"
                                    onClick={() => toggleYearExpansion(year)}
                                    aria-expanded={isExpanded}
                                    aria-controls={`period-list-${year}`}
                                >
                                    <h4>{year}</h4>
                                    <i className={`fas fa-chevron-down ${isExpanded ? '' : 'fa-rotate-270'}`} aria-hidden="true"></i>
                                </button>
                                {isExpanded && (
                                    <div className="period-management-list" id={`period-list-${year}`}>
                                        {groupedPeriods[year].map(period => {
                                            const isLocked = lockedPeriods.includes(period);
                                            return (
                                                <div key={period} className="period-management-item">
                                                    <span className="period-name">{formatPeriodForDisplay(period)}</span>
                                                    <span className={`period-status status-${isLocked ? 'locked' : 'open'}`}>{isLocked ? 'Locked' : 'Open'}</span>
                                                    <div className="actions-cell">
                                                        {isLocked ? (
                                                            <button onClick={() => onUnlockPeriod(period)} className="action-button secondary btn-sm" title={`Unlock ${formatPeriodForDisplay(period)}`} disabled={isReadOnly}>
                                                                <i className="fas fa-unlock" aria-hidden="true"></i> Unlock
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => onLockPeriod(period)} className="action-button primary btn-sm" title={`Lock ${formatPeriodForDisplay(period)}`} disabled={isReadOnly}>
                                                                <i className="fas fa-lock" aria-hidden="true"></i> Lock
                                                            </button>
                                                        )}
                                                        <button onClick={() => onDeletePeriod(period)} className="action-button delete btn-sm" title={`Delete ${formatPeriodForDisplay(period)}`} disabled={isLocked || isReadOnly}>
                                                            <i className="fas fa-trash-alt" aria-hidden="true"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </section>
            )}

            {adminTab === 'entities' && currentUser?.roles.includes('Admin') && (
                <section className="dashboard-section" aria-labelledby="manage-entities-heading">
                    <h3 id="manage-entities-heading" className="admin-section-title"><i className="fas fa-building" aria-hidden="true"></i> Manage Entities</h3>
                    <p>Add, edit, or remove legal entities used for user access and bonus records.</p>
                    
                    <form onSubmit={handleAddEntity} className="add-period-form" style={{ alignItems: 'center' }}>
                         <fieldset disabled={isReadOnly} style={{border: 'none', padding: 0, margin: 0, display: 'contents'}}>
                            <div className="form-group" style={{ flexGrow: 1, marginBottom: 0 }}>
                                <label htmlFor="newEntityName">New Entity Name</label>
                                <input type="text" id="newEntityName" value={newEntityName} onChange={e => setNewEntityName(e.target.value)} required />
                            </div>
                            <button type="submit" className="primary action-button" disabled={isReadOnly}><i className="fas fa-plus-circle" aria-hidden="true"></i> Add Entity</button>
                        </fieldset>
                    </form>

                    <div className="table-responsive" style={{ marginTop: '2rem' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Entity Name</th>
                                    <th style={{width: '200px'}}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {managedEntities.map(entity => (
                                    <tr key={entity}>
                                        <td>
                                            {editingEntity?.name === entity ? (
                                                <input 
                                                    type="text" 
                                                    value={editingEntity.newName}
                                                    onChange={e => setEditingEntity({...editingEntity, newName: e.target.value})}
                                                    className="inline-edit-input"
                                                    autoFocus
                                                />
                                            ) : (
                                                entity
                                            )}
                                        </td>
                                        <td className="actions-cell">
                                            {editingEntity?.name === entity ? (
                                                <>
                                                    <button onClick={handleSaveEntityEdit} className="action-button approve btn-sm" title="Save">
                                                        <i className="fas fa-check" aria-hidden="true"></i> Save
                                                    </button>
                                                    <button onClick={() => setEditingEntity(null)} className="action-button cancel-button btn-sm" title="Cancel">
                                                        <i className="fas fa-times" aria-hidden="true"></i> Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleStartEditEntity(entity)} className="action-button edit btn-sm" title="Edit Entity" disabled={isReadOnly}>
                                                        <i className="fas fa-edit" aria-hidden="true"></i> Edit
                                                    </button>
                                                    <button onClick={() => onDeleteEntity(entity)} className="action-button delete btn-sm" title="Delete Entity" disabled={isReadOnly}>
                                                        <i className="fas fa-trash-alt" aria-hidden="true"></i> Delete
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {adminTab === 'bonusTypes' && currentUser?.roles.includes('Admin') && (
                <section className="dashboard-section" aria-labelledby="manage-bonus-types-heading">
                    <h3 id="manage-bonus-types-heading" className="admin-section-title"><i className="fas fa-award" aria-hidden="true"></i> Manage Bonus Types</h3>
                    <p>Add, edit, or remove the categories for types of bonuses.</p>
                    
                    <form onSubmit={handleAddBonusType} className="add-period-form" style={{ alignItems: 'center' }}>
                         <fieldset disabled={isReadOnly} style={{border: 'none', padding: 0, margin: 0, display: 'contents'}}>
                            <div className="form-group" style={{ flexGrow: 1, marginBottom: 0 }}>
                                <label htmlFor="newBonusTypeName">New Bonus Type Name</label>
                                <input type="text" id="newBonusTypeName" value={newBonusTypeName} onChange={e => setNewBonusTypeName(e.target.value)} required />
                            </div>
                            <button type="submit" className="primary action-button" disabled={isReadOnly}><i className="fas fa-plus-circle" aria-hidden="true"></i> Add Bonus Type</button>
                        </fieldset>
                    </form>

                    <div className="table-responsive" style={{ marginTop: '2rem' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Bonus Type Name</th>
                                    <th style={{width: '200px'}}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {managedBonusTypes.map(bonusType => (
                                    <tr key={bonusType}>
                                        <td>
                                            {editingBonusType?.name === bonusType ? (
                                                <input 
                                                    type="text" 
                                                    value={editingBonusType.newName}
                                                    onChange={e => setEditingBonusType({...editingBonusType, newName: e.target.value})}
                                                    className="inline-edit-input"
                                                    autoFocus
                                                />
                                            ) : (
                                                bonusType
                                            )}
                                        </td>
                                        <td className="actions-cell">
                                            {editingBonusType?.name === bonusType ? (
                                                <>
                                                    <button onClick={handleSaveBonusTypeEdit} className="action-button approve btn-sm" title="Save">
                                                        <i className="fas fa-check" aria-hidden="true"></i> Save
                                                    </button>
                                                    <button onClick={() => setEditingBonusType(null)} className="action-button cancel-button btn-sm" title="Cancel">
                                                        <i className="fas fa-times" aria-hidden="true"></i> Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleStartEditBonusType(bonusType)} className="action-button edit btn-sm" title="Edit Bonus Type" disabled={isReadOnly}>
                                                        <i className="fas fa-edit" aria-hidden="true"></i> Edit
                                                    </button>
                                                    <button onClick={() => onDeleteBonusType(bonusType)} className="action-button delete btn-sm" title="Delete Bonus Type" disabled={isReadOnly}>
                                                        <i className="fas fa-trash-alt" aria-hidden="true"></i> Delete
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {adminTab === 'fx' && currentUser?.roles.includes('Admin') && (
                <section className="dashboard-section" aria-labelledby="manage-fx-heading">
                    <h3 id="manage-fx-heading" className="admin-section-title"><i className="fas fa-dollar-sign" aria-hidden="true"></i> Manage FX Currencies</h3>
                    <p>Add, edit, or remove currencies. Rates are managed in the FX Rates dashboard. 'CHF' is the base currency and cannot be edited or deleted.</p>
                    
                    <form onSubmit={handleAddCurrency} className="add-period-form" style={{ alignItems: 'center' }}>
                         <fieldset disabled={isReadOnly} style={{border: 'none', padding: 0, margin: 0, display: 'contents'}}>
                            <div className="form-group" style={{ flexGrow: 1, marginBottom: 0 }}>
                                <label htmlFor="newCurrencyName">New Currency Code (e.g., USD)</label>
                                <input type="text" id="newCurrencyName" value={newCurrencyName} onChange={e => setNewCurrencyName(e.target.value)} required maxLength={3} style={{textTransform: 'uppercase'}} placeholder="3-LETTER CODE" />
                            </div>
                            <button type="submit" className="primary action-button" disabled={isReadOnly}><i className="fas fa-plus-circle" aria-hidden="true"></i> Add Currency</button>
                        </fieldset>
                    </form>

                    <div className="table-responsive" style={{ marginTop: '2rem' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Currency Code</th>
                                    <th style={{width: '200px'}}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {managedCurrencies.map(currency => (
                                    <tr key={currency}>
                                        <td>
                                            {editingCurrency?.name === currency ? (
                                                <input 
                                                    type="text" 
                                                    value={editingCurrency.newName}
                                                    onChange={e => setEditingCurrency({...editingCurrency, newName: e.target.value})}
                                                    className="inline-edit-input"
                                                    autoFocus
                                                    maxLength={3}
                                                    style={{textTransform: 'uppercase'}}
                                                />
                                            ) : (
                                                currency
                                            )}
                                        </td>
                                        <td className="actions-cell">
                                            {editingCurrency?.name === currency ? (
                                                <>
                                                    <button onClick={handleSaveCurrencyEdit} className="action-button approve btn-sm" title="Save">
                                                        <i className="fas fa-check" aria-hidden="true"></i> Save
                                                    </button>
                                                    <button onClick={() => setEditingCurrency(null)} className="action-button cancel-button btn-sm" title="Cancel">
                                                        <i className="fas fa-times" aria-hidden="true"></i> Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleStartEditCurrency(currency)} className="action-button edit btn-sm" title="Edit Currency" disabled={currency === 'CHF' || isReadOnly}>
                                                        <i className="fas fa-edit" aria-hidden="true"></i> Edit
                                                    </button>
                                                    <button onClick={() => onDeleteCurrency(currency)} className="action-button delete btn-sm" title="Delete Currency" disabled={currency === 'CHF' || isReadOnly}>
                                                        <i className="fas fa-trash-alt" aria-hidden="true"></i> Delete
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {adminTab === 'audit' && (
                <AuditDashboard
                    auditLog={auditLog}
                    users={users}
                    state={auditState}
                    setState={setAuditState}
                />
            )}
        </div>
    );
};

export default AdminDashboard;