# AgoraBedrockWorker — invoke policy

This file is the **desired** policy. Editing it changes nothing in AWS until it is
applied (see below).

## What changed and why (2026-08-06 security review)

The previous version had two defects.

**1. Every Bedrock model in every AWS region.**

```json
"Resource": [
  "arn:aws:bedrock:*::foundation-model/*",
  "arn:aws:bedrock:*:328559741463:inference-profile/*"
]
```

`*` in the region field means EU-only data residency — a load-bearing claim for this
product, and one made to users and to the BSS application — was enforced by nothing but
the `AWS_BEDROCK_REGION` environment variable. A typo, a bad default, or an attacker with
the worker credentials could send an applicant's CV and visa status to `us-east-1`. IAM
should make the wrong region *impossible*, not merely unconfigured.

The replacement does two things:

- An explicit **`Deny` on `bedrock:*` outside the EU region list**, keyed on
  `aws:RequestedRegion`. An explicit Deny cannot be overridden by any later Allow, in this
  policy or any other attached to the role. This is the actual residency guarantee.
- A narrowed **Allow** covering only the model families we call: `anthropic.claude-*`
  (generation, eval, rerank) and `cohere.embed-*` (embeddings).

The EU region *list* is wider than `eu-central-1` on purpose. The configured model IDs are
`eu.anthropic.claude-…` — EU **cross-region inference profiles**, which by design route a
request to any EU region in the profile. Restricting the Allow to `eu-central-1` alone
would break inference the first time AWS routed elsewhere. Every listed region is in the
EU, so residency holds.

**2. `aws-marketplace:Subscribe` / `Unsubscribe` on `Resource: "*"`.**

A runtime worker had standing permission to change the AWS account's marketplace
subscriptions. `Unsubscribe` on `*` is a single API call that revokes our own model access
and takes the product down; `Subscribe` on `*` can enrol the account in arbitrary paid
marketplace offerings. Neither is needed at runtime — model access is granted once, by a
human, in the console.

The whole statement is removed. If model access ever needs re-granting, Jay does it in the
Bedrock console under his own identity. It is not a capability that belongs to an
unattended process holding long-lived keys.

## Applying it

This policy is not applied automatically. To roll it out:

```sh
aws iam create-policy-version \
  --policy-arn arn:aws:iam::328559741463:policy/AgoraBedrockWorker-invoke-policy \
  --policy-document file://infrastructure/AgoraBedrockWorker-invoke-policy.json \
  --set-as-default
```

Then verify a real call still works before deleting the old version:

```sh
# Should succeed
pnpm --filter @agora/workers exec tsx -e "…invoke haiku…"

# Should now fail with AccessDenied — this is the residency guarantee being real
AWS_BEDROCK_REGION=us-east-1 pnpm --filter @agora/workers exec tsx -e "…invoke haiku…"
```

Keep the previous policy version until both checks pass; `create-policy-version` retains
it and it can be re-set as default in one command.

## Still open

The worker authenticates with a **long-lived `AKIA…` access key**. Scoping the policy
limits the blast radius but does not remove it. The durable fix is short-lived credentials
(an OIDC role assumption from the deployment platform, or an instance/task role) so there
is no static secret to steal. Tracked in `docs/Security/INPUTS-NEEDED-FROM-JAY.md`.
