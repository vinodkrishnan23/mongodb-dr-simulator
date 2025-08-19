// Node types and enums
export enum NodeRole {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  READ_ONLY = 'read_only',
  STANDALONE = 'standalone',
  BACKUP_STORAGE = 'backup_storage',
}

export enum NodeStatus {
  UP = 'up',
  DOWN = 'down',
  RECOVERING = 'recovering',
  PROVISIONING = 'provisioning',
  RESTORING = 'restoring',
}

export enum VotingRights {
  VOTER = 'voter',
  NON_VOTER = 'non_voter',
}

export interface MongoNode {
  id: string;
  name: string;
  role: NodeRole;
  status: NodeStatus;
  votingRights: VotingRights;
  region: string;
  datacenter: string;
}

// Event log types
export enum EventType {
  INITIALIZATION = 'initialization',
  FAILURE = 'failure',
  RECOVERY_ACTION = 'recovery_action',
  STATUS_CHANGE = 'status_change',
  ELECTION = 'election',
  QUORUM = 'quorum',
  WARNING = 'warning',
  SUCCESS = 'success',
}

export interface LogEvent {
  id: string;
  timestamp: Date;
  type: EventType;
  message: string;
  details?: string;
}

// Scenario types
export enum ScenarioType {
  BASIC_DR = 'basic_dr',
  ENHANCED_DR = 'enhanced_dr',
  MULTI_DC = 'multi_dc',
  ENHANCED_2_STEP = 'enhanced_2_step',
  HOT_STANDBY = 'hot_standby',
  COLD_STANDBY = 'cold_standby',
}

export interface Scenario {
  id: ScenarioType;
  name: string;
  description: string;
  nodes: MongoNode[];
  regions: Region[];
}

export interface Region {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'dr' | 'backup' | 'cluster';
  nodes: string[]; // Node IDs
  clusterState?: 'active' | 'standby' | 'down' | 'provisioning';
  hasSync?: boolean; // For cluster-to-cluster sync
}

// Simulation state
export enum SimulationPhase {
  INITIAL = 'initial',
  FAILURE_OCCURRED = 'failure_occurred',
  RECOVERY_ACTIONS = 'recovery_actions',
  RECOVERED = 'recovered',
  STEP_1_COMPLETE = 'step_1_complete',
  PROVISIONING = 'provisioning',
  RESTORING = 'restoring',
}

export interface SimulationState {
  currentScenario: ScenarioType;
  phase: SimulationPhase;
  nodes: MongoNode[];
  logs: LogEvent[];
  availableActions: ActionButton[];
  clusterStatus: ClusterStatus;
  recoveryStep?: number; // For multi-step recovery processes
  progressPercent?: number; // For backup/restore operations
  regions?: Region[]; // Dynamic regions state for advanced scenarios
}

export interface ActionButton {
  id: string;
  label: string;
  action: () => void;
  variant: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  disabled?: boolean;
}

export interface ReplicaSetStatus {
  name: string;
  region: string;
  isOperational: boolean;
  hasQuorum: boolean;
  canWrite: boolean;
  votingNodes: number; // Online voting nodes
  totalVotingNodes: number; // Total voting nodes in configuration (including failed)
  totalNodes: number;
  primaryNode?: string;
  clusterState?: 'active' | 'standby' | 'down' | 'provisioning';
}

export interface ClusterStatus {
  isOperational: boolean;
  hasQuorum: boolean;
  canWrite: boolean;
  votingNodes: number; // Online voting nodes
  totalVotingNodes: number; // Total voting nodes in configuration (including failed)
  totalNodes: number;
  primaryNode?: string;
  // For multi-replica set scenarios (Hot Standby, Cold Standby)
  replicaSets?: ReplicaSetStatus[];
  scenarioType?: 'single' | 'multi' | 'backup';
}

// Recovery action types
export enum RecoveryActionType {
  RECONFIGURE_STANDALONE = 'reconfigure_standalone',
  ADD_NEW_NODES = 'add_new_nodes',
  GRANT_VOTING_RIGHTS = 'grant_voting_rights',
}

export interface RecoveryAction {
  type: RecoveryActionType;
  label: string;
  description: string;
  execute: (nodes: MongoNode[]) => {
    updatedNodes: MongoNode[];
    logEvents: LogEvent[];
  };
}

// Component props
export interface NodeProps {
  node: MongoNode;
  onClick?: () => void;
}

export interface ArchitectureDiagramProps {
  scenario: Scenario;
  nodes: MongoNode[];
  dynamicRegions?: Region[];
}

export interface ControlPanelProps {
  availableActions: ActionButton[];
  clusterStatus: ClusterStatus;
  nodes: MongoNode[];
}

export interface EventLogProps {
  events: LogEvent[];
  maxHeight?: string;
}

export interface ScenarioTabsProps {
  currentScenario: ScenarioType;
  onScenarioChange: (scenario: ScenarioType) => void;
}
