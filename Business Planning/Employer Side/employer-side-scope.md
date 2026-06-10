# Agora Jobs for Employers — Project Scope

**Document type:** Project Scope — Internal Reference
**Version:** 1.0
**Date:** June 2026
**Status:** Concept / Pre-Build
**Prepared by:** Agora Jobs Founding Team

> Companion to `v1-project-scope.md` (job-seeker side). This document governs the **employer-facing** product. Where the job-seeker side is **match → generate → track**, the employer side is **define → score → validate → hire**.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution](#3-solution)
4. [Scope Boundaries](#4-scope-boundaries)
5. [Features](#5-features)
6. [Business Model](#6-business-model)
7. [Out of Scope](#7-out-of-scope)
8. [Success Criteria](#8-success-criteria)

---

## 1. Executive Summary

Agora Jobs for Employers is the **company-facing** side of the Agora platform. It lets a hiring team turn a role requirement (from a project manager or solution architect) into a structured, scored, bias-reduced shortlist of candidates — drawn from the **same international-student pool already active on Agora Jobs**.

The product closes the loop that the job-seeker side opens: students build rich, verified career profiles on Agora; employers search that pool, score candidates against the *actual* expectations of the role (not a generic title), and run a transparent two-stage validation before committing to a hire.

Two principles define the product:

1. **Score against the real job, not the title.** A role labelled "AI Engineer" might be 70% n8n automation and 30% modelling. The candidate is evaluated on what they will actually do on day one — and explicitly *not* penalised for areas the team never expects them to cover.
2. **Reduce bias structurally, not by policy.** Candidate cards in the search deck hide the photo until a candidate is finalised and sent an assessment link. Self-ratings are validated by two independent interview teams who do not see each other's results.

**Primary user:** Employer hiring teams (project manager / solution architect defines the requirement; a recruiter or hiring panel operates the deck and assessments).
**Candidate pool:** Agora Jobs students only (V1).
**Revenue:** Employer SaaS subscription + sponsored student access (companies pay to take on students). This is the engine that keeps the student side budget-friendly.

---

## 2. Problem Statement

### 2.1 Roles Are Hired Against Titles, Not Real Requirements

A team needs, say, a senior data engineer and a senior ML/AI engineer. A job description is written, but the *weighting* of what matters — which 60% of the work is the day-one core, which 20% is nice-to-have, which 20% is irrelevant — lives only in the head of the project manager or solution architect. Candidates are then screened and interviewed against the title's stereotype, so strong people get rejected for gaps in areas the team never cared about, and weak people pass on irrelevant strengths.

### 2.2 Self-Assessment Has No Trusted Scale

Candidates routinely over- or under-rate themselves. There is no mechanism to (a) capture a candidate's own rating against the *specific* tech requirements of the role, (b) compare that to the employer's requirement weighting, and (c) verify how close the self-rating is to reality — without the verification itself being contaminated by the candidate's claims or by one interviewer's bias.

### 2.3 Bias Enters Early and Invisibly

Photos, names, and surface attributes influence shortlisting before any skill is assessed. Most platforms surface a face and a name at the very first screening step, which is exactly when bias does the most damage and is hardest to detect.

### 2.4 Student Hiring Is Expensive and Fragmented for Employers

Employers who want to hire international students for Werkstudent / internship / junior roles have no single, eligibility-aware, pre-scored pipeline. They juggle generic boards, manual CV review, and visa uncertainty — the mirror image of the student-side problem Agora already solves.

### 2.5 Market Gap Summary

| Gap | Current State | What Agora Employer Provides |
|---|---|---|
| Requirement weighting | Lives in one person's head | Structured requirement profile per role with weighted competencies |
| Self-rating vs. reality | No trusted scale | Candidate self-rating scored against weighted requirements, then validated |
| Validation integrity | Single panel, visible scores | Two independent blind panels; no cross-contamination |
| Bias at shortlist | Photo/name shown first | Face hidden in deck until finalisation |
| Eligibility | Manual, error-prone | Inherits Agora's legal eligibility engine |
| Student access at scale | Ad-hoc, costly | Sponsored student access pipeline |

---

## 3. Solution

The employer side runs a four-stage loop:

```
Role Requirement (PM / Solution Architect)
        │
   Requirement Profile  ──►  weighted competencies + out-of-scope areas
        │
   Candidate Self-Rating Form  ──►  candidate rates self on role's tech requirements
        │
   Scoring Engine  ──►  requirement weighting × self-rating × Agora profile match
        │
   Scored Search Deck  ──►  face-hidden candidate cards, ranked by fit score
        │
   Finalise + Send Assessment Link  ──►  photo revealed, candidate enters validation
        │
   Blind Two-Team Validation  ──►  Team 1 + Team 2 score independently, no shared results
        │
   Hire Decision  ──►  sponsored placement / offer
```

### 3.1 Key Design Principles

**The requirement profile is the source of truth.** Every score, every card rank, every validation question traces back to the weighted requirement profile authored by the PM or solution architect. Titles are labels; the weighting is the contract.

**Candidates are scored on what they'll do, not what the title implies.** Out-of-scope competencies carry zero weight and are never used to rank a candidate down.

**Bias is removed by construction.** No photo in the deck. Scores drive the ranking. The face is revealed only after the employer has committed to assessing the candidate.

**Validation is double-blind by design.** Two independent teams assess the same candidate without seeing each other's scores or the candidate's self-rating, so neither the candidate's claims nor the first team's judgment can anchor the second.

**The candidate pool is Agora's verified students.** Profiles are already structured, eligibility-checked, and CV-backed from the job-seeker side — no cold, unverified resumes.

---

## 4. Scope Boundaries

| Dimension | Scope |
|---|---|
| Candidate pool | Agora Jobs students only |
| Geography | Berlin (inherits job-seeker side) |
| Role categories | Werkstudent / internship / junior roles |
| Employer user type | Hiring teams (PM/architect author + recruiter/panel operators) |
| Bias control | Face hidden in deck until finalisation |
| Validation | Two-team blind validation in scope |
| Monetization | Employer SaaS subscription + sponsored student access |
| Output language | German and English |
| Platform | Web (employer dashboard) |

---

## 5. Features

### 5.1 Role & Requirement Profile Builder

**Purpose:** Capture the *real* shape of the role from the project manager or solution architect, not just the title.

**Inputs:**
- Role title + seniority (e.g. Senior Data Engineer, Senior ML/AI Engineer)
- Team and reporting context
- Competency list with **weighting** per competency (core / supporting / out-of-scope)
- Day-one expectations vs. ramp-up expectations
- Explicit "not expected" areas (carry zero weight in scoring)

**Output:** A structured **Requirement Profile** — the scoring contract for the role. Example: an AI Engineer role weighted heavily toward n8n agent/automation work scores candidates on automation depth and deliberately does *not* down-rank weak deep-learning research skills.

---

### 5.2 Candidate Self-Rating Form

**Purpose:** Capture the candidate's own assessment against the role's actual tech requirements.

**Flow:**
- Candidate receives a form scoped to the role's Requirement Profile competencies
- Rates themselves per competency (e.g. 1–5 or 0–10) on the job's tech requirements and other relevant attributes
- Optional evidence/context per rating (linked to Agora profile)

**Output:** A self-rating vector aligned 1:1 with the employer's requirement weighting, enabling direct comparison.

---

### 5.3 Scoring Engine

**Purpose:** Produce a single, explainable fit score per candidate per role.

**Score composition:**
1. **Requirement match** — Agora structured profile (skills, projects, experience) vs. weighted Requirement Profile
2. **Self-rating alignment** — candidate self-rating × employer weighting (out-of-scope competencies excluded)
3. **Eligibility pass** — inherits the job-seeker legal eligibility engine (hard gate)

**Output:** Overall fit score + per-competency breakdown + reasoning. Out-of-scope areas are shown as "not scored" — never as a deduction.

---

### 5.4 Scored Search Deck (Face-Hidden Cards)

**Purpose:** Let employers browse ranked candidates as cards — not a flat list — with bias controls built in.

**Card deck:**
- Candidates presented as cards, ranked by fit score (highest first)
- Each card shows: fit score, per-competency match ticks, role-relevant highlights, eligibility status
- **Photo hidden** — replaced by a neutral placeholder
- Tap a card → full profile + resume (still no photo)
- Employer can shortlist / pass / save

**Reveal rule:** The candidate's photo is revealed **only** after the employer finalises the candidate and sends the assessment-form link. Before that point, the deck is face-blind.

---

### 5.5 Assessment Link & Finalisation

**Purpose:** Move a shortlisted candidate from face-blind browsing into the validation pipeline.

**Flow:**
- Employer finalises a candidate from the deck
- System sends the candidate the assessment-form link (the role-scoped self-rating + any role tasks)
- Upon finalisation, the candidate's photo and full identity become visible to the employer
- Candidate enters the blind validation stage

---

### 5.6 Blind Two-Team Validation

**Purpose:** Verify how close the candidate's self-rating is to reality, without bias or anchoring.

**Mechanism:**
- **Team 1** interviews/assesses the candidate against the Requirement Profile and records scores
- **Team 2** independently assesses the *same* candidate against the *same* profile
- Neither team sees the other's scores, and neither sees the candidate's self-rating during assessment
- System compares: candidate self-rating vs. Team 1 vs. Team 2

**Output:** A calibration view — where self-rating, Team 1, and Team 2 agree or diverge — surfacing both candidate accuracy and any single-team bias. Transparency and judgment risk are removed structurally.

---

### 5.7 Hire Decision & Sponsored Placement

**Purpose:** Convert a validated candidate into a hire.

**Flow:**
- Employer reviews the calibrated scores (self vs. Team 1 vs. Team 2) alongside the resume and profile
- Decision: advance to offer / hold / reject
- For sponsored placements, the placement is recorded against the employer's sponsorship agreement (see §6)

---

### 5.8 Employer Dashboard

**Purpose:** Single operating surface for the hiring team.

**Contents:**
- Active roles + their Requirement Profiles
- Per-role scored decks
- Shortlist / finalisation status
- Validation status (self / Team 1 / Team 2 progress)
- Sponsorship and subscription status

---

## 6. Business Model

The employer side is the **revenue engine** that keeps the student side budget-friendly.

### 6.1 Employer SaaS Subscription

Recurring fee for access to the requirement builder, scored search deck, assessment engine, and blind validation tooling. Tiered by seats / active roles / pool access.

### 6.2 Sponsored Student Access

Companies pay to take on students (Werkstudent / internship / junior pipelines). This sponsorship is the primary earning engine — it lets the student-facing product stay low-cost or free while employers fund access to a verified, pre-scored, eligibility-checked talent pool.

**Why it works:** Students get free/cheap tooling and real opportunities; employers get a curated, bias-controlled pipeline they can't get elsewhere; Agora monetizes the match without charging the students who can least afford it.

---

## 7. Out of Scope

| Feature | Notes |
|---|---|
| Non-Agora / external candidate pool | V1 is Agora students only |
| Geographies beyond Berlin | Follows job-seeker expansion roadmap |
| Full-time senior hiring outside student pool | Later phase |
| Automated interview scheduling/comms | Later phase |
| Per-placement success fee | Possible later revenue line; V1 uses SaaS + sponsorship |
| Native mobile employer app | Web-first |

---

## 8. Success Criteria

| Metric | Target |
|---|---|
| Pilot employers onboarded | 3–5 paying or sponsoring companies |
| Requirement Profiles authored | ≥1 per active role, by the PM/architect |
| Deck-to-finalisation rate | ≥30% of viewed candidates finalised for assessment |
| Self-rating vs. validation correlation | Measurable calibration delta surfaced for ≥90% of validated candidates |
| Bias control integrity | Zero photos exposed in deck prior to finalisation |
| Sponsored placements | ≥1 student placed via sponsorship in pilot |

---

*This document governs the employer-side scope. It pairs with `v1-project-scope.md` (job-seeker side), the technical architecture doc, and the brand/marketing playbook. Any feature addition must be assessed against these success criteria before acceptance.*
