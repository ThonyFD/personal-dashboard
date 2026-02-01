import React from 'react'

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="page-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
            <h1 style={{ marginBottom: '1rem' }}>Privacy Policy</h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}>Last updated: {new Date().toLocaleDateString()}</p>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>1. Introduction</h2>
                <p>
                    This Privacy Policy explains how the Personal Finance Dashboard ("we", "us", or "our") collects, uses, and discloses your information when you use our service.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>2. Information We Collect</h2>
                <p>
                    <strong>Account Information:</strong> When you sign in with Google, we collect your email address and basic profile information to create and manage your account.
                </p>
                <p style={{ marginTop: '0.5rem' }}>
                    <strong>Financial Data:</strong> We collect the financial data you input or import into the system, such as transactions, budgets, and categories, solely for the purpose of providing the dashboard features.
                </p>
                <p style={{ marginTop: '0.5rem' }}>
                    <strong>Usage Data:</strong> We may collect information on how the Service is accessed and used to help us improve the user experience.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>3. How We Use Your Information</h2>
                <p>
                    We use the collected information for the following purposes:
                </p>
                <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                    <li>To provide and maintain the Service</li>
                    <li>To personalize your experience and dashboard</li>
                    <li>To analyze usage patterns and improve our Service</li>
                    <li>To detect, prevent, and address technical issues</li>
                </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>4. Data Sharing and Disclosure</h2>
                <p>
                    We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. We may share data with trusted third-party service providers who assist us in operating our website, conducting our business, or servicing you, so long as those parties agree to keep this information confidential.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>5. Data Security</h2>
                <p>
                    The security of your data is important to us. We implement appropriate security measures to protect against unauthorized access, alteration, disclosure, or destruction of your personal information. However, no method of transmission over the Internet or method of electronic storage is 100% secure.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>6. Third-Party Services</h2>
                <p>
                    Our Service uses Google OAuth for authentication. By using this feature, you are also subject to the Google Privacy Policy. We may also link to other third-party sites or services that are not operated by us.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>7. Children's Privacy</h2>
                <p>
                    Our Service is not intended for use by children under the age of 13. We do not knowingly collect personally identifiable information from children under 13.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>8. Changes to This Privacy Policy</h2>
                <p>
                    We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>9. Contact Us</h2>
                <p>
                    If you have any questions about this Privacy Policy, please contact us.
                </p>
            </section>
        </div>
    )
}

export default PrivacyPolicy
