# Agora Jobs — Project Scope Overview

---

## Problem

International students face significant barriers when searching for employment due to a combination of legal, linguistic, and professional constraints that generic job platforms do not address.

### Key Challenges

1. **Visa Policy Compliance** — Students must navigate complex restrictions including:
   - Permitted study programme work conditions
   - Maximum working hours per week
   - Prohibition on self-employment in most visa categories

2. **Educational Stream Alignment** — Job roles must be relevant to the student's field of study to comply with visa conditions and maximise career value.

3. **Experience Matching** — Students have limited work history; jobs must be calibrated to their actual experience level rather than filtering them out.

4. **German Language Level** — Many roles require a minimum language proficiency (A1–C2); students need matches that respect their current level.

5. **Additional Skills & Certifications** — Soft skills, vocational certificates, and industry-specific qualifications are often decisive but invisible to standard keyword search.

---

## Solution

Agora Jobs collects the student's full professional profile and uses AI to surface only the jobs they are realistically eligible and qualified for.

### Student Inputs

| Input | Purpose |
|---|---|
| Resume (Master CV) | Baseline skills, education, and experience |
| Visa Details | Filter by legal work eligibility and hour limits |
| Certificates | Surface additional qualifications beyond the degree |

### Core Output

A curated, ranked job list where every result already passes visa, language, experience, and qualification filters — removing the need for manual screening.

Students can then **Apply** or **Save for Later** directly from this list.

---

## Features

### Admin Level

| # | Feature | Description |
|---|---|---|
| 1 | Job Listing Master Preparation | Create and structure the canonical job database |
| 2 | Regular Listing Updates | Keep job data current via scheduled refresh cycles |
| 3 | Job Delisting | Remove expired, filled, or ineligible postings |
| 4 | AI-Powered Data Mining | Automatically discover and ingest new job postings via AI scraping |

---

### Student Level

| # | Feature | Description |
|---|---|---|
| 1 | Save Job for Later | Bookmark jobs to review or apply to at a future time |
| 2 | Job Score (Master CV) | AI-generated match score between the job and the student's Master CV |
| 3 | Job-CV & Cover Letter Generation | Rewrite the Master CV into an ATS-optimised Job-CV and draft a Cover Letter for the selected job, guided by an interactive conversation with the student |
| 4 | Rescore with Job-CV | Recalculate the match score after the tailored Job-CV has been generated |
| 5 | Interview Preparation | Provide curated learning resources and practice materials relevant to the job role |
| 6 | Apply for Job | One-click application; system records the job in the student's Applied Jobs list |
| 7 | Applied Job Detail Page | Side-by-side view of the job requirements and the CV version that was submitted |
| 8 | Dashboard | Unified view of Applied Jobs and Saved (Apply Later) Jobs |

---

## Student Journey

```
Upload Resume + Visa + Certificates
            │
            ▼
    AI Profile Analysis
            │
            ▼
  Filtered & Ranked Job List
         /        \
        /          \
  Save for Later   View Job Details
                        │
                        ▼
               Generate Job-CV + Cover Letter
               (interactive with Ari)
                        │
                        ▼
               Rescore against Job-CV
                        │
                        ▼
               Interview Preparation
                        │
                        ▼
                  Apply for Job
                        │
                        ▼
              Applied Jobs Dashboard
```

---

*Last updated: 2026-06-14*
