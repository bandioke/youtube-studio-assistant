import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Streamdown } from "streamdown";

const privacyPolicyContent = `
# Privacy Policy

**YouTube Studio Assistant**  
Last Updated: December 7, 2024

## Overview

YouTube Studio Assistant ("the Extension") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.

## Information We Collect

### 1. Usage Analytics (Anonymous)

We collect anonymous usage data to improve the Extension:

- **Feature usage**: Which features you use (generate title, translate, etc.)
- **Error reports**: Technical errors to help us fix bugs
- **Session data**: How often and how long you use the Extension
- **License status**: Whether you're on trial or have a license (no license key stored)

**What we DON'T collect:**
- Your YouTube account information
- Video content, titles, or descriptions
- Personal information (name, email, address)
- License keys or payment information
- Browsing history outside YouTube Studio

### 2. Local Storage

The Extension stores the following data locally on your device:

- API keys you enter (Gemini, OpenAI, DeepSeek)
- Your language preferences
- License activation status
- Custom language list for translations

This data is stored using Chrome's secure storage API and never sent to our servers.

### 3. API Communications

When you use AI features, your video title/description is sent to:
- Google Gemini API (if selected)
- OpenAI API (if selected)
- DeepSeek API (if selected)

These are direct API calls using YOUR API keys. We do not have access to this data.

## How We Use Information

### Analytics Data
- Improve Extension features and performance
- Identify and fix bugs
- Understand which features are most useful
- Make business decisions about future development

### Local Data
- Provide Extension functionality
- Remember your preferences
- Validate license status

## Third-Party Services

### Google Analytics 4
We use Google Analytics to collect anonymous usage statistics. Google's privacy policy applies: https://policies.google.com/privacy

### LemonSqueezy
License purchases are processed by LemonSqueezy. Their privacy policy applies: https://www.lemonsqueezy.com/privacy

### AI Providers
- Google Gemini: https://policies.google.com/privacy
- OpenAI: https://openai.com/privacy
- DeepSeek: https://www.deepseek.com/privacy

## Your Rights

### Opt-Out of Analytics
You can disable analytics tracking:
1. Open Extension popup
2. Go to Settings
3. Toggle "Analytics" off

### Delete Local Data
1. Go to \`chrome://extensions/\`
2. Find YouTube Studio Assistant
3. Click "Remove" to delete all local data

### Data Portability
Your settings are stored locally. You can export them via Chrome's sync feature.

## Data Security

- All API keys are stored locally using Chrome's encrypted storage
- Analytics data is anonymized (no personal identifiers)
- We use HTTPS for all network communications
- No data is sold to third parties

## Children's Privacy

This Extension is not intended for children under 13. We do not knowingly collect data from children.

## Changes to This Policy

We may update this Privacy Policy. Changes will be posted here with an updated date. Continued use of the Extension after changes constitutes acceptance.

## Contact

For privacy questions or concerns:
- Email: [your-email@example.com]
- GitHub: [your-github-repo]

## Consent

By using YouTube Studio Assistant, you consent to this Privacy Policy.

---

© 2024 YouTube Studio Assistant. All rights reserved.
`;

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow pt-32 pb-20">
        <div className="container max-w-3xl">
          <div className="glass p-8 md:p-12 rounded-3xl">
            <Streamdown className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-heading prose-headings:font-bold prose-a:text-primary prose-img:rounded-xl">
              {privacyPolicyContent}
            </Streamdown>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
