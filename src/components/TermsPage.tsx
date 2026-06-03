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
      <p className="last-updated">Last updated: June 3, 2026</p>

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Recipesaurus, you agree to these Terms of Use. If you do not
          agree, please do not use the service.
        </p>
      </section>

      <section>
        <h2>2. Our Service</h2>
        <p>
          Recipesaurus helps you save recipes from URLs, create your own recipes, organize
          cookbooks, discover public recipes and cookbooks, share recipe and cookbook links,
          connect with friends, collaborate on shared cookbooks, and use your saved recipes
          as a starting point for meal planning.
        </p>
      </section>

      <section>
        <h2>3. Accounts and Security</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials
          and for all activity under your account. Please provide accurate account information,
          keep your email address current, and notify us if you believe your account has been
          accessed without permission.
        </p>
      </section>

      <section>
        <h2>4. Your Content</h2>
        <p>
          You retain ownership of recipes, cookbooks, profile information, images, notes, and
          other content you create, import, upload, or share in Recipesaurus. You grant
          Recipesaurus a limited license to host, store, copy, display, process, and share your
          content only as needed to operate, improve, protect, and provide the service.
        </p>
        <p>
          You are responsible for the content you add to Recipesaurus, including making sure
          you have the rights to use and share it.
        </p>
      </section>

      <section>
        <h2>5. Sharing, Friends, and Public Content</h2>
        <p>
          Recipes and cookbooks may be private, shared by invite or link, or made public for
          discovery depending on the options you choose. Public content can be viewed by other
          users and may be saved to their own collections. Shared cookbook collaborators may
          be able to view, add, or interact with cookbook content according to the sharing
          features available in the service.
        </p>
        <p>
          Friend requests, profile features, notifications, and sharing tools should be used
          respectfully. Do not send unwanted requests, impersonate others, or use Recipesaurus
          to harass, spam, or pressure anyone.
        </p>
      </section>

      <section>
        <h2>6. Imported and Third-Party Content</h2>
        <p>
          Recipe extraction and links may rely on content from third-party websites. We do not
          control those websites, guarantee that extraction will work for every URL, or endorse
          third-party content. Please review and respect any rights, terms, and attribution
          requirements that apply to content you import or share.
        </p>
      </section>

      <section>
        <h2>7. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Upload, import, or share content that infringes intellectual property rights</li>
          <li>Use the service for illegal, deceptive, harmful, or abusive purposes</li>
          <li>Harass others or send unwanted friend requests, invitations, or messages</li>
          <li>Attempt to gain unauthorized access to Recipesaurus or other users' accounts</li>
          <li>Interfere with, disrupt, scrape, overload, or reverse engineer the service</li>
          <li>Upload malicious code or content designed to compromise security</li>
        </ul>
      </section>

      <section>
        <h2>8. Food, Allergies, and Meal Planning</h2>
        <p>
          Recipesaurus is an organizational tool, not a medical, dietary, nutritional, or food
          safety advisor. Recipes, meal planning ideas, cooking times, ingredient lists, and
          community content may be incomplete or inaccurate. Always verify ingredients,
          allergens, nutrition, storage, cooking temperatures, and dietary suitability before
          preparing or serving food.
        </p>
      </section>

      <section>
        <h2>9. Privacy</h2>
        <p>
          We collect and use information as needed to provide, secure, support, and improve
          Recipesaurus, including account, profile, recipe, cookbook, sharing, friend, and
          notification data. We do not sell your personal information to third parties.
        </p>
      </section>

      <section>
        <h2>10. Service Changes and Availability</h2>
        <p>
          We may add, change, suspend, or remove features over time, including recipe import,
          discovery, friends, sharing, collaboration, and meal planning features. We work to
          keep Recipesaurus available, but we do not guarantee uninterrupted access or that
          any content will always be available.
        </p>
      </section>

      <section>
        <h2>11. Termination</h2>
        <p>
          You may stop using Recipesaurus at any time. We may suspend or terminate access if
          we believe you have violated these terms, created risk for other users, or used the
          service in a way that could harm Recipesaurus or its community.
        </p>
      </section>

      <section>
        <h2>12. Disclaimers and Liability</h2>
        <p>
          Recipesaurus is provided "as is" and "as available" without warranties of any kind.
          To the fullest extent permitted by law, Recipesaurus is not responsible for recipe
          accuracy, third-party content, user content, cooking outcomes, meal planning decisions,
          lost data, or indirect, incidental, or consequential damages.
        </p>
      </section>

      <section>
        <h2>13. Changes to Terms</h2>
        <p>
          We may update these terms from time to time. Continued use of Recipesaurus after
          changes are posted means you accept the updated terms.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>
          If you have questions about these terms, please use our{' '}
          <Link to="/feedback">feedback page</Link> to get in touch.
        </p>
      </section>
    </div>
  );
}
