# MongoDB Replica Set Disaster Recovery Simulator

An interactive, educational web application that simulates MongoDB replica set disaster recovery scenarios. This client-side simulator demonstrates failure patterns and manual recovery procedures without connecting to any real database.

## 🎯 Overview

This simulator helps you understand:
- How MongoDB replica sets handle different types of failures
- Manual disaster recovery procedures and their trade-offs
- The importance of quorum in distributed database systems
- How voting rights and node roles affect cluster resilience

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (for development)
- npm or yarn (for development)
- Docker (for deployment)

### 🐳 Docker Deployment (Recommended for Production)

1. **Using Docker Compose (Easiest)**
   ```bash
   docker-compose up -d
   ```
   Access at [http://localhost:3000](http://localhost:3000)

2. **Using Docker directly**
   ```bash
   docker build -t mongodb-dr-simulator .
   docker run -d -p 3000:3000 mongodb-dr-simulator
   ```

### 💻 Development Setup

1. **Clone or navigate to the project directory**
   ```bash
   cd mongodb-dr-simulator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3002](http://localhost:3002) (or the port shown in your terminal)

### Available Scripts

#### Development Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

#### Docker Scripts
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run container on port 8080

## 🐳 Docker Deployment

Simple Docker setup for the MongoDB DR Simulator.

### **Build and Run**

```bash
# Build the image
npm run docker:build

# Run the container  
npm run docker:run

# Access the application
open http://localhost:8080
```

### **Manual Commands**

```bash
# Build manually
docker build -t mongodb-dr-simulator .

# Run manually
docker run -d -p 8080:8080 --name mongodb-dr-simulator mongodb-dr-simulator

# Stop the container
docker stop mongodb-dr-simulator
docker rm mongodb-dr-simulator
```

## 📋 Scenarios

### Scenario 1: Basic DR with Manual Recovery (3 Nodes)
**Architecture:** 2 nodes in Primary DC + 1 node in DR region

**Failure Simulations:**
- **Fail DR Region:** Shows cluster remains operational (2/3 quorum maintained)
- **Fail DC Region:** Cluster loses quorum, becomes read-only

**Manual Recovery Options (after DC failure):**
- **Reconfigure DR as Standalone:** Last-resort action that breaks replica set but restores writes
- **Add 2 New Nodes to DR:** Provisions new nodes to re-establish proper quorum

### Scenario 2: Enhanced DR with Voting Rights Change (5 Nodes)  
**Architecture:** 2 electable nodes in Primary DC + 1 electable + 2 read-only nodes in DR region

**Failure Simulations:**
- **Fail DR Region:** Cluster remains operational (2/3 voting members maintained)
- **Fail DC Region:** Cluster loses quorum, becomes read-only

**Manual Recovery Options (after DC failure):**
- **Grant Voting Rights to Read-Only Nodes:** Promotes read-only nodes to voting members, re-establishes quorum

### Scenario 3: Multi-Datacenter Resilience (5 Nodes)
**Architecture:** 2 nodes in DC1 + 2 nodes in DC2 + 1 node in DR region

**Failure Simulations:**
- **Fail DC1 (Primary's DC):** Demonstrates automatic failover with remaining quorum
- **Fail DC2:** Shows resilience with remaining nodes
- **Fail DR Region:** Cluster remains operational

## 🎮 How to Use

1. **Select a Scenario:** Choose from the three tabs at the top
2. **Review the Architecture:** Study the node layout and regional distribution
3. **Monitor Cluster Status:** Check the control panel for current health
4. **Trigger Failures:** Click failure buttons to simulate disasters
5. **Execute Recovery:** Use recovery action buttons when cluster is down
6. **Watch the Event Log:** Follow the step-by-step narrative of events
7. **Reset & Repeat:** Reset to try different failure patterns

## 🏗️ Architecture

### Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **State Management:** React Hooks (useState, useReducer)

### Component Structure
```
src/
├── components/
│   ├── SimulatorWrapper.tsx      # Main orchestration component
│   ├── ScenarioTabs.tsx          # Scenario selection interface
│   ├── ArchitectureDiagram.tsx   # Visual node layout
│   ├── Node.tsx                  # Individual node display
│   ├── ControlPanel.tsx          # Actions and cluster status
│   └── EventLog.tsx              # Event timeline
├── types/
│   └── index.ts                  # TypeScript interfaces
├── utils/
│   ├── scenarios.ts              # Scenario definitions
│   └── simulation.ts             # Simulation logic
└── app/
    ├── layout.tsx                # Root layout
    ├── page.tsx                  # Main page
    └── globals.css               # Global styles
```

## 🎨 Key Features

### Interactive Visual Elements
- **Node Status:** Real-time visual indicators for role, status, and voting rights
- **Regional Grouping:** Clear geographic organization of nodes
- **Color-Coded States:** Distinct colors for different node states and roles

### Dynamic Simulation Flow
- **Failure Triggers:** Primary buttons for initial failure events
- **Recovery Actions:** Context-sensitive recovery options appear after failures
- **Real-time Updates:** Immediate visual and status updates

### Educational Event Log
- **Step-by-step Narrative:** Clear explanations of each simulation step
- **Technical Details:** Explanations of MongoDB concepts and procedures
- **Timestamp Tracking:** Chronological event ordering

## 🔧 Key MongoDB Concepts Demonstrated

### Replica Set Fundamentals
- **Primary/Secondary Roles:** Node hierarchy and responsibilities
- **Voting Members:** Nodes that participate in elections
- **Quorum Requirements:** Majority needed for write operations

### Disaster Recovery Patterns
- **Geographic Distribution:** Spreading nodes across regions
- **Automatic Failover:** Election processes when primary fails
- **Manual Intervention:** When automatic recovery isn't possible

### Operational Procedures
- **Standalone Reconfiguration:** Emergency measure for write restoration
- **Node Provisioning:** Adding new members to rebuild quorum
- **Voting Rights Management:** Dynamic reconfiguration of member types

## 🧪 Testing the Simulator

### Basic DR Scenario Test
1. Select the "Basic DR" scenario
2. Click "Fail DC Region" - observe cluster becomes read-only
3. Click "Add 2 New Nodes to DR" - verify 2 new nodes appear in DR region
4. Click "Reset Simulation" - verify new nodes disappear and only original 3 nodes remain

### Enhanced DR Scenario Test  
1. Select "Enhanced DR" scenario
2. Click "Fail DC Region" - observe cluster loses quorum
3. Click "Grant Voting Rights to Read-Only Nodes" - verify read-only nodes become voting secondaries
4. Click "Reset Simulation" - verify you stay in Enhanced DR scenario with 5 original nodes

### Multi-DC Scenario Test
1. Select "Multi-DC" scenario  
2. Click "Fail DC1 (Primary's DC)" - observe automatic failover to DC2
3. Click "Reset Simulation" - verify you stay in Multi-DC scenario with 5 original nodes

## 🚀 Deployment

### Production Deployment
For production deployment, see the detailed [DEPLOYMENT.md](./DEPLOYMENT.md) guide which covers:
- Docker deployment (recommended)
- Cloud platform deployment (Heroku, Railway, Vercel)
- VPS/Server deployment
- CI/CD pipeline setup
- Performance optimization
- Security considerations

### Quick Deploy Commands
```bash
# Production build
npm run build

# Docker deployment
docker-compose up -d

# Check deployment
curl http://localhost:3000
```

## 🚨 Important Notes

- **Educational Purpose:** This is a simulation for learning - it does not connect to real databases
- **Simplified Model:** Real MongoDB deployments have additional complexity
- **No Data Persistence:** Simulation state resets on page refresh
- **Client-Side Only:** All logic runs in the browser

## 🤝 Contributing

This is an educational tool. Suggestions for additional scenarios or improvements are welcome!

## 📄 License

This project is created for educational purposes.

---

**Ready to explore MongoDB disaster recovery?** Start the application and select your first scenario! 🚀
