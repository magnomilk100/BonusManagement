

import React, { useState, useRef } from 'react';
import BaseModal from './common/BaseModal';
import { User } from '../types';

interface FXRatesDashboardProps {
    fxRates: { [key: string]: number };
    onUpdateRates: (newRates: { [key: string]: number }) => void;
    currentUser: User | null;
}

const FXRatesDashboard: React.FC<FXRatesDashboardProps> = ({ fxRates, onUpdateRates, currentUser }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showUploadInfoModal, setShowUploadInfoModal] = useState(false);
    const isReadOnly = currentUser?.roles.includes('Auditor');

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            try {
                const newRates: { [key: string]: number } = {};
                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) throw new Error("File is empty or missing data rows.");
                
                const header = lines[0].trim().toLowerCase().split('\t');
                if (header.length < 2 || header[0] !== 'currency' || header[1] !== 'rate_to_chf') {
                    throw new Error("Invalid headers. Expected 'currency' and 'rate_to_chf' as the first two tab-separated columns.");
                }

                lines.slice(1).forEach(line => {
                    const [currency, rateStr] = line.split('\t');
                    const rate = parseFloat(rateStr);
                    if (currency && !isNaN(rate)) {
                        newRates[currency.trim().toUpperCase()] = rate;
                    }
                });
                
                if (Object.keys(newRates).length === 0) throw new Error("No valid rates found in file.");
                
                onUpdateRates(newRates);
                alert(`Successfully processed ${Object.keys(newRates).length} FX rates.`);

            } catch (error: any) {
                alert(`Upload failed: ${error.message}`);
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    const handleDownloadTemplate = () => {
        const headers = ['currency', 'rate_to_chf'].join('\t');
        const exampleRow1 = ['USD', '1.10'].join('\t');
        const exampleRow2 = ['EUR', '1.05'].join('\t');
        const content = `${headers}\n${exampleRow1}\n${exampleRow2}`;
        const xlsContent = "data:application/vnd.ms-excel;charset=utf-8," + encodeURIComponent(content);
        const link = document.createElement("a");
        link.setAttribute("href", xlsContent);
        link.setAttribute("download", "fx_rates_template.xls");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <div id="fx-rates-dashboard" className="module-content"> {/* Use .module-content for base styling */}
            <h2><i className="fas fa-coins" aria-hidden="true"></i> FX Rates Management</h2>
            {!isReadOnly && (
                <section className="dashboard-section" aria-labelledby="fx-upload-heading"> {/* Keep dashboard-section for sub-section styling */}
                    <h3 id="fx-upload-heading">Upload FX Rates</h3>
                    <div className="fx-upload-form">
                        <input 
                            type="file" 
                            accept=".txt,.csv" 
                            onChange={handleFileUpload} 
                            aria-label="Upload FX rates file"
                            ref={fileInputRef}
                            id="fxRateFileInput"
                            style={{display: 'none'}} // Hidden, triggered by button
                        />
                        <button type="button" className="primary action-button" onClick={() => fileInputRef.current?.click()} >
                            <i className="fas fa-upload" aria-hidden="true"></i> Select File to Upload
                        </button>
                        <button onClick={() => setShowUploadInfoModal(true)} className="action-button neutral-action" title="Upload Instructions">
                            <i className="fas fa-info-circle" aria-hidden="true"></i>
                        </button>
                        <button onClick={handleDownloadTemplate} className="action-button neutral-action" title="Download Upload Template">
                            <i className="fas fa-download" aria-hidden="true"></i> Download Template
                        </button>
                    </div>
                    
                    <p>Upload a TXT or CSV file with the latest FX rates. The system expects rates where 1 unit of the currency equals X CHF (e.g., 1 USD = 1.10 CHF).</p>
                </section>
            )}

            <section className="dashboard-section" aria-labelledby="current-rates-heading">
                <h3 id="current-rates-heading">Current FX Rates (Base: CHF)</h3>
                <p>The table below shows how many CHF 1 unit of the specified currency is equivalent to.</p>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Currency</th>
                                <th style={{textAlign: 'right'}}>1 Unit of Currency in CHF</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(fxRates).sort(([a], [b]) => a.localeCompare(b)).map(([currency, rateToChf]) => 
                                (
                                    <tr key={currency}>
                                        <td>{currency}</td>
                                        <td style={{textAlign: 'right'}}>{rateToChf.toFixed(4)}</td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>
                 <p style={{marginTop: '1rem', fontSize: '0.9em', fontStyle: 'italic'}}>
                    Note: These are the system's master rates. Financial reports use these for conversions.
                </p>
            </section>
            {showUploadInfoModal && (
                <BaseModal
                    isOpen={showUploadInfoModal}
                    onClose={() => setShowUploadInfoModal(false)}
                    title="FX Rate File Upload Instructions"
                    modalId="fx-upload-info-modal"
                    maxWidth="600px"
                >
                    <div className="info-modal-content">
                        <h4>File Format</h4>
                        <p>Please upload a <code>.txt</code> or <code>.csv</code> file. The file must use a <strong>Tab</strong> as the column delimiter.</p>
                        <p>The first line must be a header row with the exact column names: <code>currency</code> and <code>rate_to_chf</code>. The order matters.</p>
                        
                        <h4>Example File Content:</h4>
                        <pre style={{
                            backgroundColor: 'var(--page-background)', 
                            padding: '1rem', 
                            borderRadius: 'var(--border-radius-sm)',
                            border: '1px solid var(--border-color-subtle)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all'
                        }}>
                            <code>
{`currency\trate_to_chf
USD\t1.10
EUR\t1.05
ILS\t0.30`}
                            </code>
                        </pre>
                    </div>
                </BaseModal>
            )}
        </div>
    );
};

export default FXRatesDashboard;