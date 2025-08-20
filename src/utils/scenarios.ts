import {
  Scenario,
  ScenarioType,
  MongoNode,
  NodeRole,
  NodeStatus,
  VotingRights,
  Region,
} from '@/types';

// Scenario 0: Single Region No DR (3 nodes in one region)
export const singleRegionNoDRScenario: Scenario = {
  id: ScenarioType.SINGLE_REGION_NO_DR,
  name: '1 Region No DR',
  description: '3-node replica set in single region: operational with quorum (2+ nodes), read-only without quorum (1 node), down when all nodes fail',
  regions: [
    {
      id: 'single-region',
      name: 'Production Region',
      type: 'primary',
      nodes: ['node-1', 'node-2', 'node-3'],
    },
  ],
  nodes: [
    {
      id: 'node-1',
      name: 'Node 1',
      role: NodeRole.PRIMARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'single-region',
      datacenter: 'Region-A',
    },
    {
      id: 'node-2',
      name: 'Node 2',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'single-region',
      datacenter: 'Region-A',
    },
    {
      id: 'node-3',
      name: 'Node 3',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'single-region',
      datacenter: 'Region-A',
    },
  ],
};

// Scenario 1: Basic DR (3 nodes)
export const basicDRScenario: Scenario = {
  id: ScenarioType.BASIC_DR,
  name: 'Basic DR with Manual Recovery',
  description: 'Primary DC with 2 electable nodes, DR region with 1 electable node',
  regions: [
    {
      id: 'primary-dc',
      name: 'Primary DC (Region-A)',
      type: 'primary',
      nodes: ['node-1', 'node-2'],
    },
    {
      id: 'dr-region',
      name: 'DR Region (Region-B)',
      type: 'dr',
      nodes: ['node-3'],
    },
  ],
  nodes: [
    {
      id: 'node-1',
      name: 'Node 1',
      role: NodeRole.PRIMARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'primary-dc',
      datacenter: 'Region-A',
    },
    {
      id: 'node-2',
      name: 'Node 2',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'primary-dc',
      datacenter: 'Region-A',
    },
    {
      id: 'node-3',
      name: 'Node 3',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dr-region',
      datacenter: 'Region-B',
    },
  ],
};

// Scenario 2: Enhanced DR (5 nodes)
export const enhancedDRScenario: Scenario = {
  id: ScenarioType.ENHANCED_DR,
  name: 'Enhanced DR with Voting Rights Change',
  description: 'Primary DC with 2 electable nodes, DR region with 1 electable + 2 read-only nodes',
  regions: [
    {
      id: 'primary-dc',
      name: 'Primary DC (Region-A)',
      type: 'primary',
      nodes: ['node-1', 'node-2'],
    },
    {
      id: 'dr-region',
      name: 'DR Region (Region-B)',
      type: 'dr',
      nodes: ['node-3', 'node-4', 'node-5'],
    },
  ],
  nodes: [
    {
      id: 'node-1',
      name: 'Node 1',
      role: NodeRole.PRIMARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'primary-dc',
      datacenter: 'Region-A',
    },
    {
      id: 'node-2',
      name: 'Node 2',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'primary-dc',
      datacenter: 'Region-A',
    },
    {
      id: 'node-3',
      name: 'Node 3',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dr-region',
      datacenter: 'Region-B',
    },
    {
      id: 'node-4',
      name: 'Node 4',
      role: NodeRole.READ_ONLY,
      status: NodeStatus.UP,
      votingRights: VotingRights.NON_VOTER,
      region: 'dr-region',
      datacenter: 'Region-B',
    },
    {
      id: 'node-5',
      name: 'Node 5',
      role: NodeRole.READ_ONLY,
      status: NodeStatus.UP,
      votingRights: VotingRights.NON_VOTER,
      region: 'dr-region',
      datacenter: 'Region-B',
    },
  ],
};

// Scenario 3: Multi-Datacenter (5 nodes)
export const multiDCScenario: Scenario = {
  id: ScenarioType.MULTI_DC,
  name: 'Multi-Datacenter Resilience',
  description: 'Primary DC1 with 2 nodes, Secondary DC2 with 2 nodes, DR region with 1 node',
  regions: [
    {
      id: 'primary-dc1',
      name: 'Primary DC1 (Region-A)',
      type: 'primary',
      nodes: ['node-1', 'node-2'],
    },
    {
      id: 'secondary-dc2',
      name: 'Secondary DC2 (Region C)',
      type: 'secondary',
      nodes: ['node-3', 'node-4'],
    },
    {
      id: 'dr-region',
      name: 'DR Region (Region-B)',
      type: 'dr',
      nodes: ['node-5'],
    },
  ],
  nodes: [
    {
      id: 'node-1',
      name: 'Node 1',
      role: NodeRole.PRIMARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'primary-dc1',
      datacenter: 'Region-A',
    },
    {
      id: 'node-2',
      name: 'Node 2',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'primary-dc1',
      datacenter: 'Region-A',
    },
    {
      id: 'node-3',
      name: 'Node 3',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'secondary-dc2',
      datacenter: 'Region C',
    },
    {
      id: 'node-4',
      name: 'Node 4',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'secondary-dc2',
      datacenter: 'Region C',
    },
    {
      id: 'node-5',
      name: 'Node 5',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dr-region',
      datacenter: 'Region-B',
    },
  ],
};

