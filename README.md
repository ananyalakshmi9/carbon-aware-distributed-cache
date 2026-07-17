# 🚀 Simple Caching Service

**Project ID:** P76  
**Course:** UE23CS341A  
**Academic Year:** 2025  
**Semester:** 5th Sem  
**Campus:** EC  
**Branch:** CSE  
**Section:** A  
**Team:** Visionaries  

---

## 📋 Project Description

An in-memory caching service that provides APIs to store, retrieve, and delete key-value pairs with time-to-live (TTL) expiration.  
This repository includes both backend (Node.js + Express) and frontend (React) code along with a complete CI/CD pipeline.

---

## 👨‍💻 Development Team (Visionaries)

- [@ananyalakshmi9](https://github.com/ananyalakshmi9) — Scrum Master  
- [@nidhi-c-r](https://github.com/nidhi-c-r) — Developer  
- [@AmruthaPJ](https://github.com/AmruthaPJ) — Developer  
- [@ananyaac2104](https://github.com/ananyaac2104) — Developer  
- [@pes2ug22cs278](https://github.com/pes2ug22cs278) — Developer  

---

## 👩‍🏫 Teaching Assistants

- [@itsjiyapatel](https://github.com/itsjiyapatel)  
- [@Greesh-SE](https://github.com/Greesh-SE)  
- [@Siri2512](https://github.com/Siri2512)  
- [@Hurry-sh](https://github.com/Hurry-sh)  
- [@pes2ug22cs137](https://github.com/pes2ug22cs137)

---

## 👨‍⚖️ Faculty Supervisor

- [@Animesh](https://github.com/Animesh)

---

## ⚙️ CI/CD Pipeline (SCRUM-27)

This project uses **GitHub Actions** for automated Continuous Integration and Deployment (CI/CD).

### 🧩 Pipeline Overview

The pipeline is defined in `.github/workflows/ci.yml` and includes the following **5 stages**:

1. **Install** — Installs dependencies for both frontend and backend  
2. **Lint** — Runs ESLint to check for code quality  
3. **Build** — Builds the React frontend  
4. **Test** — Executes Jest tests for backend with coverage reports  
5. **Package** — Packages the project into a deployable zip artifact  

### 🧪 Test Coverage

After running the test stage, a coverage report is generated and uploaded as an artifact.  
You can view it in **Actions → Workflow Run → Artifacts → backend-coverage**.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v8 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/pestechnology/PESU_EC_CSE_A_P76_Simple_Caching_Service_visionaries.git
cd PESU_EC_CSE_A_P76_Simple_Caching_Service_visionaries
```

# Install backend dependencies
```bash
cd src/backend
npm install
```

# Install frontend dependencies
```bash
cd ../frontend
npm install
```

Run the Application
Backend
```bash
cd src/backend
npm start
```

Frontend
```bash
cd src/frontend
npm start
```
# 📁 Project Structure
```bash
PESU_EC_CSE_A_P76_Simple_Caching_Service_visionaries/
├── src/
│   ├── backend/
│   │   ├── cache/          # Cache logic
│   │   ├── test/           # Backend test cases
│   │   ├── server.js       # Express server
│   │   └── package.json
│   ├── frontend/
│   │   ├── src/            # React source code
│   │   └── package.json
│
├── .github/
│   └── workflows/ci.yml    # CI/CD pipeline definition
│
├── README.md
└── package-lock.json
```
# 🧠 Development Guidelines
Branching Strategy
main → Production-ready branch

develop → Active development branch

feature/* → Feature-specific branches

bugfix/* → Bug fix branches

Commit Message Convention
Follow the Conventional Commits format:

```vbnet
Copy code
feat: new feature
fix: bug fix
docs: documentation changes
style: formatting changes (no logic)
refactor: code refactoring
test: test-related changes
```
Example:

```scss
Copy code
feat(SCRUM-25): add /metrics endpoint for cache statistics
```
# 🧪 Testing
Run backend tests locally:

```bash
cd src/backend
npm test
```
To view coverage:

```bash
npm run test:coverage
```
Coverage report will be saved under /coverage/lcov-report/.

# 📚 Documentation
API Documentation

Developer Guide

User Guide

# 📄 License
This project was developed for educational purposes as part of
UE23CS341A – Software Engineering (2025 Batch) at PES University.
# carbon-aware-distributed-cache
