# Sprint 1 Retrospective
* **Date:** Nov 5, 2025
* **Attendees:** Amrutha, Ananya A C, Nidhi, Ananya L, Kusumitha

### What Went Well?
* We successfully implemented all core API features (Store, Get, Delete, TTL).
* The team quickly adapted to the new tech stack (Go).

### What Didn't Go Well?
* **CI/CD Failure:** We attempted to set up the CI/CD pipeline (`SCRUM-20`), but we could not get the build and test stages to pass consistently by the end of the sprint. The pipeline remains broken.
* **Review Speed:** We were slow to review each other's Pull Requests, causing code to sit in "In Review" for too long.

### Action Items for Sprint 2
* **Priority 1:** Fix the CI/CD pipeline immediately. We must get all 5 stages (Build, Test, Coverage, Lint, Security) green before merging new features.
* Enforce a rule to review all open PRs within 12 hours.

---

# Sprint 2 Retrospective
* **Date:** Nov 13, 2025
* **Attendees:** Amrutha, Ananya A C, Nidhi, Ananya L, Kusumitha

### What Went Well?
* **Pipeline Success:** We successfully fixed the CI/CD pipeline issues from Sprint 1. We now have a fully automated 5-stage pipeline that enforces quality gates (75% coverage) on every PR.
* **High Velocity:** We completed all 9 advanced features (Eviction, Persistence, Auth, etc.) in a very short timeframe.
* **Collaboration:** All team members contributed effectively to the codebase, maintaining good commit discipline throughout the sprint.

### What Didn't Go Well?
* **Git Synchronization:** We encountered major synchronization issues with the remote repository towards the end of the sprint. This resulted in complex merge conflicts and required a force-push to stabilize the `main` and `develop` branches.
* **Jira Planning:** We made a planning error by adding Story Points *after* the sprint had already started. This created a large "spike" in our burndown chart, making progress tracking difficult.

### Action Items for Future Projects
* **Git Workflow:** We need to establish a stricter branching and merging policy to avoid synchronization conflicts in the final days.
* **Jira First:** All user stories must have points assigned *before* clicking "Start Sprint."
