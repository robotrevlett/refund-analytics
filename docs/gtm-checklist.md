# Go-to-Market Checklist — Refund & Return Analytics

## Phase 1: Validate (Weeks 1-4)

### Setup (do first)
- [ ] Set `BETA_MODE=1` in production environment
- [ ] Deploy the app to Shopify (submit for review if not already listed)
- [ ] Create feedback survey (Google Form / Typeform) and update the `FEEDBACK_URL` in `app/components/BetaBanner.jsx`
- [ ] Update the review link in `app/components/ReviewPrompt.jsx` once you have real app store URL
- [ ] Buy refundanalytics.com and set up landing page (Carrd, $9/yr) with dashboard screenshot + email signup

### Outreach (ongoing, weeks 1-4)
- [ ] Shopify Community Forum: search threads about "refund reports", "net revenue", "revenue discrepancy" — reply helpfully to 3-5/week
- [ ] Reddit (r/shopify, r/ecommerce): post a "Show HN"-style post about the revenue inflation problem
- [ ] Join Discord communities (Talk Shop, Mavenport) — participate for a week before mentioning the app
- [ ] Twitter/X: post a thread about "Your Shopify revenue numbers are wrong" with dashboard screenshot
- [ ] DM merchants who've posted about refund pain points — offer free early access
- [ ] Target: 50 conversations → 20 installs

### Track
- [ ] Install rate from outreach (target: 40%+)
- [ ] Survey responses — especially willingness to pay and feature requests

## Phase 2: Organic Growth (Weeks 5-12)

### Billing
- [ ] Remove `BETA_MODE=1` and enable Managed App Pricing ($9 Starter / $19 Pro)
- [ ] Grandfather beta testers (free lifetime Starter or 6 months free Pro)

### Reviews
- [ ] Personal email to each beta tester asking for a review
- [ ] Target: 10-15 reviews from 20 testers → reach the 20-review threshold for Shopify search visibility

### Content
- [ ] Write blog post: "Why Your Shopify Revenue Numbers Are Wrong"
- [ ] Write blog post: "The Hidden Cost of Returns"
- [ ] Write blog post: "How to Calculate Your Real Refund Rate on Shopify"
- [ ] Record 3-min YouTube walkthrough of the dashboard
- [ ] Publish on Medium, Dev.to, your own site

### Influencers
- [ ] Identify 5-10 ecommerce YouTubers (5K-50K followers) covering Shopify tools
- [ ] Offer free lifetime Pro + 20% recurring referral commission

## Validation Gates (before Phase 3)

- [ ] 20+ merchants installed and using the app
- [ ] 60%+ survey respondents would pay $9-19/mo
- [ ] 10+ weekly active users
- [ ] No critical bugs or UX issues
- [ ] Top 3 feature requests identified
- [ ] 20+ reviews with 4.5+ star average

If those gates pass, move to PPC (Phase 3 in the GTM plan).
