import React, { useState, useEffect, useRef } from 'react';
import { User, Tab } from '../types';

interface LoginPageProps {
    onLogin: (username: string, pass: string) => User | null;
    setCurrentUser: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, setCurrentUser }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const usernameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        usernameInputRef.current?.focus();
    }, []);

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const user = onLogin(username, password);
        if (user) {
            setCurrentUser(user);
        } else {
            setError("Invalid username or password.");
            setUsername('');
            setPassword('');
            usernameInputRef.current?.focus();
        }
    };
    
    const switchToAdminLogin = () => {
        setUsername('admin');
        setPassword('password123'); // Demo purposes
    };

    return (
        <div className="welcome-page-container">
            <div className="welcome-branding-panel">
                <svg className="bank-logo-image" viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="bankLogoTitle">
                    <title id="bankLogoTitle">Bonus Management - Bank Logo</title>
                    <defs>
                        <linearGradient id="skyGradientLogin" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: 'var(--color-accent-secondary)', stopOpacity: 0.8 }} />
                            <stop offset="100%" style={{ stopColor: 'var(--color-info)', stopOpacity: 0.6 }} />
                        </linearGradient>
                    </defs>
                    <rect x="0" y="0" width="200" height="75" fill="url(#skyGradientLogin)"/>
                    <polygon points="120,75 145,35 170,75" fill="rgba(var(--color-accent-primary-rgb),0.5)"/>
                    <polygon points="150,75 175,45 200,75" fill="rgba(var(--color-accent-primary-rgb),0.7)"/>
                    <rect x="0" y="75" width="200" height="35" fill="rgba(var(--color-accent-secondary-rgb), 0.4)"/>
                    <rect x="15" y="78" width="90" height="25" fill="var(--color-container-lighter)" opacity="0.5"/>
                    <rect x="20" y="80" width="20" height="20" fill="var(--color-border-subtle)" opacity="0.5"/>
                    <rect x="45" y="80" width="20" height="20" fill="var(--color-border-subtle)" opacity="0.5"/>
                    <rect x="70" y="80" width="20" height="20" fill="var(--color-border-subtle)" opacity="0.5"/>
                    <rect x="10" y="70" width="100" height="10" fill="var(--color-border-interactive)"/>
                    <rect x="15" y="25" width="90" height="45" fill="var(--color-background-dark)" stroke="var(--color-border-subtle)" strokeWidth="0.5"/>
                    <rect x="20" y="30" width="20" height="35" fill="var(--color-accent-secondary)"/>
                    <rect x="45" y="30" width="20" height="35" fill="var(--color-accent-secondary)"/>
                    <rect x="70" y="30" width="20" height="35" fill="var(--color-accent-secondary)"/>
                    <rect x="15" y="20" width="90" height="5" fill="var(--color-container-base)" stroke="var(--color-border-subtle)" strokeWidth="0.5"/>
                </svg>
                <svg className="swiss-flag" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-label="Swiss flag">
                    <rect width="32" height="32" fill="#d52b1e"/> {/* Swiss Red */}
                    <polygon points="13,6 19,6 19,13 26,13 26,19 19,19 19,26 13,26 13,19 6,19 6,13 13,13" fill="#fff"/> {/* White Cross */}
                </svg>
                <h1>Bonus Management</h1>
                <p className="tagline">Consolidation & Legal Entity Reporting</p>
            </div>
            <div className="welcome-form-panel">
                <div className="form-container">
                    {error && <p className="form-error-message" role="alert">{error}</p>}
                    <form onSubmit={handleLoginSubmit} className="login-form">
                         <h2 className="login-title"><i className="fas fa-lock" aria-hidden="true"></i> Secure Login</h2>
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input type="text" id="username" ref={usernameInputRef} value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username"/>
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"/>
                        </div>
                        <button type="submit" className="primary login-button"><i className="fas fa-sign-in-alt" aria-hidden="true"></i> Login</button>
                        <div className="admin-access-link">
                             <button type="button" onClick={switchToAdminLogin} className="link-button">
                                <i className="fas fa-user-shield" aria-hidden="true"></i> Quick Admin Access (Demo)
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;