// Scenario 4: Enhanced DR with 2-Step Manual Recovery (4 nodes)
export const enhanced2StepScenario: Scenario = {
  id: ScenarioType.ENHANCED_2_STEP,
  name: 'Enhanced DR with 2-Step Recovery',
  description: 'Primary DC with 2 electable nodes, DR region with 1 electable + 1 read-only node',
  regions: [
    {
      id: 'primary-dc',
      name: 'Primary DC (Region-A)',
      type: 'primary',
      nodes: ['node-1', 'node-2'],
    },
    {
      id: 'dr-region',
      name: 'DR Region (Region-B)',
      type: 'dr',
      nodes: ['node-3', 'node-4'],
    },
  ],
  nodes: [
    {
      id: 'node-1',
      name: 'Node 1',
      role: NodeRole.PRIMARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'primary-dc',
      datacenter: 'Region-A',
    },
    {
      id: 'node-2',
      name: 'Node 2',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'primary-dc',
      datacenter: 'Region-A',
    },
    {
      id: 'node-3',
      name: 'Node 3',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dr-region',
      datacenter: 'Region-B',
    },
    {
      id: 'node-4',
      name: 'Read-Only Node 4',
      role: NodeRole.READ_ONLY,
      status: NodeStatus.UP,
      votingRights: VotingRights.NON_VOTER,
      region: 'dr-region',
      datacenter: 'Region-B',
    },
  ],
};

// Scenario 5: Hot Standby with Cluster-to-Cluster Sync
export const hotStandbyScenario: Scenario = {
  id: ScenarioType.HOT_STANDBY,
  name: 'Hot Standby Cluster-to-Cluster',
  description: 'Two independent replica sets: DC cluster serves applications, DR cluster operational but invisible to apps until failover',
  regions: [
    {
      id: 'dc-cluster',
      name: 'DC Cluster (Region-A)',
      type: 'cluster',
      clusterState: 'active',
      hasSync: true,
      nodes: ['dc-primary', 'dc-secondary1', 'dc-secondary2'],
    },
    {
      id: 'dr-cluster',
      name: 'DR Cluster (Region-B)',
      type: 'cluster',
      clusterState: 'standby',
      hasSync: false,
      nodes: ['dr-primary', 'dr-secondary1', 'dr-secondary2'],
    },
  ],
  nodes: [
    // DC Cluster
    {
      id: 'dc-primary',
      name: 'DC Primary (Active)',
      role: NodeRole.PRIMARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dc-cluster',
      datacenter: 'Region-A',
    },
    {
      id: 'dc-secondary1',
      name: 'DC Secondary 1 (Active)',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dc-cluster',
      datacenter: 'Region-A',
    },
    {
      id: 'dc-secondary2',
      name: 'DC Secondary 2 (Active)',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dc-cluster',
      datacenter: 'Region-A',
    },
    // DR Cluster - Operational with own primary, but invisible to applications
    {
      id: 'dr-primary',
      name: 'DR Primary (Invisible)',
      role: NodeRole.PRIMARY, // Has its own primary
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dr-cluster',
      datacenter: 'Region-B',
    },
    {
      id: 'dr-secondary1',
      name: 'DR Secondary 1 (Invisible)',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dr-cluster',
      datacenter: 'Region-B',
    },
    {
      id: 'dr-secondary2',
      name: 'DR Secondary 2 (Invisible)',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dr-cluster',
      datacenter: 'Region-B',
    },
  ],
};

// Scenario 6: Cold Standby with Backup and Restore
export const coldStandbyScenario: Scenario = {
  id: ScenarioType.COLD_STANDBY,
  name: 'Cold Standby with Backup Restore',
  description: 'DC cluster with backup storage in both DC and DR regions for comprehensive backup strategy',
  regions: [
    {
      id: 'dc-cluster',
      name: 'DC Cluster (Region-A)',
      type: 'cluster',
      clusterState: 'active',
      nodes: ['dc-primary', 'dc-secondary1', 'dc-secondary2'],
    },
    {
      id: 'dc-backup-storage',
      name: 'DC Backup Storage (Region-A)',
      type: 'backup',
      clusterState: 'active',
      nodes: [], // No MongoDB nodes - this is storage infrastructure
    },
    {
      id: 'dr-backup-storage',
      name: 'DR Backup Storage (Region-B)',
      type: 'backup',
      clusterState: 'active',
      nodes: [], // No MongoDB nodes - this is storage infrastructure
    },
  ],
  nodes: [
    // DC Cluster - Only actual MongoDB nodes
    {
      id: 'dc-primary',
      name: 'DC Primary',
      role: NodeRole.PRIMARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dc-cluster',
      datacenter: 'Region-A',
    },
    {
      id: 'dc-secondary1',
      name: 'DC Secondary 1',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dc-cluster',
      datacenter: 'Region-A',
    },
    {
      id: 'dc-secondary2',
      name: 'DC Secondary 2',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dc-cluster',
      datacenter: 'Region-A',
    },
    // No backup storage nodes - they are infrastructure, not MongoDB nodes
  ],
};

export const scenarios: Record<ScenarioType, Scenario> = {
  [ScenarioType.SINGLE_REGION_NO_DR]: singleRegionNoDRScenario,
  [ScenarioType.BASIC_DR]: basicDRScenario,
  [ScenarioType.ENHANCED_DR]: enhancedDRScenario,
  [ScenarioType.MULTI_DC]: multiDCScenario,
  [ScenarioType.ENHANCED_2_STEP]: enhanced2StepScenario,
  [ScenarioType.HOT_STANDBY]: hotStandbyScenario,
  [ScenarioType.COLD_STANDBY]: coldStandbyScenario,
};
