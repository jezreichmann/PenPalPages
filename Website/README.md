# PenPal Pages Website

The public website is a static React/Vite app hosted by GitHub Pages. It reuses the app's logo and artwork from `public/assets`; SQLite, Stripe secrets, and contact data stay on the existing Fly server.

## Local preview

From the repository root:

```powershell
npm --prefix Website ci
npm --prefix Website run dev
```

Open `http://127.0.0.1:5175`. The storefront will show a clear unavailable state until the Fly server has the website API deployed.

Build the static site with `npm --prefix Website run build`; output goes to `Website/dist`.

## GitHub Pages

1. Push this repository to GitHub.
2. In repository **Settings → Pages**, choose **GitHub Actions** as the source.
3. The `Deploy PenPal Pages website` workflow installs dependencies from `Website/package-lock.json`, then builds and deploys only `Website/dist`.
4. Optionally set the repository variable `WEBSITE_API_URL` if the Fly API uses a different public URL. Otherwise it uses `https://penpalpages-licences.fly.dev`.
5. In Fly, set `WEBSITE_PUBLIC_URL` to the complete Pages URL (including the repository path, for example `https://owner.github.io/repository/`). This lets Stripe return to the correct page and allows that GitHub Pages origin through CORS.

## Fly storefront configuration

The SQLite storefront settings are initialized with a £49.99 product price and no active promotion. In the private Admin Console, use **Website** to edit the price, enable a promotion code/percentage, configure the downloadable release URL, review paid orders, mark manual fulfilment complete, and read/close website inquiries.

The product price and discount are read from SQLite for every checkout. Checkout remains disabled until these Fly secrets are configured:

```powershell
fly secrets set WEBSITE_PUBLIC_URL="https://owner.github.io/repository/" STRIPE_SECRET_KEY="<Stripe secret key>" STRIPE_WEBHOOK_SECRET="<Stripe webhook signing secret>"
```

In Stripe, add a webhook endpoint at `https://penpalpages-licences.fly.dev/website/stripe-webhook` and subscribe to `checkout.session.completed`. The server validates the Stripe signature and paid amount before marking an order paid. Fulfilment is manual; paid orders appear in the Admin Console with the buyer's email.

Website inquiries are always stored in the encrypted Fly database and appear in Admin Console → Website. To also send email notifications, set a verified Resend sender and API key:

```powershell
fly secrets set RESEND_API_KEY="<Resend API key>" RESEND_FROM_EMAIL="PenPal Pages <verified-sender@yourdomain.com>"
```

Without Resend, the website confirms the message was saved for admin follow-up and provides `support@darkweatherstudios.com` as a direct email option.

## Video walkthrough

The site currently includes a playable, animated guided walkthrough of three editor states. It is not a prerecorded voice-over video; a recorded demo can replace this component later without changing the checkout or website API.