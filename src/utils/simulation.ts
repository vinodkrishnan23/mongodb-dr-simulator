import {
  MongoNode,
  ClusterStatus,
  ReplicaSetStatus,
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

// Calculate status for a single replica set
const calculateReplicaSetStatus = (
  name: string,
  region: string,
  nodes: MongoNode[],
  clusterState?: string
): ReplicaSetStatus => {
  const upNodes = nodes.filter(node => node.status === NodeStatus.UP);
  const votingNodes = upNodes.filter(node => node.votingRights === VotingRights.VOTER);
  const totalVotingNodes = nodes.filter(node => node.votingRights === VotingRights.VOTER).length;
  
  const hasQuorum = votingNodes.length > totalVotingNodes / 2;
  const primaryNode = upNodes.find(node => node.role === NodeRole.PRIMARY);
  const standaloneNode = upNodes.find(node => node.role === NodeRole.STANDALONE);
  
  // Special case: Standalone nodes can accept writes without quorum
  const isStandaloneOperational = !!standaloneNode;
  // Replica set is operational if it has quorum (can elect primary) OR if it's standalone
  const isReplicaSetOperational = hasQuorum;
  const isOperational = isStandaloneOperational || isReplicaSetOperational;
  
  // Write capability requires either standalone or a primary with quorum
  const canWrite = isStandaloneOperational || (hasQuorum && !!primaryNode);

  return {
    name,
    region,
    isOperational,
    hasQuorum: isStandaloneOperational ? true : hasQuorum,
    canWrite,
    votingNodes: votingNodes.length,
    totalVotingNodes,
    totalNodes: nodes.length,
    primaryNode: primaryNode?.id || standaloneNode?.id,
    clusterState: clusterState as any,
  };
};

// Enhanced cluster status calculation that handles multi-replica set scenarios
export const calculateClusterStatus = (nodes: MongoNode[], scenarioType?: ScenarioType, dynamicRegions?: any[]): ClusterStatus => {
  // Determine if this is a multi-replica set scenario
  const isHotStandby = scenarioType === ScenarioType.HOT_STANDBY;
  const isColdStandby = scenarioType === ScenarioType.COLD_STANDBY;
  
  if (isHotStandby) {
    // Hot Standby: Two independent replica sets
    const dcNodes = nodes.filter(node => node.region === 'dc-cluster');
    const drNodes = nodes.filter(node => node.region === 'dr-cluster');
    
    // Calculate DC cluster status - down only when it loses quorum, not just when any node is down
    const dcUpVotingNodes = dcNodes.filter(
      node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTER
    );
    const dcTotalVotingNodes = dcNodes.filter(node => node.votingRights === VotingRights.VOTER).length;
    const dcHasQuorum = dcUpVotingNodes.length > dcTotalVotingNodes / 2;
    
    const dcStatus = calculateReplicaSetStatus(
      'DC Cluster',
      'dc-cluster', 
      dcNodes,
      dcHasQuorum ? 'active' : 'down'
    );
    
    // DR cluster state: check dynamic regions first, fallback to 'standby'
    // It only becomes 'active' when user manually repoints application
    const drRegion = dynamicRegions?.find(region => region.id === 'dr-cluster');
    const drClusterState = drRegion?.clusterState || 'standby';
    
    const drStatus = calculateReplicaSetStatus(
      'DR Cluster', 
      'dr-cluster',
      drNodes,
      drClusterState
    );
    
    // Overall status: operational if at least one replica set is operational
    const isOperational = dcStatus.isOperational || drStatus.isOperational;
    const canWrite = dcStatus.canWrite || drStatus.canWrite;
    
    return {
      isOperational,
      hasQuorum: isOperational,
      canWrite,
      votingNodes: dcStatus.votingNodes + drStatus.votingNodes,
      totalVotingNodes: dcStatus.totalVotingNodes + drStatus.totalVotingNodes,
      totalNodes: dcStatus.totalNodes + drStatus.totalNodes,
      primaryNode: dcStatus.primaryNode || drStatus.primaryNode,
      replicaSets: [dcStatus, drStatus],
      scenarioType: 'multi',
    };
  }
  
  if (isColdStandby) {
    // Cold Standby: One replica set + backup storage + potentially restored cluster
    const dcNodes = nodes.filter(node => node.region === 'dc-cluster');
    const restoredNodes = nodes.filter(node => node.region === 'dr-cluster-restored');
    
    const replicaSets: ReplicaSetStatus[] = [];
    
    if (dcNodes.length > 0) {
      replicaSets.push(calculateReplicaSetStatus(
        'DC Cluster',
        'dc-cluster',
        dcNodes,
        dcNodes.every(n => n.status === NodeStatus.DOWN) ? 'down' : 'active'
      ));
    }
    
    if (restoredNodes.length > 0) {
      replicaSets.push(calculateReplicaSetStatus(
        'DR Restored Cluster',
        'dr-cluster-restored',
        restoredNodes,
        'active'
      ));
    }
    
    // Overall status based on any operational replica set
    const operationalReplicaSet = replicaSets.find(rs => rs.isOperational);
    const isOperational = !!operationalReplicaSet;
    
    return {
      isOperational,
      hasQuorum: isOperational,
      canWrite: isOperational,
      votingNodes: replicaSets.reduce((sum, rs) => sum + rs.votingNodes, 0),
      totalVotingNodes: replicaSets.reduce((sum, rs) => sum + rs.totalVotingNodes, 0),
      totalNodes: replicaSets.reduce((sum, rs) => sum + rs.totalNodes, 0),
      primaryNode: operationalReplicaSet?.primaryNode,
      replicaSets,
      scenarioType: 'backup',
    };
  }
  
  // Single replica set scenarios (Basic DR, Enhanced DR, Multi-DC, Enhanced 2-Step)
  const upNodes = nodes.filter(node => node.status === NodeStatus.UP);
  const votingNodes = upNodes.filter(node => node.votingRights === VotingRights.VOTER);
  const totalVotingNodes = nodes.filter(node => node.votingRights === VotingRights.VOTER).length;
  
  const hasQuorum = votingNodes.length > totalVotingNodes / 2;
  const primaryNode = upNodes.find(node => node.role === NodeRole.PRIMARY);
  const standaloneNode = upNodes.find(node => node.role === NodeRole.STANDALONE);
  
  // Special case: Standalone nodes can accept writes without quorum
  const isStandaloneOperational = !!standaloneNode;
  const isReplicaSetOperational = hasQuorum && !!primaryNode;
  
  // Enhanced 2-Step special case: After Step 1, cluster is operational but read-only
  const isEnhanced2StepPartialRecovery = scenarioType === ScenarioType.ENHANCED_2_STEP && 
    upNodes.length > 0 && 
    !hasQuorum &&
    // Check if we have a read-only node that was promoted (Step 1 completed)
    nodes.some(node => 
      node.name.includes('Read-Only') && 
      node.votingRights === VotingRights.VOTER &&
      node.status === NodeStatus.UP
    );
  
  const isOperational = isStandaloneOperational || isReplicaSetOperational || isEnhanced2StepPartialRecovery;
  
  // Determine write capability
  const canWrite = isStandaloneOperational || isReplicaSetOperational; // Only true for quorum or standalone
  
  return {
    isOperational,
    hasQuorum: isStandaloneOperational ? true : hasQuorum,
    canWrite,
    votingNodes: votingNodes.length,
    totalVotingNodes,
    totalNodes: nodes.length,
    primaryNode: primaryNode?.id || standaloneNode?.id,
    scenarioType: 'single',
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

// Fail region with backup storage for Cold Standby scenarios
export const failRegionWithBackup = (
  nodes: MongoNode[], 
  regions: any[], 
  regionId: string
): { updatedNodes: MongoNode[], updatedRegions: any[] } => {
  // Fail the MongoDB nodes in the region
  const updatedNodes = failRegion(nodes, regionId);
  
  // Also mark associated backup storage as down
  const updatedRegions = regions.map(region => {
    // If it's the main cluster region that failed, mark it as down
    if (region.id === regionId) {
      return { ...region, clusterState: 'down' };
    }
    
    // If it's a backup storage region associated with the failed region, mark it as down
    if (region.type === 'backup') {
      const isAssociatedBackup = 
        (regionId === 'dc-cluster' && region.id === 'dc-backup-storage') ||
        (regionId === 'dr-cluster' && region.id === 'dr-backup-storage');
      
      if (isAssociatedBackup) {
        return { ...region, clusterState: 'down' };
      }
    }
    
    return region;
  });
  
  return { updatedNodes, updatedRegions };
};

// Find new primary after failure
export const electNewPrimary = (nodes: MongoNode[]): { 
  updatedNodes: MongoNode[]; 
  logEvents: LogEvent[]; 
} => {
  const upVotingNodes = nodes.filter(
    node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTER
  );
  
  const totalVotingNodes = nodes.filter(node => node.votingRights === VotingRights.VOTER).length;
  const hasQuorum = upVotingNodes.length > totalVotingNodes / 2;
  
  // If no primary exists and we have quorum, elect a new one
  const hasPrimary = upVotingNodes.some(node => node.role === NodeRole.PRIMARY);
  
  if (!hasPrimary && hasQuorum) {
    // Find the best candidate for primary (prefer secondaries over other roles)
    const secondaryNodes = upVotingNodes.filter(node => node.role === NodeRole.SECONDARY);
    const newPrimary = secondaryNodes.length > 0 ? secondaryNodes[0] : upVotingNodes[0];
    
    const updatedNodes = nodes.map(node => 
      node.id === newPrimary.id
        ? { ...node, role: NodeRole.PRIMARY }
        : node.role === NodeRole.PRIMARY
        ? { ...node, role: NodeRole.SECONDARY }
        : node
    );

    const logEvents = [
      createLogEvent(
        EventType.ELECTION,
        `Primary election completed: ${newPrimary.name} elected as new Primary`,
        `Quorum available with ${upVotingNodes.length} of ${totalVotingNodes} voting members online`
      ),
      createLogEvent(
        EventType.STATUS_CHANGE,
        `Cluster remains operational with new Primary`,
        'Automatic failover completed successfully'
      ),
    ];

    return { updatedNodes, logEvents };
  }

  // No election possible - return original nodes with appropriate log events
  const logEvents: LogEvent[] = [];
  
  if (!hasPrimary && !hasQuorum) {
    logEvents.push(
      createLogEvent(
        EventType.WARNING,
        `No quorum available for primary election`,
        `Only ${upVotingNodes.length} of ${totalVotingNodes} voting members online (need majority)`
      ),
      createLogEvent(
        EventType.FAILURE,
        'Cluster lost write capability - no primary available',
        'Manual recovery actions required to restore cluster functionality'
      )
    );
  }
  
  return { updatedNodes: nodes, logEvents };
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
    createLogEvent(
      EventType.SUCCESS,
      'Standalone configuration complete - write capability restored',
      'The standalone node can now accept reads and writes without requiring a replica set'
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
    datacenter: 'Region-B',
  };

  const newNode2: MongoNode = {
    id: 'node-dr-new-2',
    name: 'DR Node New 2',
    role: NodeRole.SECONDARY,
    status: NodeStatus.UP,
    votingRights: VotingRights.VOTER,
    region: 'dr-region',
    datacenter: 'Region-B',
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

  // Calculate the new totals after adding nodes
  const totalVotingNodes = updatedNodes.filter(node => node.votingRights === VotingRights.VOTER).length;
  const onlineVotingNodes = updatedNodes.filter(
    node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTER
  ).length;

  const logEvents = [
    createLogEvent(
      EventType.RECOVERY_ACTION,
      'Provisioning 2 new nodes in DR region',
      'Adding new voting members to re-establish quorum'
    ),
    createLogEvent(
      EventType.STATUS_CHANGE,
      `Cluster now has ${totalVotingNodes} voting members total (${onlineVotingNodes} online, 2 failed in DC)`,
      'Failed DC nodes still count toward total voting member configuration'
    ),
    createLogEvent(
      EventType.QUORUM,
      `Quorum re-established: ${onlineVotingNodes} of ${totalVotingNodes} voting members online (majority achieved)`
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

  // Calculate the new totals after granting voting rights
  const totalVotingNodes = updatedNodes.filter(node => node.votingRights === VotingRights.VOTER).length;
  const onlineVotingNodes = updatedNodes.filter(
    node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTER
  ).length;

  const logEvents = [
    createLogEvent(
      EventType.RECOVERY_ACTION,
      'Granting voting rights to read-only nodes in DR region',
      'Reconfiguring read-only nodes to become voting members'
    ),
    createLogEvent(
      EventType.STATUS_CHANGE,
      `Cluster now has ${totalVotingNodes} voting members total (${onlineVotingNodes} online, 2 failed in DC)`,
      'Failed nodes still count toward total voting member configuration'
    ),
    createLogEvent(
      EventType.QUORUM,
      `Quorum re-established: ${onlineVotingNodes} of ${totalVotingNodes} voting members online (majority achieved)`
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

// Recovery actions for Scenario 4 (Enhanced 2-Step)
export const grantVotingRightsStep1 = (nodes: MongoNode[]): {
  updatedNodes: MongoNode[];
  logEvents: LogEvent[];
} => {
  const readOnlyNode = nodes.find(
    node => node.region === 'dr-region' && 
             node.role === NodeRole.READ_ONLY &&
             node.status === NodeStatus.UP
  );

  if (!readOnlyNode) {
    return {
      updatedNodes: nodes,
      logEvents: [createLogEvent(EventType.WARNING, 'No read-only DR node available')],
    };
  }

  const updatedNodes = nodes.map(node => 
    node.id === readOnlyNode.id
      ? { ...node, votingRights: VotingRights.VOTER, role: NodeRole.SECONDARY }
      : node
  );

  // Calculate voting member status after step 1
  const totalVotingNodes = updatedNodes.filter(node => node.votingRights === VotingRights.VOTER).length;
  const onlineVotingNodes = updatedNodes.filter(
    node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTER
  ).length;
  const requiredForQuorum = Math.floor(totalVotingNodes / 2) + 1;

  const logEvents = [
    createLogEvent(
      EventType.RECOVERY_ACTION,
      'Step 1: Granted voting rights to read-only node',
      'Node is now a voting member, cluster partially recovered'
    ),
    createLogEvent(
      EventType.STATUS_CHANGE,
      `Cluster now has ${totalVotingNodes} voting members total (${onlineVotingNodes} online, 2 failed in DC)`,
      'Failed DC nodes still count toward total voting member configuration'
    ),
    createLogEvent(
      EventType.STATUS_CHANGE,
      'Cluster status improved: Operational but read-only',
      `${onlineVotingNodes} of ${totalVotingNodes} voting members online (need ${requiredForQuorum} for writes)`
    ),
    createLogEvent(
      EventType.WARNING,
      'Step 2 required to restore write capability',
      'Additional node needed to achieve quorum and enable writes'
    ),
  ];

  return { updatedNodes, logEvents };
};

export const addNewNodeStep2 = (nodes: MongoNode[]): {
  updatedNodes: MongoNode[];
  logEvents: LogEvent[];
} => {
  const drNodes = nodes.filter(node => node.region === 'dr-region' && node.status === NodeStatus.UP);
  
  if (drNodes.length === 0) {
    return {
      updatedNodes: nodes,
      logEvents: [createLogEvent(EventType.WARNING, 'No DR nodes available')],
    };
  }

  // Add new node to DR region
  const newNode: MongoNode = {
    id: 'node-new-dr',
    name: 'New DR Node',
    role: NodeRole.SECONDARY,
    status: NodeStatus.UP,
    votingRights: VotingRights.VOTER,
    region: 'dr-region',
    datacenter: 'Region-B',
  };

  // Promote one of the DR nodes to primary
  const newPrimary = drNodes[0];
  const updatedNodes = [
    ...nodes.map(node => 
      node.id === newPrimary.id
        ? { ...node, role: NodeRole.PRIMARY }
        : node.role === NodeRole.PRIMARY
        ? { ...node, role: NodeRole.SECONDARY }
        : node
    ),
    newNode,
  ];

  // Calculate the new totals after adding node in step 2
  const totalVotingNodes = updatedNodes.filter(node => node.votingRights === VotingRights.VOTER).length;
  const onlineVotingNodes = updatedNodes.filter(
    node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTER
  ).length;

  const logEvents = [
    createLogEvent(
      EventType.RECOVERY_ACTION,
      'Step 2: Added new electable node to DR region',
      'New voting member provisioned to establish quorum'
    ),
    createLogEvent(
      EventType.STATUS_CHANGE,
      `Cluster now has ${totalVotingNodes} voting members total (${onlineVotingNodes} online, 2 failed in DC)`,
      'Failed DC nodes still count toward total voting member configuration'
    ),
    createLogEvent(
      EventType.QUORUM,
      `Quorum re-established: ${onlineVotingNodes} of ${totalVotingNodes} voting members online (majority achieved)`
    ),
    createLogEvent(
      EventType.ELECTION,
      `Election completed: ${newPrimary.name} promoted to Primary`
    ),
    createLogEvent(
      EventType.SUCCESS,
      'Cluster fully operational - both steps completed successfully'
    ),
  ];

  return { updatedNodes, logEvents };
};

// Recovery actions for Scenario 5 (Hot Standby)
export const repointApplicationToDR = (nodes: MongoNode[], regions?: any[]): {
  updatedNodes: MongoNode[];
  logEvents: LogEvent[];
  updatedRegions?: any[];
} => {
  const drNodes = nodes.filter(node => node.region === 'dr-cluster');
  
  if (drNodes.length === 0) {
    return {
      updatedNodes: nodes,
      logEvents: [createLogEvent(EventType.WARNING, 'No DR cluster nodes available')],
    };
  }

  // Make DR cluster visible to applications
  const updatedNodes = nodes.map(node => {
    if (node.region === 'dr-cluster') {
      // DR cluster already has its own primary, just make it visible to applications
      return { ...node, name: node.name.replace('(Invisible)', '(Active)') };
    }
    return node;
  });

  // Update regions to mark DR cluster as active and break sync
  const updatedRegions = regions ? regions.map(region => {
    if (region.id === 'dr-cluster') {
      return { ...region, clusterState: 'active' };
    }
    if (region.id === 'dc-cluster') {
      return { ...region, syncBroken: true };
    }
    return region;
  }) : undefined;

  const logEvents = [
    createLogEvent(
      EventType.RECOVERY_ACTION,
      'Application repointed to DR cluster',
      'DNS/application configuration updated to use DR cluster endpoints'
    ),
    createLogEvent(
      EventType.STATUS_CHANGE,
      'DR cluster made visible to applications',
      'DR cluster was operational with its own primary but invisible until now'
    ),
    createLogEvent(
      EventType.STATUS_CHANGE,
      'DR cluster status changed from HOT STANDBY to ACTIVE',
      'DR cluster is now serving production traffic'
    ),
    createLogEvent(
      EventType.SUCCESS,
      'Failover complete - DR cluster now serving production traffic with existing data'
    ),
  ];

  return { updatedNodes, logEvents, updatedRegions };
};

// Recovery actions for Scenario 6 (Cold Standby)
export const restoreFromBackup = (nodes: MongoNode[]): {
  updatedNodes: MongoNode[];
  logEvents: LogEvent[];
} => {
  // This will be a multi-stage process handled by the simulation wrapper
  const logEvents = [
    createLogEvent(
      EventType.RECOVERY_ACTION,
      'Initiating restore from backup',
      'Beginning cluster restoration process from cold storage'
    ),
    createLogEvent(
      EventType.STATUS_CHANGE,
      'Provisioning new VMs in DR region...',
      'Creating new infrastructure for restored cluster'
    ),
  ];

  return { updatedNodes: nodes, logEvents };
};

// Simulate restoration progress stages
export const progressBackupRestore = (
  nodes: MongoNode[], 
  progressPercent: number
): {
  updatedNodes: MongoNode[];
  logEvents: LogEvent[];
} => {
  const logEvents: LogEvent[] = [];
  let updatedNodes = [...nodes];

  if (progressPercent === 25) {
    logEvents.push(
      createLogEvent(
        EventType.STATUS_CHANGE,
        'Copying latest snapshot from backup storage...',
        'Downloading base database snapshot from cloud storage'
      )
    );
  } else if (progressPercent === 50) {
    logEvents.push(
      createLogEvent(
        EventType.STATUS_CHANGE,
        'Applying Point-in-Time Recovery (PITR) logs...',
        'Replaying transaction logs to restore to latest consistent state'
      )
    );
  } else if (progressPercent === 75) {
    logEvents.push(
      createLogEvent(
        EventType.STATUS_CHANGE,
        'Configuring restored cluster...',
        'Setting up replica set configuration and security'
      )
    );
  } else if (progressPercent === 100) {
    // Check if restored nodes already exist to prevent duplicates
    const hasRestoredNodes = nodes.some(node => node.id === 'restored-primary');
    
    if (!hasRestoredNodes) {
      // Add restored cluster nodes only if they don't already exist
      const restoredNodes: MongoNode[] = [
        {
          id: 'restored-primary',
          name: 'Restored Primary',
          role: NodeRole.PRIMARY,
          status: NodeStatus.UP,
          votingRights: VotingRights.VOTER,
          region: 'dr-cluster-restored',
          datacenter: 'Region-B',
        },
        {
          id: 'restored-secondary1',
          name: 'Restored Secondary 1',
          role: NodeRole.SECONDARY,
          status: NodeStatus.UP,
          votingRights: VotingRights.VOTER,
          region: 'dr-cluster-restored',
          datacenter: 'Region-B',
        },
        {
          id: 'restored-secondary2',
          name: 'Restored Secondary 2',
          role: NodeRole.SECONDARY,
          status: NodeStatus.UP,
          votingRights: VotingRights.VOTER,
          region: 'dr-cluster-restored',
          datacenter: 'Region-B',
        },
      ];

      updatedNodes = [...nodes, ...restoredNodes];
    }
    
    logEvents.push(
      createLogEvent(
        EventType.SUCCESS,
        'Cluster restoration completed successfully',
        'New 3-node replica set is operational in DR region with data restored from backup'
      ),
      createLogEvent(
        EventType.STATUS_CHANGE,
        'New independent replica set established',
        'Restored cluster is completely separate from the failed DC cluster'
      ),
      createLogEvent(
        EventType.WARNING,
        'Data may be lost between last backup and failure time',
        'Review RPO (Recovery Point Objective) based on backup frequency'
      )
    );
  }

  return { updatedNodes, logEvents };
};

// Recovery action for Cold Standby - Point Application to Restored Cluster
export const pointApplicationToRestoredCluster = (nodes: MongoNode[]): {
  updatedNodes: MongoNode[];
  logEvents: LogEvent[];
} => {
  const restoredNodes = nodes.filter(node => node.region === 'dr-cluster-restored');
  
  if (restoredNodes.length === 0) {
    return {
      updatedNodes: nodes,
      logEvents: [createLogEvent(EventType.WARNING, 'No restored cluster nodes available')],
    };
  }

  // No changes to nodes needed - this is an application-level action
  const updatedNodes = [...nodes];

  const logEvents = [
    createLogEvent(
      EventType.RECOVERY_ACTION,
      'Application pointed to restored cluster',
      'DNS/application configuration updated to use restored cluster endpoints'
    ),
    createLogEvent(
      EventType.STATUS_CHANGE,
      'Production traffic now served by restored cluster',
      'Restored cluster is now the active production database'
    ),
    createLogEvent(
      EventType.SUCCESS,
      'Cold standby failover complete - restored cluster serving production with backup data',
      'Review data consistency and update monitoring to point to new cluster'
    ),
  ];

  return { updatedNodes, logEvents };
};

// Get failure actions for each scenario
export const getFailureActions = (scenario: ScenarioType) => {
  // No failure actions - users will click on nodes directly to toggle them
  return [];
};

// Elect new primary from a specific region/replica set
export const electNewPrimaryInRegion = (nodes: MongoNode[], regionId: string): { 
  updatedNodes: MongoNode[]; 
  logEvents: LogEvent[]; 
} => {
  const regionNodes = nodes.filter(node => node.region === regionId);
  const otherNodes = nodes.filter(node => node.region !== regionId);
  
  const upVotingNodes = regionNodes.filter(
    node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTER
  );
  
  const totalVotingNodes = regionNodes.filter(node => node.votingRights === VotingRights.VOTER).length;
  const hasQuorum = upVotingNodes.length > totalVotingNodes / 2;
  
  // If no primary exists in this region and we have quorum, elect a new one
  const hasPrimary = upVotingNodes.some(node => node.role === NodeRole.PRIMARY);
  
  if (!hasPrimary && hasQuorum) {
    // Find the best candidate for primary (prefer secondaries over other roles)
    const secondaryNodes = upVotingNodes.filter(node => node.role === NodeRole.SECONDARY);
    const newPrimary = secondaryNodes.length > 0 ? secondaryNodes[0] : upVotingNodes[0];
    
    const updatedRegionNodes = regionNodes.map(node => 
      node.id === newPrimary.id
        ? { ...node, role: NodeRole.PRIMARY }
        : node.role === NodeRole.PRIMARY
        ? { ...node, role: NodeRole.SECONDARY }
        : node
    );

    const logEvents = [
      createLogEvent(
        EventType.ELECTION,
        `Primary election completed in ${regionId}: ${newPrimary.name} elected as new Primary`,
        `Quorum available with ${upVotingNodes.length} of ${totalVotingNodes} voting members online`
      ),
      createLogEvent(
        EventType.STATUS_CHANGE,
        `${regionId} cluster remains operational with new Primary`,
        'Automatic failover completed successfully'
      ),
    ];

    return { updatedNodes: [...updatedRegionNodes, ...otherNodes], logEvents };
  }

  // No election possible - return original nodes with appropriate log events
  const logEvents: LogEvent[] = [];
  
  if (!hasPrimary && !hasQuorum) {
    logEvents.push(
      createLogEvent(
        EventType.WARNING,
        `No quorum available for primary election in ${regionId}`,
        `Only ${upVotingNodes.length} of ${totalVotingNodes} voting members online (need majority)`
      ),
      createLogEvent(
        EventType.FAILURE,
        `${regionId} cluster lost write capability - no primary available`,
        'Manual recovery actions required to restore cluster functionality'
      )
    );
  }
  
  return { updatedNodes: nodes, logEvents };
};

// Toggle individual node status
export const toggleNodeStatus = (nodes: MongoNode[], nodeId: string, scenarioType?: ScenarioType): { updatedNodes: MongoNode[], logEvents: LogEvent[] } => {
  const logEvents: LogEvent[] = [];
  const updatedNodes = nodes.map(node => {
    if (node.id === nodeId) {
      const newStatus = node.status === NodeStatus.UP ? NodeStatus.DOWN : NodeStatus.UP;
      const statusText = newStatus === NodeStatus.UP ? 'brought online' : 'taken offline';
      
      logEvents.push(createLogEvent(
        newStatus === NodeStatus.DOWN ? EventType.FAILURE : EventType.STATUS_CHANGE,
        `Node ${node.name} ${statusText}`,
        `Node ${node.id} in ${node.datacenter} changed status from ${node.status} to ${newStatus}`
      ));

      return { ...node, status: newStatus };
    }
    return node;
  });

  // Check if we need to elect a new primary after a failure
  const failedNode = updatedNodes.find(node => node.id === nodeId);
  const primaryDown = failedNode && 
    failedNode.role === NodeRole.PRIMARY && 
    failedNode.status === NodeStatus.DOWN;

  let finalNodes = updatedNodes;
  if (primaryDown) {
    // For Hot Standby, handle elections per replica set
    if (scenarioType === ScenarioType.HOT_STANDBY) {
      const { updatedNodes: nodesAfterElection, logEvents: electionEvents } = 
        electNewPrimaryInRegion(updatedNodes, failedNode.region);
      finalNodes = nodesAfterElection;
      logEvents.push(...electionEvents);
    } else {
      // For other scenarios, use global election
      const { updatedNodes: nodesAfterElection, logEvents: electionEvents } = electNewPrimary(updatedNodes);
      finalNodes = nodesAfterElection;
      logEvents.push(...electionEvents);
    }
  }

  return { updatedNodes: finalNodes, logEvents };
};

// Get recovery actions for each scenario
export const getRecoveryActions = (scenario: ScenarioType, nodes: MongoNode[]) => {
  const clusterStatus = calculateClusterStatus(nodes, scenario);
  
  // For Hot Standby, Cold Standby, and Enhanced 2-Step, recovery actions may be available 
  // even if overall cluster is operational because these scenarios have specific failover patterns
  if (clusterStatus.isOperational && 
      scenario !== ScenarioType.HOT_STANDBY && 
      scenario !== ScenarioType.COLD_STANDBY && 
      scenario !== ScenarioType.ENHANCED_2_STEP) {
    return [];
  }

  switch (scenario) {
    case ScenarioType.SINGLE_REGION_NO_DR:
      // Single region with no DR - no recovery actions available
      // The cluster relies on automatic primary election if quorum is maintained
      return [];

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

    case ScenarioType.ENHANCED_2_STEP:
      // Only show recovery actions if DC region failed
      const dcNodesFailedEnhanced2Step = nodes.filter(
        node => node.region === 'primary-dc' && node.status === NodeStatus.DOWN
      ).length > 0;
      
      if (dcNodesFailedEnhanced2Step) {
        // Check if we're in step 1 or step 2 by looking for a read-only node that became a voter
        const readOnlyNodePromoted = nodes.some(
          node => node.region === 'dr-region' && 
                   node.name.includes('Read-Only') &&
                   node.role === NodeRole.SECONDARY && 
                   node.votingRights === VotingRights.VOTER
        );

        if (!readOnlyNodePromoted) {
          // Step 1: Grant voting rights (read-only node hasn't been promoted yet)
          return [
            {
              id: 'grant-voting-rights-step1',
              label: 'Step 1: Grant Voting Rights to Read-Only Node',
              action: grantVotingRightsStep1,
            },
          ];
        } else {
          // Step 2: Add new node (read-only node has been promoted)
          return [
            {
              id: 'add-new-node-step2',
              label: 'Step 2: Add New Electable Node to DR',
              action: addNewNodeStep2,
            },
          ];
        }
      }
      return [];

    case ScenarioType.HOT_STANDBY:
      // Show recovery action only if DC cluster lost quorum (2+ nodes down)
      const dcNodes = nodes.filter(node => node.region === 'dc-cluster');
      const dcUpVotingNodes = dcNodes.filter(
        node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTER
      );
      const dcTotalVotingNodes = dcNodes.filter(node => node.votingRights === VotingRights.VOTER).length;
      const dcHasQuorum = dcUpVotingNodes.length > dcTotalVotingNodes / 2;
      
      // Only show recovery action when DC cluster loses quorum (cannot elect primary)
      if (!dcHasQuorum) {
        return [
          {
            id: 'repoint-application',
            label: 'Repoint Application to DR Cluster',
            action: repointApplicationToDR,
          },
        ];
      }
      return [];

    case ScenarioType.COLD_STANDBY:
      // Check if restore has been completed
      const hasRestoredCluster = nodes.some(node => node.region === 'dr-cluster-restored');
      
      if (hasRestoredCluster) {
        // After restore is complete, show action to point application
        return [
          {
            id: 'point-application-to-restored',
            label: 'Point Application to Restored Cluster',
            action: pointApplicationToRestoredCluster,
          },
        ];
      }
      
      // Show recovery action if DC cluster failed and no restore yet
      const dcClusterFailedCold = nodes.filter(
        node => node.region === 'dc-cluster' && node.status === NodeStatus.DOWN
      ).length > 0;
      
      if (dcClusterFailedCold) {
        return [
          {
            id: 'restore-from-backup',
            label: 'Restore New Cluster from Backup in DR',
            action: restoreFromBackup,
          },
        ];
      }
      return [];

    default:
      return [];
  }
};
