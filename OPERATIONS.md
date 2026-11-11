# Maxwell Training operations

Verified 11 November 2026. No paid upgrades or AI top-ups are authorized.

## Source and deployment

- Domain: https://www.maxwelltraining.org/ (apex redirects to www).
- Repository: https://github.com/Durdush1/maxwell-training
- Vercel team: Maxwelltraining; project: maxwell-training.
- Production deploys from main, root directory mt-deploy.
- Original production commit before this work: 3d28a43c491da4e1e39f95e93ea792ec0aae1d39.
- Root index.html and mt-deploy-v2 are legacy copies. Edit mt-deploy.
- Node serverless endpoints: api/generate.js, api/verify.js, api/reviews.js.
- Production secret names: ANTHROPIC_API_KEY and STRIPE_SECRET_KEY. Keep values in Vercel; never commit them.

## Services

Anthropic generates training programs; this consumes paid API credits even though the preview is free to customers. Claude history reports an expired key was replaced in November. The signed-in Anthropic dashboard showed $0.76 remaining during this session; no funds were added.

Stripe payment links charge $19, $29, or $39. Server verification confirms the session's payment state. PDFs are generated in the browser. No durable order-to-program store or automatic program-email delivery exists yet. Full plan content is sent to the browser for preview; the PDF button is not server-side content protection.

EmailJS uses the existing contact template to send inquiries and review submissions to Maxwell.ionita@gmail.com. A contact test with marker MT-20261111-01 was accepted by EmailJS and found in the connected sender's Sent folder. Review test MT-REVIEW-20261111-01 was also sent successfully after deployment and found in Sent. Destination inbox receipt has not been independently verified. Reviews require manual moderation; no automatic publication is configured.

Claude project context was read in the signed-in desktop app. Gemini was asked for feedback using only the public site. Neither is a persistent backend integration or an unattended operator.

## Checks

Run `node --test mt-deploy/tests/reliability.test.cjs` from the repository root. These tests make no paid API calls. Vercel runs them as its build command, so a failing test blocks the new deployment. Review the Vercel deployment status after publishing and test navigation, preview tabs, quiz steps, contact, reviews, payment return, and PDF download. A live payment and paid AI-generation test were not performed during this zero-spend pass.

## Remaining launch work

- Vercel Hobby is restricted to non-commercial personal use: https://vercel.com/docs/plans/hobby . Choose compliant hosting before commercial operation; no plan was upgraded.
- Add durable, private order/program storage and authenticated recovery, with retention and deletion behavior.
- Add Stripe webhook signature verification, idempotent fulfillment, program-to-order binding, and customer email delivery with retries.
- Add distributed request throttling and a bot challenge before paid generation. Origin validation is not a rate limiter or authentication.
- Verify domain email authentication, destination delivery, and quota handling; the current sender is a Gmail-backed EmailJS service.
- Confirm permission and accuracy for existing transformation photos and claims; this work did not establish their provenance.
- Obtain qualified review of generated exercise/nutrition content, especially for minors and injury-related answers. This pass did not validate clinical or coaching quality.
- Measure actual conversion and acquisition costs before setting revenue targets. A website alone does not guarantee revenue.

Do not claim full automation, load-test readiness, full security, or a completed paid checkout test until these items have been implemented and verified.
