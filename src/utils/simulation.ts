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
  DeploymentMode,
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
  const votingNodes = upNodes.filter(node => node.votingRights === VotingRights.VOTING);
  const totalVotingNodes = nodes.filter(node => node.votingRights === VotingRights.VOTING).length;
  const downVotingNodes = nodes.filter(node => node.votingRights === VotingRights.VOTING && node.status === NodeStatus.DOWN).length;
  
  const hasMajority = votingNodes.length > totalVotingNodes / 2;
  const hasAnyVotingNodesOnline = votingNodes.length > 0;
  const primaryNode = upNodes.find(node => node.role === NodeRole.PRIMARY);
  const standaloneNode = upNodes.find(node => node.role === NodeRole.STANDALONE);
  
  // Special case: Standalone nodes can accept writes without majority
  const isStandaloneOperational = !!standaloneNode;
  // Replica set is operational if it has majority (can elect primary) OR if it's standalone
  const isReplicaSetOperational = hasMajority;
  // Cluster is operational if it can function normally AND no voting nodes are down
  const isOperational = (isStandaloneOperational || isReplicaSetOperational) && downVotingNodes === 0;
  
  // Write capability requires either standalone or a primary with majority
  const canWrite = isStandaloneOperational || (hasMajority && !!primaryNode);

  return {
    name,
    region,
    isOperational,
    hasMajority: isStandaloneOperational ? true : hasMajority, // Use actual majority calculation
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
    
    // Calculate overall majority across ALL voting nodes (DC + DR combined)
    const allUpVotingNodes = nodes.filter(
      node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTING
    );
    const allTotalVotingNodes = nodes.filter(node => node.votingRights === VotingRights.VOTING).length;
    const allDownVotingNodes = nodes.filter(node => node.votingRights === VotingRights.VOTING && node.status === NodeStatus.DOWN).length;
    const overallHasMajority = allUpVotingNodes.length > allTotalVotingNodes / 2;
    
    // Calculate DC cluster status - use overall majority for cluster state
    const dcUpVotingNodes = dcNodes.filter(
      node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTING
    );
    const dcTotalVotingNodes = dcNodes.filter(node => node.votingRights === VotingRights.VOTING).length;
    const dcDownVotingNodes = dcNodes.filter(node => node.votingRights === VotingRights.VOTING && node.status === NodeStatus.DOWN).length;
    const dcHasAnyVotingNodesOnline = dcUpVotingNodes.length > 0;
    
    const dcStatus = calculateReplicaSetStatus(
      'DC Cluster',
      'dc-cluster', 
      dcNodes,
      overallHasMajority ? 'active' : 'down'
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
    
    // Overall status: operational if we have majority AND no voting nodes are down
    // Degraded if we have majority BUT some voting nodes are down
    const isOperational = overallHasMajority && allDownVotingNodes === 0;
    const canWrite = overallHasMajority && !!(dcStatus.primaryNode || drStatus.primaryNode);
    
    return {
      isOperational,
      hasMajority: overallHasMajority,
      canWrite,
      votingNodes: allUpVotingNodes.length,
      totalVotingNodes: allTotalVotingNodes,
      totalNodes: dcStatus.totalNodes + drStatus.totalNodes,
      primaryNode: dcStatus.primaryNode || drStatus.primaryNode,
      replicaSets: [dcStatus, drStatus],
      scenarioType: 'multi',
    };
  }
  
  if (isColdStandby) {
    // Cold Standby: DC replica set + backup storage + potentially restored replica set
    // These should be treated as independent replica sets when restored cluster exists
    const dcNodes = nodes.filter(node => node.region === 'dc-cluster');
    const restoredNodes = nodes.filter(node => node.region === 'dr-cluster-restored');
    
    const replicaSets: ReplicaSetStatus[] = [];
    
    if (dcNodes.length > 0) {
      const dcDownVotingNodes = dcNodes.filter(node => node.votingRights === VotingRights.VOTING && node.status === NodeStatus.DOWN).length;
      const dcAllVotingNodesDown = dcNodes.filter(node => node.votingRights === VotingRights.VOTING).length === dcDownVotingNodes;
      
      replicaSets.push(calculateReplicaSetStatus(
        'DC Cluster',
        'dc-cluster',
        dcNodes,
        dcAllVotingNodesDown ? 'down' : 'active'
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
    
    // Calculate combined voting node counts for UI display
    const allUpVotingNodes = nodes.filter(
      node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTING
    );
    
    if (restoredNodes.length > 0) {
      // Independent replica sets mode: DC + Restored clusters (similar to Hot Standby)
      const operationalReplicaSet = replicaSets.find(rs => rs.isOperational);
      const writableReplicaSet = replicaSets.find(rs => rs.canWrite); // Can write with majority even if degraded
      const hasOperationalReplicaSet = !!operationalReplicaSet;
      const hasWritableReplicaSet = !!writableReplicaSet;
      
      // Overall status: operational if ANY replica set is fully operational (no down nodes)
      const isOperational = hasOperationalReplicaSet;
      
      return {
        isOperational,
        hasMajority: allUpVotingNodes.length > 0, // Show "majority" if any voting nodes active
        canWrite: hasWritableReplicaSet, // Can write if any replica set has majority
        votingNodes: allUpVotingNodes.length,
        totalVotingNodes: replicaSets.reduce((sum, rs) => sum + rs.totalVotingNodes, 0),
        totalNodes: replicaSets.reduce((sum, rs) => sum + rs.totalNodes, 0),
        primaryNode: (operationalReplicaSet || writableReplicaSet)?.primaryNode,
        replicaSets,
        scenarioType: 'backup',
      };
    } else {
      // Single replica set mode: only DC cluster exists
      const dcReplicaSet = replicaSets[0];
      
      return {
        isOperational: dcReplicaSet?.isOperational || false,
        hasMajority: dcReplicaSet?.hasMajority || false,
        canWrite: dcReplicaSet?.canWrite || false,
        votingNodes: allUpVotingNodes.length,
        totalVotingNodes: dcReplicaSet?.totalVotingNodes || 0,
        totalNodes: dcReplicaSet?.totalNodes || 0,
        primaryNode: dcReplicaSet?.primaryNode,
        replicaSets,
        scenarioType: 'backup',
      };
    }
  }
  
  // Single replica set scenarios (Basic DR, Enhanced DR, Multi-DC, Enhanced 2-Step)
  const upNodes = nodes.filter(node => node.status === NodeStatus.UP);
  const votingNodes = upNodes.filter(node => node.votingRights === VotingRights.VOTING);
  const totalVotingNodes = nodes.filter(node => node.votingRights === VotingRights.VOTING).length;
  const downVotingNodes = nodes.filter(node => node.votingRights === VotingRights.VOTING && node.status === NodeStatus.DOWN).length;
  
  const hasMajority = votingNodes.length > totalVotingNodes / 2;
  const hasAnyVotingNodesOnline = votingNodes.length > 0; // For UI status: false only when ALL voting nodes are down
  const primaryNode = upNodes.find(node => node.role === NodeRole.PRIMARY);
  const standaloneNode = upNodes.find(node => node.role === NodeRole.STANDALONE);
  
  // Special case: Standalone nodes can accept writes without majority
  const isStandaloneOperational = !!standaloneNode;
  const isReplicaSetOperational = hasMajority && !!primaryNode;
  
  // Enhanced 2-Step special case: After Step 1, cluster is operational but read-only
  const isEnhanced2StepPartialRecovery = scenarioType === ScenarioType.ENHANCED_2_STEP && 
    upNodes.length > 0 && 
    !hasMajority &&
    // Check if we have a read-only node that was promoted (Step 1 completed)
    nodes.some(node => 
      node.name.includes('Read-Only') && 
      node.votingRights === VotingRights.VOTING &&
      node.status === NodeStatus.UP
    );
  
  // Cluster is operational if it can function normally AND no voting nodes are down
  // Degraded state shows when cluster has majority but some voting nodes are down
  const isOperational = (isStandaloneOperational || isReplicaSetOperational || isEnhanced2StepPartialRecovery) && downVotingNodes === 0;
  
  // Determine write capability
  const canWrite = isStandaloneOperational || isReplicaSetOperational; // Only true for majority or standalone
  
  return {
    isOperational,
    hasMajority: isStandaloneOperational ? true : hasMajority, // Use actual majority calculation
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
export const electNewPrimary = (nodes: MongoNode[], scenarioType?: ScenarioType, deploymentMode?: DeploymentMode): { 
  updatedNodes: MongoNode[]; 
  logEvents: LogEvent[]; 
} => {
  const upVotingNodes = nodes.filter(
    node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTING
  );
  
  const totalVotingNodes = nodes.filter(node => node.votingRights === VotingRights.VOTING).length;
  const hasMajority = upVotingNodes.length > totalVotingNodes / 2;
  
  // Check current primary status
  const currentPrimary = nodes.find(node => node.role === NodeRole.PRIMARY);
  const hasPrimary = upVotingNodes.some(node => node.role === NodeRole.PRIMARY);
  
  // If we have a primary but no majority, primary should step down
  if (currentPrimary && !hasMajority) {
    const updatedNodes = nodes.map(node => 
      node.role === NodeRole.PRIMARY
        ? { ...node, role: NodeRole.SECONDARY }
        : node
    );

    const logEvents = [
      createLogEvent(
        EventType.ELECTION,
        `Primary ${currentPrimary.name} stepped down due to loss of majority`,
        `Only ${upVotingNodes.length} of ${totalVotingNodes} voting members online (need majority)`
      ),
      createLogEvent(
        EventType.WARNING,
        'Cluster is now read-only - no primary available',
        'Manual recovery actions may be required to restore write capability'
      ),
    ];

    return { updatedNodes, logEvents };
  }
  
  // If no primary exists and we have majority, elect a new one
  // OR for Atlas Multi-DC, re-elect if a higher priority node is available
  const shouldReelect = scenarioType === ScenarioType.MULTI_DC && 
                       deploymentMode === DeploymentMode.ATLAS && 
                       hasMajority && 
                       hasPrimary;
                       
  if ((!hasPrimary && hasMajority) || shouldReelect) {
    let newPrimary: MongoNode;
    
    // Special logic for Multi-Datacenter scenario in Atlas mode
    if (scenarioType === ScenarioType.MULTI_DC && deploymentMode === DeploymentMode.ATLAS) {
      // Atlas priority hierarchy: Primary DC1 → Secondary DC2 → DR region
      const primaryDC1Nodes = upVotingNodes.filter(node => node.region === 'primary-dc1');
      const secondaryDC2Nodes = upVotingNodes.filter(node => node.region === 'secondary-dc2');
      const drNodes = upVotingNodes.filter(node => node.region === 'dr-region');
      
      // For re-elections, check if current primary should be replaced by higher priority node
      const currentPrimary = nodes.find(n => n.role === NodeRole.PRIMARY);
      let shouldReplaceCurrentPrimary = false;
      
      if (currentPrimary && shouldReelect) {
        // Check if a higher priority region has available nodes
        if (currentPrimary.region !== 'primary-dc1' && primaryDC1Nodes.length > 0) {
          shouldReplaceCurrentPrimary = true;
        } else if (currentPrimary.region === 'dr-region' && secondaryDC2Nodes.length > 0) {
          shouldReplaceCurrentPrimary = true;
        }
      }
      
      console.log('Atlas Multi-DC Election:', {
        scenarioType,
        deploymentMode,
        hasPrimary,
        shouldReelect,
        shouldReplaceCurrentPrimary,
        currentPrimary: currentPrimary ? {id: currentPrimary.id, name: currentPrimary.name, region: currentPrimary.region} : null,
        primaryDC1Nodes: primaryDC1Nodes.map(n => ({id: n.id, name: n.name, region: n.region})),
        secondaryDC2Nodes: secondaryDC2Nodes.map(n => ({id: n.id, name: n.name, region: n.region})),
        drNodes: drNodes.map(n => ({id: n.id, name: n.name, region: n.region}))
      });
      
      // Skip election if current primary is fine and no higher priority node available
      if (shouldReelect && !shouldReplaceCurrentPrimary) {
        console.log('Atlas: Current primary is appropriate, skipping re-election');
        return { updatedNodes: nodes, logEvents: [] };
      }
      
      if (primaryDC1Nodes.length > 0) {
        // First priority: Primary DC1 nodes (prefer secondaries, then any voting node)
        const primaryDC1Secondaries = primaryDC1Nodes.filter(node => node.role === NodeRole.SECONDARY);
        newPrimary = primaryDC1Secondaries.length > 0 ? primaryDC1Secondaries[0] : primaryDC1Nodes[0];
      } else if (secondaryDC2Nodes.length > 0) {
        // Second priority: Secondary DC2 nodes (prefer secondaries, then any voting node)
        const secondaryDC2Secondaries = secondaryDC2Nodes.filter(node => node.role === NodeRole.SECONDARY);
        newPrimary = secondaryDC2Secondaries.length > 0 ? secondaryDC2Secondaries[0] : secondaryDC2Nodes[0];
      } else if (drNodes.length > 0) {
        // Third priority: DR region nodes (last resort)
        const drSecondaries = drNodes.filter(node => node.role === NodeRole.SECONDARY);
        newPrimary = drSecondaries.length > 0 ? drSecondaries[0] : drNodes[0];
      } else {
        // Fallback to standard election if no specific region nodes available
        const secondaryNodes = upVotingNodes.filter(node => node.role === NodeRole.SECONDARY);
        newPrimary = secondaryNodes.length > 0 ? secondaryNodes[0] : upVotingNodes[0];
      }
    } else {
      // Standard election for all other scenarios
      const secondaryNodes = upVotingNodes.filter(node => node.role === NodeRole.SECONDARY);
      newPrimary = secondaryNodes.length > 0 ? secondaryNodes[0] : upVotingNodes[0];
    }
    
    const updatedNodes = nodes.map(node => 
      node.id === newPrimary.id
        ? { ...node, role: NodeRole.PRIMARY }
        : node.role === NodeRole.PRIMARY
        ? { ...node, role: NodeRole.SECONDARY }
        : node
    );

    // Create appropriate log messages based on election type
    const isReelection = shouldReelect && currentPrimary;
    let electionMessage = isReelection 
      ? `Atlas re-election: ${newPrimary.name} elected as new Primary (replaced ${currentPrimary.name})`
      : `Primary election completed: ${newPrimary.name} elected as new Primary`;
    let electionDetails = `Majority available with ${upVotingNodes.length} of ${totalVotingNodes} voting members online`;
    
    if (scenarioType === ScenarioType.MULTI_DC && deploymentMode === DeploymentMode.ATLAS) {
      const regionName = newPrimary.region === 'primary-dc1' ? 'Primary DC1 (Region-A)' :
                        newPrimary.region === 'secondary-dc2' ? 'Secondary DC2 (Region-C)' :
                        'DR Region (Region-B)';
      electionDetails = `Atlas prioritized ${regionName}. Majority: ${upVotingNodes.length} of ${totalVotingNodes} voting members online`;
    }

    const logEvents = [
      createLogEvent(
        EventType.ELECTION,
        electionMessage,
        electionDetails
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
  
  if (!hasPrimary && !hasMajority) {
    logEvents.push(
      createLogEvent(
        EventType.WARNING,
        `No majority available for primary election`,
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

  // Check if new nodes already exist to prevent duplicates
  const newNode1Exists = nodes.some(node => node.id === 'node-dr-new-1');
  const newNode2Exists = nodes.some(node => node.id === 'node-dr-new-2');
  
  if (newNode1Exists && newNode2Exists) {
    return {
      updatedNodes: nodes,
      logEvents: [createLogEvent(EventType.WARNING, 'New nodes have already been added to DR region')],
    };
  }

  // Add two new nodes to DR region (only if they don't exist)
  const nodesToAdd: MongoNode[] = [];
  
  if (!newNode1Exists) {
    nodesToAdd.push({
      id: 'node-dr-new-1',
      name: 'DR Node New 1',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTING,
      region: 'dr-region',
      datacenter: 'Region-B',
    });
  }

  if (!newNode2Exists) {
    nodesToAdd.push({
      id: 'node-dr-new-2',
      name: 'DR Node New 2',
      role: NodeRole.SECONDARY,
      status: NodeStatus.UP,
      votingRights: VotingRights.VOTING,
      region: 'dr-region',
      datacenter: 'Region-B',
    });
  }

  // Promote original DR node to primary
  const updatedNodes = [
    ...nodes.map(node => 
      node.id === drNode.id
        ? { ...node, role: NodeRole.PRIMARY }
        : node.role === NodeRole.PRIMARY
        ? { ...node, role: NodeRole.SECONDARY }
        : node
    ),
    ...nodesToAdd,
  ];

  // Calculate the new totals after adding nodes
  const totalVotingNodes = updatedNodes.filter(node => node.votingRights === VotingRights.VOTING).length;
  const onlineVotingNodes = updatedNodes.filter(
    node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTING
  ).length;

  const logEvents = [
    createLogEvent(
      EventType.RECOVERY_ACTION,
      'Provisioning 2 new nodes in DR region',
      'Adding new voting members to re-establish majority'
    ),
    createLogEvent(
      EventType.STATUS_CHANGE,
      `Cluster now has ${totalVotingNodes} voting members total (${onlineVotingNodes} online, 2 failed in DC)`,
      'Failed DC nodes still count toward total voting member configuration'
    ),
    createLogEvent(
      EventType.MAJORITY,
      `Majority re-established: ${onlineVotingNodes} of ${totalVotingNodes} voting members online (majority achieved)`
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
             node.votingRights === VotingRights.VOTING
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
      ? { ...node, votingRights: VotingRights.VOTING, role: NodeRole.SECONDARY }
      : node.id === drElectableNode.id
      ? { ...node, role: NodeRole.PRIMARY }
      : node.role === NodeRole.PRIMARY
      ? { ...node, role: NodeRole.SECONDARY }
      : node
  );

  // Calculate the new totals after granting voting rights
  const totalVotingNodes = updatedNodes.filter(node => node.votingRights === VotingRights.VOTING).length;
  const onlineVotingNodes = updatedNodes.filter(
    node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTING
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
      EventType.MAJORITY,
      `Majority re-established: ${onlineVotingNodes} of ${totalVotingNodes} voting members online (majority achieved)`
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
      ? { ...node, votingRights: VotingRights.VOTING, role: NodeRole.SECONDARY }
      : node
  );

  // Calculate voting member status after step 1
  const totalVotingNodes = updatedNodes.filter(node => node.votingRights === VotingRights.VOTING).length;
  const onlineVotingNodes = updatedNodes.filter(
    node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTING
  ).length;
  const requiredForMajority = Math.floor(totalVotingNodes / 2) + 1;

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
      `${onlineVotingNodes} of ${totalVotingNodes} voting members online (need ${requiredForMajority} for writes)`
    ),
    createLogEvent(
      EventType.WARNING,
      'Step 2 required to restore write capability',
      'Additional node needed to achieve majority and enable writes'
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

  // Check if new node already exists to prevent duplicates
  const newNodeExists = nodes.some(node => node.id === 'node-new-dr');
  
  if (newNodeExists) {
    return {
      updatedNodes: nodes,
      logEvents: [createLogEvent(EventType.WARNING, 'New node has already been added in Step 2')],
    };
  }

  // Add new node to DR region
  const newNode: MongoNode = {
    id: 'node-new-dr',
    name: 'New DR Node',
    role: NodeRole.SECONDARY,
    status: NodeStatus.UP,
    votingRights: VotingRights.VOTING,
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
  const totalVotingNodes = updatedNodes.filter(node => node.votingRights === VotingRights.VOTING).length;
  const onlineVotingNodes = updatedNodes.filter(
    node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTING
  ).length;

  const logEvents = [
    createLogEvent(
      EventType.RECOVERY_ACTION,
      'Step 2: Added new electable node to DR region',
      'New voting member provisioned to establish majority'
    ),
    createLogEvent(
      EventType.STATUS_CHANGE,
      `Cluster now has ${totalVotingNodes} voting members total (${onlineVotingNodes} online, 2 failed in DC)`,
      'Failed DC nodes still count toward total voting member configuration'
    ),
    createLogEvent(
      EventType.MAJORITY,
      `Majority re-established: ${onlineVotingNodes} of ${totalVotingNodes} voting members online (majority achieved)`
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
          votingRights: VotingRights.VOTING,
          region: 'dr-cluster-restored',
          datacenter: 'Region-B',
        },
        {
          id: 'restored-secondary1',
          name: 'Restored Secondary 1',
          role: NodeRole.SECONDARY,
          status: NodeStatus.UP,
          votingRights: VotingRights.VOTING,
          region: 'dr-cluster-restored',
          datacenter: 'Region-B',
        },
        {
          id: 'restored-secondary2',
          name: 'Restored Secondary 2',
          role: NodeRole.SECONDARY,
          status: NodeStatus.UP,
          votingRights: VotingRights.VOTING,
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
    node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTING
  );
  
  const totalVotingNodes = regionNodes.filter(node => node.votingRights === VotingRights.VOTING).length;
  const hasMajority = upVotingNodes.length > totalVotingNodes / 2;
  
  // Check current primary status in this region
  const currentPrimary = regionNodes.find(node => node.role === NodeRole.PRIMARY);
  const hasPrimary = upVotingNodes.some(node => node.role === NodeRole.PRIMARY);
  
  // If we have a primary but no majority, primary should step down
  if (currentPrimary && !hasMajority) {
    const updatedRegionNodes = regionNodes.map(node => 
      node.role === NodeRole.PRIMARY
        ? { ...node, role: NodeRole.SECONDARY }
        : node
    );

    const logEvents = [
      createLogEvent(
        EventType.ELECTION,
        `Primary ${currentPrimary.name} stepped down in ${regionId} due to loss of majority`,
        `Only ${upVotingNodes.length} of ${totalVotingNodes} voting members online (need majority)`
      ),
      createLogEvent(
        EventType.WARNING,
        `${regionId} cluster is now read-only - no primary available`,
        'Manual recovery actions may be required to restore write capability'
      ),
    ];

    return { updatedNodes: [...updatedRegionNodes, ...otherNodes], logEvents };
  }
  
  // If no primary exists in this region and we have majority, elect a new one
  if (!hasPrimary && hasMajority) {
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
        `Majority available with ${upVotingNodes.length} of ${totalVotingNodes} voting members online`
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
  
  if (!hasPrimary && !hasMajority) {
    logEvents.push(
      createLogEvent(
        EventType.WARNING,
        `No majority available for primary election in ${regionId}`,
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
export const toggleNodeStatus = (nodes: MongoNode[], nodeId: string, scenarioType?: ScenarioType, deploymentMode?: DeploymentMode): { updatedNodes: MongoNode[], logEvents: LogEvent[] } => {
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

  // Check if we need to elect a new primary after status change
  const changedNode = updatedNodes.find(node => node.id === nodeId);
  const primaryDown = changedNode && 
    changedNode.role === NodeRole.PRIMARY && 
    changedNode.status === NodeStatus.DOWN;

  // Check if we need to elect a new primary when a node comes back up
  const nodeComingUp = changedNode && changedNode.status === NodeStatus.UP;
  const upVotingNodes = updatedNodes.filter(
    node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTING
  );
  const totalVotingNodes = updatedNodes.filter(node => node.votingRights === VotingRights.VOTING).length;
  const hasMajority = upVotingNodes.length > totalVotingNodes / 2;
  const hasPrimary = upVotingNodes.some(node => node.role === NodeRole.PRIMARY);

  console.log('toggleNodeStatus:', {
    nodeId,
    scenarioType,
    deploymentMode,
    hasMajority,
    hasPrimary,
    upVotingNodes: upVotingNodes.length,
    totalVotingNodes,
    primaryDown,
    nodeComingUp,
    changedNode: changedNode ? {id: changedNode.id, name: changedNode.name, region: changedNode.region, status: changedNode.status} : null
  });

  let finalNodes = updatedNodes;
  
  if (primaryDown) {
    // Primary went down - try to elect new one
    if (scenarioType === ScenarioType.HOT_STANDBY) {
      const { updatedNodes: nodesAfterElection, logEvents: electionEvents } = 
        electNewPrimaryInRegion(updatedNodes, changedNode.region);
      finalNodes = nodesAfterElection;
      logEvents.push(...electionEvents);
    } else {
      // For other scenarios, use global election
      const { updatedNodes: nodesAfterElection, logEvents: electionEvents } = electNewPrimary(updatedNodes, scenarioType, deploymentMode);
      finalNodes = nodesAfterElection;
      logEvents.push(...electionEvents);
    }
  } else if (!hasMajority && hasPrimary) {
    // Majority lost while primary is still up - primary should step down
    if (scenarioType === ScenarioType.HOT_STANDBY) {
      const { updatedNodes: nodesAfterElection, logEvents: electionEvents } = 
        electNewPrimaryInRegion(updatedNodes, updatedNodes.find(n => n.role === NodeRole.PRIMARY)?.region || '');
      finalNodes = nodesAfterElection;
      logEvents.push(...electionEvents);
    } else {
      // For other scenarios, use global election (which will handle primary step-down)
      const { updatedNodes: nodesAfterElection, logEvents: electionEvents } = electNewPrimary(updatedNodes, scenarioType, deploymentMode);
      finalNodes = nodesAfterElection;
      logEvents.push(...electionEvents);
    }
  } else if (nodeComingUp && hasMajority && !hasPrimary) {
    // Node came back up and we now have majority but no primary - elect one
    if (scenarioType === ScenarioType.HOT_STANDBY) {
      const { updatedNodes: nodesAfterElection, logEvents: electionEvents } = 
        electNewPrimaryInRegion(updatedNodes, changedNode.region);
      finalNodes = nodesAfterElection;
      logEvents.push(...electionEvents);
    } else {
      // For other scenarios, use global election
      const { updatedNodes: nodesAfterElection, logEvents: electionEvents } = electNewPrimary(updatedNodes, scenarioType, deploymentMode);
      finalNodes = nodesAfterElection;
      logEvents.push(...electionEvents);
    }
  } else if (nodeComingUp && hasMajority && hasPrimary && scenarioType === ScenarioType.MULTI_DC && deploymentMode === DeploymentMode.ATLAS) {
    // Special case for Atlas Multi-DC: Node coming back online might have higher priority than current primary
    const currentPrimary = updatedNodes.find(n => n.role === NodeRole.PRIMARY);
    const changedNodeInPrimaryDC1 = changedNode && changedNode.region === 'primary-dc1';
    const currentPrimaryNotInPrimaryDC1 = currentPrimary && currentPrimary.region !== 'primary-dc1';
    
    // If a Primary DC1 node comes back online and current primary is not in Primary DC1, trigger re-election
    if (changedNodeInPrimaryDC1 && currentPrimaryNotInPrimaryDC1) {
      const { updatedNodes: nodesAfterElection, logEvents: electionEvents } = electNewPrimary(updatedNodes, scenarioType, deploymentMode);
      finalNodes = nodesAfterElection;
      logEvents.push(...electionEvents);
    }
  }

  return { updatedNodes: finalNodes, logEvents };
};

// Get recovery actions for each scenario
export const getRecoveryActions = (scenario: ScenarioType, nodes: MongoNode[], deploymentMode?: DeploymentMode) => {
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
      // The cluster relies on automatic primary election if majority is maintained
      return [];

    case ScenarioType.BASIC_DR:
      // Only show recovery actions if ALL nodes in DC region failed (both nodes down)
      const dcNodesBasic = nodes.filter(node => node.region === 'primary-dc');
      const dcNodesDownBasic = nodes.filter(
        node => node.region === 'primary-dc' && node.status === NodeStatus.DOWN
      );
      const allDCNodesFailedBasic = dcNodesBasic.length === dcNodesDownBasic.length && dcNodesBasic.length > 0;
      
      if (allDCNodesFailedBasic) {
        const recoveryActions = [];
        
        // Only show "Reconfigure DR as Standalone" for Enterprise deployment mode
        if (deploymentMode !== DeploymentMode.ATLAS) {
          recoveryActions.push({
            id: 'reconfigure-standalone',
            label: 'Reconfigure DR as Standalone',
            action: reconfigureStandalone,
          });
        }
        
        recoveryActions.push({
          id: 'add-new-nodes',
          label: 'Add 2 New Nodes to DR',
          action: addNewNodesToDR,
        });
        
        return recoveryActions;
      }
      return [];

    case ScenarioType.ENHANCED_DR:
      // Only show recovery action if ALL nodes in DC region failed (both nodes down)
      const dcNodesEnhanced = nodes.filter(node => node.region === 'primary-dc');
      const dcNodesDownEnhanced = nodes.filter(
        node => node.region === 'primary-dc' && node.status === NodeStatus.DOWN
      );
      const allDCNodesFailedEnhanced = dcNodesEnhanced.length === dcNodesDownEnhanced.length && dcNodesEnhanced.length > 0;
      
      if (allDCNodesFailedEnhanced) {
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
      // Only show recovery actions if ALL nodes in DC region failed (both nodes down)
      const dcNodes2Step = nodes.filter(node => node.region === 'primary-dc');
      const dcNodesDown2Step = nodes.filter(
        node => node.region === 'primary-dc' && node.status === NodeStatus.DOWN
      );
      const allDCNodesFailed2Step = dcNodes2Step.length === dcNodesDown2Step.length && dcNodes2Step.length > 0;
      
      if (allDCNodesFailed2Step) {
        // Check if we're in step 1 or step 2 by looking for a read-only node that became a voter
        const readOnlyNodePromoted = nodes.some(
          node => node.region === 'dr-region' && 
                   node.name.includes('Read-Only') &&
                   node.role === NodeRole.SECONDARY && 
                   node.votingRights === VotingRights.VOTING
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
      // Show recovery action only if DC cluster lost majority (2+ nodes down)
      const dcNodesHotStandby = nodes.filter(node => node.region === 'dc-cluster');
      const dcUpVotingNodes = dcNodesHotStandby.filter(
        node => node.status === NodeStatus.UP && node.votingRights === VotingRights.VOTING
      );
      const dcTotalVotingNodes = dcNodesHotStandby.filter(node => node.votingRights === VotingRights.VOTING).length;
      const dcHasMajority = dcUpVotingNodes.length > dcTotalVotingNodes / 2;
      
      // Only show recovery action when DC cluster loses majority (cannot elect primary)
      if (!dcHasMajority) {
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
