import React from 'react'

const PrivacyPolicy: React.FC = () => {
  return (
    <div
      className="page-container"
      style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}
    >
      <h1 style={{ marginBottom: '1rem' }}>Privacy Policy</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>1. Introduction</h2>
        <p>
          This Privacy Policy explains how AI Finance Agent (&quot;we&quot;,
          &quot;us&quot;, or &quot;our&quot;) collects, uses, stores, and discloses
          your information when you use our service.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>2. Information We Collect</h2>
        <p>
          <strong>Account Information:</strong> When you sign in with Google, we
          collect your email address and basic profile information to create and
          manage your account.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          <strong>Google User Data:</strong> If you grant Gmail access, we read
          the Gmail messages needed to identify financial notifications and
          extract transaction details such as merchant, amount, date, account
          fragments, and related metadata.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          <strong>Financial Data:</strong> We store the transaction data
          extracted from your Gmail messages and any related dashboard data you
          create, such as categories, budgets, recurring payments, and reports.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          <strong>Usage Data:</strong> We may collect operational logs and usage
          information needed to maintain, secure, and improve the service.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>3. How We Use Your Information</h2>
        <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem' }}>
          <li>To authenticate you and provide access to the dashboard</li>
          <li>To read eligible Gmail messages and extract financial transactions</li>
          <li>To store, categorize, and display your financial activity</li>
          <li>To operate reports, budgets, recurring payment tracking, and alerts</li>
          <li>To detect, prevent, and address technical or security issues</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>4. Data Sharing and Disclosure</h2>
        <p>
          We do not sell your personal information or Google user data. We may
          share data only with service providers that help us operate the app,
          such as hosting, database, authentication, and cloud infrastructure
          providers, and only to the extent necessary to provide the service.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>5. Google API Data Use</h2>
        <p>
          Gmail data obtained through Google APIs is used only to provide or
          improve user-facing features of AI Finance Agent. We do not use
          Gmail data for advertising, data brokerage, or unrelated profiling.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>6. Data Security and Retention</h2>
        <p>
          We implement reasonable technical and organizational safeguards to
          protect your data. We retain data only as long as needed to operate the
          dashboard, comply with legal obligations, resolve disputes, or enforce
          our agreements.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>7. Your Choices</h2>
        <p>
          You can stop using the service at any time and revoke Google access
          from your Google account permissions page. You may also request account
          or data deletion by contacting us.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>8. Children&apos;s Privacy</h2>
        <p>
          Our service is not intended for children under the age of 13, and we
          do not knowingly collect personal information from children.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>9. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Any changes will
          be posted on this page with an updated effective date.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>10. Contact Us</h2>
        <p>If you have questions about this Privacy Policy, contact us at thonyfd@gmail.com.</p>
      </section>
    </div>
  )
}

export default PrivacyPolicy
