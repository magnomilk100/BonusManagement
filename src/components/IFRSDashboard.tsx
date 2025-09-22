
import React from 'react';

const IFRSDashboard: React.FC = () => {
    return (
        <div id="ifrs-dashboard" className="module-content"> {/* Use .module-content for base styling */}
            <h2><i className="fas fa-book-open" aria-hidden="true"></i> IFRS Guidance & Reporting</h2>
            <section className="dashboard-section ifrs-guidance-content" aria-labelledby="ifrs-guidance-heading"> {/* Keep dashboard-section for sub-section styling */}
                <h3 id="ifrs-guidance-heading">IFRS 9 & IAS 37 Considerations for Bonuses</h3>
                <p>Accounting for bonuses, especially guaranteed and deferred bonuses with clawback provisions, requires careful consideration under IFRS, primarily IFRS 9 (Financial Instruments) and IAS 37 (Provisions, Contingent Liabilities and Contingent Assets).</p>

                <h4>Key Principles:</h4>
                <ul>
                    <li><strong>Recognition of an Expense and Liability:</strong> A liability and corresponding expense for a bonus should be recognized when the entity has a present obligation (legal or constructive) as a result of a past event, it is probable that an outflow of resources embodying economic benefits will be required to settle the obligation, and a reliable estimate can be made of the amount of the obligation.</li>
                    <li><strong>Guaranteed Bonuses:</strong> If a bonus is guaranteed (i.e., not dependent on future performance or continued employment beyond a notification/vesting period already met), an obligation typically arises when the service related to the bonus is rendered or upon notification if no further service is required. The expense is recognized over the period the employee renders service to earn the bonus.</li>
                    <li><strong>Deferred Bonuses & Vesting:</strong> For bonuses that defer over a period, the expense is generally recognized over the vesting period (service period). If payment is contingent on future events (e.g., continued employment), this affects the timing and measurement.</li>
                    <li><strong>Clawback Provisions:</strong>
                        <ul>
                            <li>A clawback provision is a contractual term that allows the employer to recover a bonus (or part of it) if certain conditions are met (e.g., employee departure within a specified period, misconduct).</li>
                            <li>The existence of a clawback does not necessarily prevent the recognition of the initial expense and liability if the conditions for recognition are met. The clawback is a contingent asset or a reduction of the liability/expense if and when the triggering event occurs and recovery is virtually certain (for contingent asset) or probable (for liability adjustment).</li>
                            <li>When a clawback is triggered and the amount is recovered or recoverable:
                                <ul>
                                    <li>If the bonus was already paid, this leads to the recognition of income (reversal of expense) or a receivable if the amount is to be recovered.</li>
                                    <li>If the bonus was accrued but not paid, the liability is reduced or derecognized.</li>
                                </ul>
                            </li>
                            <li>The probability of clawback might influence the initial measurement of the liability if it's considered part of the expected value of the outflow, though typically the gross amount is accrued and clawback is treated upon occurrence.</li>
                        </ul>
                    </li>
                    <li><strong>Amortization / Spreading of Costs:</strong> The bonus expense should be allocated to the periods in which the employee's services are rendered. For a bonus relating to a specific year (e.g., "Guaranteed Bonus 2024"), the expense is typically accrued over that year. For "Lost Bonuses" or "Replacement Bonuses" meant to compensate for forfeited awards from a previous employer, the amortization period might start from the grant/notification date and spread over the period the employee is committed to stay or the period the bonus is intended to cover.</li>
                    <li><strong>Measurement:</strong> The liability should be measured at the best estimate of the expenditure required to settle the present obligation at the end of the reporting period.</li>
                    <li><strong>Disclosure:</strong> Disclosures should include information about the nature of the bonuses, the accounting policies applied, key assumptions, and carrying amounts of liabilities. Details about significant clawback provisions might also be relevant.</li>
                </ul>

                <h4>Practical Application in this Tool:</h4>
                <ul>
                    <li>The "Amortization Details" table in the Financial Dashboard demonstrates how bonus expenses are spread over relevant periods, including YTD and remaining amounts for the current year.</li>
                    <li>When a clawback is processed (e.g., due to employee departure), the tool calculates the amount reversed. This reversal should be reflected in the financial statements as a reduction of expense in the period the clawback is triggered.</li>
                    <li>The "Status" of a bonus (e.g., "Approved (Clawback Processed)") helps track these events for reporting.</li>
                     <li>The "Accounting" tab provides a simulated general ledger view of these transactions.</li>
                </ul>
                <p><em>Disclaimer: This is a simplified overview for illustrative purposes. Specific accounting treatment depends on the detailed terms and conditions of bonus agreements and applicable IFRS standards. Consultation with accounting professionals is advised for actual financial reporting.</em></p>
            </section>
        </div>
    );
};

export default IFRSDashboard;
