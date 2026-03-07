This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## MIA API Proxy (CORS Fix)

The app includes a same-origin proxy route at `/api/mia/*`.

- Browser calls `http://localhost:3000/api/mia/...` (no cross-origin CORS issue)
- Next.js server forwards to your MIA backend (default: `http://localhost:9000`)

Set environment variables in `.env.local`:

```bash
MIA_API_DEFAULT_ENVIRONMENT=local

MIA_API_BASE_URL_LOCAL=http://localhost:9000
MIA_API_TOKEN_LOCAL=your_local_mia_bearer_token

MIA_API_BASE_URL_STAGING=https://staging.example.com
MIA_API_TOKEN_STAGING=your_staging_mia_bearer_token

MIA_API_BASE_URL_PRODUCTION=https://api.example.com
MIA_API_TOKEN_PRODUCTION=your_production_mia_bearer_token
```

Notes:

- The Audio Test Bench has an environment dropdown (`Local`, `Staging`, `Production`) that maps to these env vars.
- If `MIA_API_TOKEN` is set (fallback), the UI can run without entering a token.
- You can still supply a one-off token in the Audio Test Bench; it is sent to the proxy as `x-mia-token` and used server-side.
- Audio test bench page: [http://localhost:3000/mia-audio-test-bench](http://localhost:3000/mia-audio-test-bench)

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
