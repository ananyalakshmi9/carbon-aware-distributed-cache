# Sprint 1 Retrospective
* **Date:** Nov 5, 2025
* **Attendees:** Amrutha, Ananya A C, Nidhi, Ananya L, Kusumitha

### What Went Well?
* We successfully implemented all core API features (Store, Get, Delete, TTL).
* We got a basic 5-stage CI/CD pipeline running early in the project.

### What Didn't Go Well?
* **Pipeline Complexity:** The CI/CD pipeline setup (`SCRUM-20`) took longer than estimated, which blocked some of the initial API testing.
* **Review Speed:** We were slow to review each other's Pull Requests, causing code to sit in "In Review" for too long.

### Action Items for Sprint 2
* Implement CI/CD quality gates (`SCRUM-22`, `-23`) immediately at the start of the sprint.
* Enforce a rule to review all open PRs within 12 hours.

---

# Sprint 2 Retrospective
* **Date:** Nov 13, 2025
* **Attendees:** Amrutha, Ananya A C, Nidhi, Ananya L, Kusumitha

### What Went Well?
* **High Velocity:** We successfully implemented all 9 advanced features (Eviction, Persistence, Auth, etc.) in a very short timeframe.
* **Quality Gates:** We successfully configured the pipeline to enforce 75% code coverage, ensuring high code quality despite the speed.
* **Collaboration:** All team members contributed effectively to the codebase, maintaining good commit discipline throughout the sprint.

### What Didn't Go Well?
* **Git Synchronization:** We encountered major synchronization issues with the remote repository towards the end of the sprint. This resulted in complex merge conflicts and required a force-push to stabilize the `main` and `develop` branches.
* **Jira Planning:** We made a planning error by adding Story Points *after* the sprint had already started. This created a large "spike" in our burndown chart, making progress tracking difficult.

### Action Items for Future Projects
* **Git Workflow:** We need to establish a stricter branching and merging policy to avoid synchronization conflicts in the final days.
* **Jira First:** All user stories must have points assigned *before* clicking "Start Sprint."
