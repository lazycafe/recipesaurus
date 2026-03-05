import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="static-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={18} />
        Back to Recipes
      </Link>

      <h1>Terms of Use</h1>
      <p className="last-updated">Last updated: March 5, 2026</p>

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using Recipesaurus, you agree to be bound by these Terms of Use.
          If you do not agree to these terms, please do not use our service.
        </p>
      </section>

      <section>
        <h2>2. Description of Service</h2>
        <p>
          Recipesaurus is a recipe management application that allows users to save, organize,
          and share their recipes. We provide tools for creating cookbooks, importing recipes
          from URLs, and collaborating with others.
        </p>
      </section>

      <section>
        <h2>3. User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials
          and for all activities that occur under your account. You agree to notify us
          immediately of any unauthorized use of your account.
        </p>
      </section>

      <section>
        <h2>4. User Content</h2>
        <p>
          You retain ownership of any recipes and content you create or upload to Recipesaurus.
          By sharing content, you grant us a license to display and distribute that content
          as necessary to provide our services.
        </p>
      </section>

      <section>
        <h2>5. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Upload content that infringes on intellectual property rights</li>
          <li>Use the service for any illegal purpose</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Interfere with or disrupt the service</li>
        </ul>
      </section>

      <section>
        <h2>6. Privacy</h2>
        <p>
          Your privacy is important to us. We collect and use your information only as
          necessary to provide and improve our services. We do not sell your personal
          information to third parties.
        </p>
      </section>

      <section>
        <h2>7. Disclaimer</h2>
        <p>
          Recipesaurus is provided "as is" without warranties of any kind. We are not
          responsible for the accuracy of recipes or any consequences resulting from
          their use.
        </p>
      </section>

      <section>
        <h2>8. Changes to Terms</h2>
        <p>
          We may update these terms from time to time. Continued use of the service after
          changes constitutes acceptance of the new terms.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>
          If you have questions about these terms, please use our{' '}
          <Link to="/feedback">feedback page</Link> to get in touch.
        </p>
      </section>
    </div>
  );
}
