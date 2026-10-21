# Photo quote site: setup (about 30 minutes)

You need three free-to-open accounts. Only the first needs money.
1. Anthropic API account (console.anthropic.com): add a few dollars of credit, create an API key, and set a monthly spend limit.
2. GitHub account (github.com).
3. Vercel account (vercel.com): sign up with your GitHub login.

## Steps
1. On GitHub, create a new private repository and upload everything in this folder (index.html, api/quote.js, package.json, vercel.json).
2. In Vercel, click Add New > Project, pick that repository, and click Deploy.
3. In the Vercel project: Settings > Environment Variables. Add:
   - ANTHROPIC_API_KEY = your key from step 1
   - APP_PASSWORD = a password you choose (share it with your boss)
4. Go to Deployments and Redeploy so the variables take effect.
5. Open your Vercel web address, type the password into "Your shop details", add a few photos and test.

## Notes
- Never put the API key in index.html. It only goes in Vercel's environment variables.
- Learning is saved in each person's own browser. Use Back up learning / Restore to move it between devices.
- Check Vercel's and Anthropic's current limits and pricing before relying on the free tiers.
