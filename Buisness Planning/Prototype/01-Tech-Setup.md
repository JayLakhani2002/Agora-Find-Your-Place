# Agora Jobs — Tech Setup & Monorepo Bootstrap
**Document:** PROTO-001 · **Version:** 1.0  
**Prerequisite for:** All other phases  
**Estimated time:** 1–2 days

---

## 1. Prerequisites (Install First)

```bash
# Required on developer machines
node --version    # must be >= 22 LTS
pnpm --version    # must be >= 9
git --version     # >= 2.40

# Install pnpm if missing
npm install -g pnpm@latest

# Install Turborepo CLI
pnpm add -g turbo
```

---

## 2. Monorepo Bootstrap

```bash
# 1. Create the repo
mkdir agora-jobs && cd agora-jobs
git init
pnpm init

# 2. Set up pnpm workspaces
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# 3. Install Turborepo
pnpm add -D turbo -w
```

### 2.1 Directory Structure

```
agora-jobs/
├── apps/
│   ├── web/              # Next.js 15 PWA — the prototype
│   └── workers/          # Background job workers (Docker)
├── packages/
│   ├── db/               # Drizzle ORM schema + migrations
│   ├── ai/               # AI generation utilities (Claude SDK wrappers)
│   ├── legal/            # Employment constraint logic (pure TS, no deps)
│   ├── ui/               # Shared component library (shadcn/ui base)
│   └── config/           # Shared tsconfig, ESLint, Biome configs
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

### 2.2 Create App Scaffolds

```bash
# Web app (Next.js 15 with App Router)
cd apps
pnpm create next-app@latest web \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-eslint     # we use Biome

# Workers app (plain Node, no framework)
mkdir -p workers/src
cd workers && pnpm init
```

### 2.3 Create Shared Packages

```bash
# From repo root
for pkg in db ai legal ui config; do
  mkdir -p packages/$pkg/src
  cd packages/$pkg
  pnpm init
  cd ../..
done
```

---

## 3. turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": [
    "DATABASE_URL",
    "CLERK_SECRET_KEY",
    "ANTHROPIC_API_KEY",
    "AWS_BEDROCK_REGION",
    "REDIS_URL",
    "S3_BUCKET",
    "S3_ENDPOINT",
    "S3_ACCESS_KEY",
    "S3_SECRET_KEY"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

---

## 4. Core Dependencies

### 4.1 Web App (`apps/web`)

```bash
cd apps/web

# Framework & UI
pnpm add next@15 react@19 react-dom@19
pnpm add @clerk/nextjs          # Auth (EU tenant)
pnpm add @trpc/server @trpc/client          # @trpc/next is NOT used — App Router uses the fetch adapter
pnpm add @tanstack/react-query
pnpm add zod                    # Validation
pnpm add zustand                # Client state

# UI Components
pnpm add tailwindcss @tailwindcss/forms
pnpm add class-variance-authority clsx tailwind-merge
pnpm add lucide-react
# Install shadcn/ui
pnpx shadcn@latest init

# Specific shadcn components needed
pnpx shadcn@latest add button card badge tabs dialog sheet progress toast

# Animations (swipe deck)
pnpm add framer-motion

# Dev
pnpm add -D @types/react @types/node typescript
```

### 4.2 Workers (`apps/workers`)

```bash
cd apps/workers

pnpm add bullmq ioredis           # Job queue
pnpm add @aws-sdk/client-bedrock-runtime  # Claude via Bedrock
pnpm add playwright               # For Mode 1 helper (browser detection only)
pnpm add pdf-parse                # Parse uploaded CVs
pnpm add axios cheerio            # Job scraping
pnpm add p-limit                  # Concurrency control
```

### 4.3 Shared DB Package (`packages/db`)

```bash
cd packages/db

pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
```

### 4.4 Shared AI Package (`packages/ai`)

```bash
cd packages/ai

pnpm add @anthropic-ai/sdk       # Official Claude SDK
pnpm add @aws-sdk/client-bedrock-runtime
pnpm add openai-edge             # fallback / embeddings via OpenAI-compatible API
```

---

## 5. Environment Variables

Create `.env.example` at repo root. Never commit `.env.local`:

```env
# ── Database (Neon, EU region) ──────────────────────────────────
DATABASE_URL=postgresql://user:pass@ep-xxx.eu-west-1.aws.neon.tech/agora?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:pass@ep-xxx.eu-west-1.aws.neon.tech/agora?sslmode=require

# ── Auth (Clerk) ─────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# ── AI — AWS Bedrock (Frankfurt, eu-central-1) ───────────────────
AWS_BEDROCK_REGION=eu-central-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
CLAUDE_SONNET_MODEL_ID=anthropic.claude-sonnet-4-6-20251001-v1:0
CLAUDE_HAIKU_MODEL_ID=anthropic.claude-haiku-4-5-20251001-v1:0

# ── Redis / Queue (Upstash, EU region) ──────────────────────────
REDIS_URL=rediss://default:...@eu1-xxxx.upstash.io:6380
UPSTASH_REDIS_REST_URL=https://eu1-xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# ── Object Storage (Scaleway, Paris) ────────────────────────────
S3_ENDPOINT=https://s3.fr-par.scw.cloud
S3_REGION=fr-par
S3_BUCKET=agora-jobs-docs
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# ── App ──────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 6. Biome (Linting + Formatting)

```bash
pnpm add -D @biomejs/biome -w
pnpx @biomejs/biome init
```

`biome.json` at root:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "asNeeded"
    }
  }
}
```

---

## 7. TypeScript Config

`packages/config/tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

`apps/web/tsconfig.json`:

```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 8. Git Setup

```bash
# .gitignore (key entries)
cat >> .gitignore << 'EOF'
.env
.env.local
.env.*.local
node_modules/
.next/
dist/
.turbo/
*.tsbuildinfo
graphify-out/
EOF

# Branch strategy (prototype = trunk-based)
# main        — always deployable
# feat/*      — feature branches, short-lived (< 2 days)
# No long-lived branches during prototype phase
```

---

## 9. Verify the Setup

```bash
# From repo root
pnpm install          # installs all workspaces
turbo typecheck       # all packages compile
turbo dev             # starts web on :3000 + workers

# Expected output:
# web:dev    → Ready on http://localhost:3000
# workers:dev → Worker process started
```

---

## 10. Definition of Done (Phase Setup)

- [ ] `turbo dev` starts without errors
- [ ] `turbo typecheck` passes across all packages
- [ ] `.env.local` created (not committed) with all required vars
- [ ] Neon DB provisioned in `eu-west-1`
- [ ] Clerk app created with EU data residency tenant
- [ ] AWS Bedrock access enabled in `eu-central-1` for Claude Sonnet + Haiku
- [ ] Upstash Redis instance in EU region
- [ ] Scaleway bucket created in `fr-par`
- [ ] GitHub repo created; CI workflow runs on push
