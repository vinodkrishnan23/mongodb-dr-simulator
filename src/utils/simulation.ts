import {
  MongoNode,
  ClusterStatus,
  NodeRole,
  NodeStatus,
  VotingRights,
  LogEvent,
  EventType,
  ScenarioType,
} from '@/types';

// Generate unique ID for events
export const generateEventId = (): string => {
  return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Create log event
export const createLogEvent = (
  type: EventType,
  message: string,
  details?: string
): LogEvent => ({
  id: generateEventId(),
  timestamp: new Date(),
  type,
  message,
  details,
});

// Calculate cluster status
export const calculateClusterStatus = (nodes: MongoNode[]): ClusterStatus => {
  const upNodes = nodes.filter(node => node.status === NodeStatus.UP);
  const votingNodes = upNodes.filter(node => node.votingRights === VotingRights.VOTER);
  const totalVotingNodes = nodes.filter(node => node.votingRights === VotingRights.VOTER).length;
  
  const hasQuorum = votingNodes.length > totalVotingNodes / 2;
  const primaryNode = upNodes.find(node => node.role === NodeRole.PRIMARY);
  const isOperational = hasQuorum && !!primaryNode;
  
  return {
    isOperational,
    hasQuorum,
    canWrite: isOperational,
    votingNodes: votingNodes.length,
    totalNodes: nodes.length,
    primaryNode: primaryNode?.id,
  };
};

// Fail region utility
export const failRegion = (nodes: MongoNode[], regionId: string): MongoNode[] => {
  return nodes.map(node => 
    node.region === regionId
      ? { ...node, status: NodeStatus.DOWN }
      : node
  );
};

// Find new primary after failure
export const electNewPrimary = (nodes: MongoNode[]): MongoNode[] => {
  const upVotingNodes = nodes.filter(
    node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTER
  );
  
  // If no primary exists and we have quorum, elect a new one
  const hasPrimary = upVotingNodes.some(node => node.role === NodeRole.PRIMARY);
  if (!hasPrimary && upVotingNodes.length > 0) {
    const newPrimary = upVotingNodes[0];
    return nodes.map(node => 
      node.id === newPrimary.id
        ? { ...node, role: NodeRole.PRIMARY }
        : node.role === NodeRole.PRIMARY
        ? { ...node, role: NodeRole.SECONDARY }
        : node
    );
  }
  
  return nodes;
};

// Recovery actions for Scenario 1 (Basic DR)
export const reconfigureStandalone = (nodes: MongoNode[]): { 
  updatedNodes: MongoNode[]; 
  logEvents: LogEvent[]; 
} => {
  const drNode = nodes.find(node => node.region === 'dr-region' && node.status === NodeStatus.UP);
  if (!drNode) {
    return {
      updatedNodes: nodes,
      logEvents: [createLogEvent(EventType.WARNING, 'No DR node available for standalone reconfiguration')],
    };
  }

  const updatedNodes = nodes.map(node => 
    node.id === drNode.id
      ? { ...node, role: NodeRole.STANDALONE }
      : node
  );

  const logEvents = [
    createLogEvent(
      EventType.RECOVERY_ACTION,
      'Reconfiguring DR node as standalone',
      'This is a last-resort action that breaks the replica set but restores write capability'
    ),
    createLogEvent(
      EventType.STATUS_CHANGE,
      `Node ${drNode.name} is now operating as a standalone instance`,
      'The node can accept writes but is no longer part of a replica set'
    ),
  ];

  return { updatedNodes, logEvents };
};

export const addNewNodesToDR = (nodes: MongoNode[]): {
  updatedNodes: MongoNode[];
  logEvents: LogEvent[];
} => {
  const drNode = nodes.find(node => node.region === 'dr-region' && node.status === NodeStatus.UP);
  if (!drNode) {
    return {
      updatedNodes: nodes,
      logEvents: [createLogEvent(EventType.WARNING, 'No DR node available to add new nodes to')],
    };
  }

  // Add two new nodes to DR region
  const newNode1: MongoNode = {
    id: 'node-dr-new-1',
    name: 'DR Node New 1',
    role: NodeRole.SECONDARY,
    status: NodeStatus.UP,
    votingRights: VotingRights.VOTER,
    region: 'dr-region',
    datacenter: 'EU-WEST-1',
  };

  const newNode2: MongoNode = {
    id: 'node-dr-new-2',
    name: 'DR Node New 2',
    role: NodeRole.SECONDARY,
    status: NodeStatus.UP,
    votingRights: VotingRights.VOTER,
    region: 'dr-region',
    datacenter: 'EU-WEST-1',
  };

  // Promote original DR node to primary
  const updatedNodes = [
    ...nodes.map(node => 
      node.id === drNode.id
        ? { ...node, role: NodeRole.PRIMARY }
        : node.role === NodeRole.PRIMARY
        ? { ...node, role: NodeRole.SECONDARY }
        : node
    ),
    newNode1,
    newNode2,
  ];

  const logEvents = [
    createLogEvent(
      EventType.RECOVERY_ACTION,
      'Provisioning 2 new nodes in DR region',
      'Adding new voting members to re-establish quorum'
    ),
    createLogEvent(
      EventType.QUORUM,
      'Quorum re-established with 3 of 3 voting members online'
    ),
    createLogEvent(
      EventType.ELECTION,
      `Election completed: ${drNode.name} promoted to Primary`
    ),
    createLogEvent(
      EventType.SUCCESS,
      'Cluster is now operational with write capability restored'
    ),
  ];

  return { updatedNodes, logEvents };
};

// Recovery action for Scenario 2 (Enhanced DR)
export const grantVotingRights = (nodes: MongoNode[]): {
  updatedNodes: MongoNode[];
  logEvents: LogEvent[];
} => {
  const drElectableNode = nodes.find(
    node => node.region === 'dr-region' && 
             node.status === NodeStatus.UP && 
             node.votingRights === VotingRights.VOTER
  );

  if (!drElectableNode) {
    return {
      updatedNodes: nodes,
      logEvents: [createLogEvent(EventType.WARNING, 'No electable DR node available')],
    };
  }

  // Grant voting rights to read-only nodes in DR region
  const updatedNodes = nodes.map(node => 
    node.region === 'dr-region' && 
    node.status === NodeStatus.UP && 
    node.role === NodeRole.READ_ONLY
      ? { ...node, votingRights: VotingRights.VOTER, role: NodeRole.SECONDARY }
      : node.id === drElectableNode.id
      ? { ...node, role: NodeRole.PRIMARY }
      : node.role === NodeRole.PRIMARY
      ? { ...node, role: NodeRole.SECONDARY }
      : node
  );

  const logEvents = [
    createLogEvent(
      EventType.RECOVERY_ACTION,
      'Granting voting rights to read-only nodes in DR region',
      'Reconfiguring read-only nodes to become voting members'
    ),
    createLogEvent(
      EventType.QUORUM,
      'Quorum re-established with 3 of 3 voting members online'
    ),
    createLogEvent(
      EventType.ELECTION,
      `Election completed: ${drElectableNode.name} promoted to Primary`
    ),
    createLogEvent(
      EventType.SUCCESS,
      'Cluster is now operational with write capability restored'
    ),
  ];

  return { updatedNodes, logEvents };
};

// Get failure actions for each scenario
export const getFailureActions = (scenario: ScenarioType) => {
  switch (scenario) {
    case ScenarioType.BASIC_DR:
      return [
        { id: 'fail-dr', label: 'Fail DR Region', regionId: 'dr-region' },
        { id: 'fail-dc', label: 'Fail DC Region', regionId: 'primary-dc' },
      ];
    case ScenarioType.ENHANCED_DR:
      return [
        { id: 'fail-dr', label: 'Fail DR Region', regionId: 'dr-region' },
        { id: 'fail-dc', label: 'Fail DC Region', regionId: 'primary-dc' },
      ];
    case ScenarioType.MULTI_DC:
      return [
        { id: 'fail-dc1', label: 'Fail DC1 (Primary\'s DC)', regionId: 'primary-dc1' },
        { id: 'fail-dc2', label: 'Fail DC2', regionId: 'secondary-dc2' },
        { id: 'fail-dr', label: 'Fail DR Region', regionId: 'dr-region' },
      ];
    default:
      return [];
  }
};

// Get recovery actions for each scenario
export const getRecoveryActions = (scenario: ScenarioType, nodes: MongoNode[]) => {
  const clusterStatus = calculateClusterStatus(nodes);
  
  if (clusterStatus.isOperational) {
    return [];
  }

  switch (scenario) {
    case ScenarioType.BASIC_DR:
      // Only show recovery actions if DC region failed
      const dcNodesFailed = nodes.filter(
        node => node.region === 'primary-dc' && node.status === NodeStatus.DOWN
      ).length > 0;
      
      if (dcNodesFailed) {
        return [
          {
            id: 'reconfigure-standalone',
            label: 'Reconfigure DR as Standalone',
            action: reconfigureStandalone,
          },
          {
            id: 'add-new-nodes',
            label: 'Add 2 New Nodes to DR',
            action: addNewNodesToDR,
          },
        ];
      }
      return [];

    case ScenarioType.ENHANCED_DR:
      // Only show recovery action if DC region failed
      const dcNodesFailedEnhanced = nodes.filter(
        node => node.region === 'primary-dc' && node.status === NodeStatus.DOWN
      ).length > 0;
      
      if (dcNodesFailedEnhanced) {
        return [
          {
            id: 'grant-voting-rights',
            label: 'Grant Voting Rights to Read-Only Nodes',
            action: grantVotingRights,
          },
        ];
      }
      return [];

    case ScenarioType.MULTI_DC:
      // This scenario has automatic failover, so no manual recovery actions needed
      return [];

    default:
      return [];
  }
};
