import { Link } from "react-router-dom";

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/" className="text-brand-600 hover:underline mb-8 inline-block">&larr; Back to Home</Link>
        
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-500 text-sm mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <p>
            This Privacy Policy describes how [YOUR COMPANY NAME] ("we," "us," or "our") collects, uses, and shares 
            your personal information when you use ReachInbox (the "Service").
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
          <p>We collect information you provide directly to us when you:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Create an account</li>
            <li>Use the Service to schedule and send emails</li>
            <li>Connect third-party integrations (like Google or Slack)</li>
            <li>Contact customer support</li>
          </ul>
          <p>This may include your name, email address, billing information, and content of emails you send through our Service.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Provide, maintain, and improve the Service</li>
            <li>Process transactions and send related information</li>
            <li>Send technical notices, updates, security alerts, and support messages</li>
            <li>Respond to your comments, questions, and requests</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Data Storage and Security</h2>
          <p>
            We take reasonable measures to help protect your personal information from loss, theft, misuse, 
            and unauthorized access. However, no data transmission over the internet or storage system can be 
            guaranteed to be 100% secure.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Third-Party Integrations</h2>
          <p>
            When you connect a third-party account (like Slack) to the Service, we receive information from 
            that service. The information we receive depends on the third-party service's policies and your 
            privacy settings on that service.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at: <br/>
            [YOUR COMPANY CONTACT EMAIL]
          </p>
        </div>
      </div>
    </div>
  );
}
