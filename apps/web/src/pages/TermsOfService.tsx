import { Link } from "react-router-dom";

export function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/" className="text-brand-600 hover:underline mb-8 inline-block">&larr; Back to Home</Link>
        
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-500 text-sm mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <p>
            Please read these Terms of Service ("Terms") carefully before using the ReachInbox platform (the "Service") 
            operated by [YOUR COMPANY NAME] ("us", "we", or "our").
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part 
            of the terms, then you may not access the Service.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Acceptable Use</h2>
          <p>You agree not to use the Service to:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Send spam, unsolicited commercial email, or bulk email without proper consent</li>
            <li>Violate any applicable laws, including the CAN-SPAM Act or GDPR</li>
            <li>Send malicious code or phishing emails</li>
            <li>Harass, abuse, or harm another person or entity</li>
          </ul>
          <p>We reserve the right to terminate accounts that violate these acceptable use policies.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Account Responsibilities</h2>
          <p>
            You are responsible for safeguarding the password that you use to access the Service and for any activities 
            or actions under your password. You agree not to disclose your password to any third party. You must notify 
            us immediately upon becoming aware of any breach of security or unauthorized use of your account.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Limitation of Liability</h2>
          <p>
            In no event shall [YOUR COMPANY NAME], nor its directors, employees, partners, agents, suppliers, or 
            affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including 
            without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your 
            access to or use of or inability to access or use the Service.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide 
            notice of any significant changes.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at: <br/>
            [YOUR COMPANY CONTACT EMAIL]
          </p>
        </div>
      </div>
    </div>
  );
}
