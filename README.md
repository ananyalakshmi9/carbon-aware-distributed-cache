# 🌿 Carbon-Aware Distributed Cache

A sustainable, spatiotemporal distributed caching service designed to minimize energy grid carbon footprints. The system dynamically routes and evicts keys based on regional diurnal grid carbon intensity forecasts, client-defined computation weights, and local capacity constraints.

---

## 📋 System Architecture

The cache consists of three core components:
1. **Hash Ring Coordinator:** Proxies client requests using a `SHA-256` consistent hashing ring with configurable virtual nodes (default: 150) for load distribution.
2. **Region Caching Nodes:** Local Express-based cache processes that track logical clocks, access frequencies, and client recompute costs.
3. **Diurnal Carbon Service:** Generates simulated hourly grid carbon intensity (gCO₂/kWh) curves based on regional profiles (`us-west` solar peak, `eu-central` wind peak, `us-east` fossil-heavy baseload) or hooks into the live **Electricity Maps API**.

```
                   [ Client / Simulator ]
                             │
                             ▼
               [ Consistent Hash Coordinator ]
                /            │            \
         (us-east)       (us-west)     (eu-central)
             │               │              │
       [Cache Node 1]  [Cache Node 2]  [Cache Node 3]
```

---

## ✨ Key Features

* **Cost-Weighted Eviction Scoring:** Moves beyond standard LRU to prioritize retaining high-cost values (e.g., expensive database computations):
  $$\text{Score} = (w_{\text{rec}} \times \text{Recency}) + (w_{\text{freq}} \times \text{Frequency}) + (w_{\text{cost}} \times \text{RecomputeCost})$$
* **Capacity-Balanced Carbon Placement:** To prevent the "herd effect" (where all writes overload a single green node during grid clean spells), the coordinator filters out candidate nodes exceeding $80\%$ of their capacity.
* **Dual-Threshold Rebalancing:** Periodically scans keys and migrates them to cleaner grids if the carbon savings offset the migration cost. Uses a relaxed $90\%$ occupancy threshold for migration targets to resolve congestion deadlocks.
* **Comparative Evaluation Harness:** Simulates 24 hours of Zipfian workload traffic ($\alpha = 1.0$) across five caching topologies to benchmark carbon footprints, hit rates, and latencies.
* **React Dashboard:** Features real-time cluster metrics, node capacity indicators, time sliders, manual rebalance triggers, and a live decision log feed.

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18 or higher)
* npm (v8 or higher)

### 1. Installation
Clone the repository and install dependencies:
```bash
# Clone the repository
git clone https://github.com/ananyalakshmi9/simple-caching-machine.git
cd simple-caching-machine

# Install backend dependencies
cd src/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Start the Cluster Locally
You can launch a full local cluster (3 nodes + 1 coordinator) using the convenience script from the root folder:
```bash
# Start cluster
./start-cluster.sh
```

### 3. Open the React Dashboard
In a separate terminal, start the React dev server:
```bash
cd src/frontend
npm start
```
Open **`http://localhost:3000`** in your browser to view the live dashboard.

---

## 🧪 Testing & Evaluation

### Run Backend Tests
Run the Jest integration and unit test suites:
```bash
cd src/backend
npm test
```

### Run the Evaluation Harness
To execute the workload generator and benchmark the five system configurations:
```bash
cd src/backend
node simulate.js
```
The script outputs the comparative table to your console and exports raw metrics to `docs/sim-results.csv` and `docs/sim-results.json`.

---

## 📁 Project Structure

```bash
simple-caching-machine/
├── src/
│   ├── backend/
│   │   ├── cache/            # Local cache class & snapshots
│   │   ├── test/             # Unit and integration test suites
│   │   ├── server.js         # Local cache node Express API
│   │   ├── coordinator.js    # Cluster routing & rebalancing proxy
│   │   ├── hashRing.js       # Consistent hashing ring implementation
│   │   ├── carbonData.js     # Diurnal curves & API connector
│   │   └── simulate.js       # Workload simulator & evaluation harness
│   │
│   └── frontend/
│       ├── src/              # React App dashboard components
│       └── package.json
│
├── docs/                     # Evaluation results and reports
├── start-cluster.sh          # Local processes launcher script
└── README.md
```
