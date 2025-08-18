import {
  Scenario,
  ScenarioType,
  MongoNode,
  NodeRole,
  NodeStatus,
  VotingRights,
  Region,
} from '@/types';

// Scenario 1: Basic DR (3 nodes)
export const basicDRScenario: Scenario = {
  id: ScenarioType.BASIC_DR,
  name: 'Basic DR with Manual Recovery',
  description: 'Primary DC with 2 electable nodes, DR region with 1 electable node',
  regions: [
    {
      id: 'primary-dc',
      name: 'Primary DC (US-EAST-1)',
      type: 'primary',
      nodes: ['node-1', 'node-2'],
    },
    {
      id: 'dr-region',
      name: 'DR Region (EU-WEST-1)',
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
      datacenter: 'US-EAST-1',
    },
    {
      id: 'node-2',
      name: 'Node 2',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'primary-dc',
      datacenter: 'US-EAST-1',
    },
    {
      id: 'node-3',
      name: 'Node 3',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dr-region',
      datacenter: 'EU-WEST-1',
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
      name: 'Primary DC (US-EAST-1)',
      type: 'primary',
      nodes: ['node-1', 'node-2'],
    },
    {
      id: 'dr-region',
      name: 'DR Region (EU-WEST-1)',
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
      datacenter: 'US-EAST-1',
    },
    {
      id: 'node-2',
      name: 'Node 2',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'primary-dc',
      datacenter: 'US-EAST-1',
    },
    {
      id: 'node-3',
      name: 'Node 3',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dr-region',
      datacenter: 'EU-WEST-1',
    },
    {
      id: 'node-4',
      name: 'Node 4',
      role: NodeRole.READ_ONLY,
      status: NodeStatus.UP,
      votingRights: VotingRights.NON_VOTER,
      region: 'dr-region',
      datacenter: 'EU-WEST-1',
    },
    {
      id: 'node-5',
      name: 'Node 5',
      role: NodeRole.READ_ONLY,
      status: NodeStatus.UP,
      votingRights: VotingRights.NON_VOTER,
      region: 'dr-region',
      datacenter: 'EU-WEST-1',
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
      name: 'Primary DC1 (US-EAST-1)',
      type: 'primary',
      nodes: ['node-1', 'node-2'],
    },
    {
      id: 'secondary-dc2',
      name: 'Secondary DC2 (US-WEST-1)',
      type: 'secondary',
      nodes: ['node-3', 'node-4'],
    },
    {
      id: 'dr-region',
      name: 'DR Region (EU-WEST-1)',
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
      datacenter: 'US-EAST-1',
    },
    {
      id: 'node-2',
      name: 'Node 2',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'primary-dc1',
      datacenter: 'US-EAST-1',
    },
    {
      id: 'node-3',
      name: 'Node 3',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'secondary-dc2',
      datacenter: 'US-WEST-1',
    },
    {
      id: 'node-4',
      name: 'Node 4',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'secondary-dc2',
      datacenter: 'US-WEST-1',
    },
    {
      id: 'node-5',
      name: 'Node 5',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTER,
      region: 'dr-region',
      datacenter: 'EU-WEST-1',
    },
  ],
};

export const scenarios: Record<ScenarioType, Scenario> = {
  [ScenarioType.BASIC_DR]: basicDRScenario,
  [ScenarioType.ENHANCED_DR]: enhancedDRScenario,
  [ScenarioType.MULTI_DC]: multiDCScenario,
};
