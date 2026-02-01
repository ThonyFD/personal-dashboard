import React from 'react'

const TermsOfService: React.FC = () => {
    return (
        <div className="page-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
            <h1 style={{ marginBottom: '1rem' }}>Terms of Service</h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}>Last updated: {new Date().toLocaleDateString()}</p>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>1. Acceptance of Terms</h2>
                <p>
                    By accessing and using the Personal Finance Dashboard ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this Service.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>2. Description of Service</h2>
                <p>
                    The Service is a personal finance management tool that allows users to track expenses, view financial reports, and manage budgets. The Service is provided "as is" and is intended for informational purposes only.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>3. User Accounts</h2>
                <p>
                    To access certain features of the Service, you must sign in using your Google account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>4. Privacy and Data Protection</h2>
                <p>
                    Your privacy is important to us. Our use of your personal information is governed by our Privacy Policy. By using the Service, you consent to the collection and use of your information as outlined in the Privacy Policy.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>5. User Conduct</h2>
                <p>
                    You agree not to use the Service for any unlawful purpose or in any way that could damage, disable, overburden, or impair the Service.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>6. Intellectual Property</h2>
                <p>
                    The Service and its original content, features, and functionality are and will remain the exclusive property of the Service providers and its licensors.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>7. Disclaimer of Warranties</h2>
                <p>
                    The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, expressed or implied, regarding the accuracy, reliability, or availability of the Service.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>8. Limitation of Liability</h2>
                <p>
                    In no event shall the Service providers be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>9. Changes to Terms</h2>
                <p>
                    We reserve the right to modify these terms at any time. We will notify users of any significant changes by posting the new Terms of Service on this page.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>10. Contact Us</h2>
                <p>
                    If you have any questions about these Terms, please contact us.
                </p>
            </section>
        </div>
    )
}

export default TermsOfService
