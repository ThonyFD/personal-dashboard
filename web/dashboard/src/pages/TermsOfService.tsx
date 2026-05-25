import React from 'react'

const TermsOfService: React.FC = () => {
  return (
    <div
      className="page-container"
      style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}
    >
      <h1 style={{ marginBottom: '1rem' }}>Terms of Service</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>1. Acceptance of Terms</h2>
        <p>
          By accessing and using AI Finance Agent (&quot;the Service&quot;),
          you agree to be bound by these Terms of Service.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>2. Description of Service</h2>
        <p>
          AI Finance Agent is a personal finance dashboard that connects to
          Google Sign-In and, when authorized by you, reads eligible Gmail
          messages to extract and organize financial transaction information.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>3. User Accounts</h2>
        <p>
          You must use a valid Google account to access protected features. You
          are responsible for maintaining the security of your account and any
          activity performed through it.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>4. Privacy and Data Protection</h2>
        <p>
          Your use of the service is also governed by our Privacy Policy, which
          explains how we collect and use your information, including Gmail data.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>5. Acceptable Use</h2>
        <p>
          You agree not to misuse the service, attempt unauthorized access,
          interfere with operations, or use the service for unlawful purposes.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>6. Availability and Changes</h2>
        <p>
          We may modify, suspend, or discontinue parts of the service at any
          time. We do not guarantee uninterrupted availability.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>7. Disclaimer</h2>
        <p>
          The service is provided on an &quot;as is&quot; and &quot;as available&quot;
          basis. It is intended to help you organize financial information, not
          to provide legal, tax, accounting, or investment advice.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, we are not liable for indirect,
          incidental, consequential, or special damages arising from your use of
          the service.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>9. Changes to These Terms</h2>
        <p>
          We may update these terms from time to time. Any changes will be posted
          on this page with an updated effective date.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>10. Contact</h2>
        <p>If you have questions about these terms, contact us at thonyfd@gmail.com.</p>
      </section>
    </div>
  )
}

export default TermsOfService
