// Node types and enums
export enum NodeRole {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  READ_ONLY = 'read_only',
  STANDALONE = 'standalone',
}

export enum NodeStatus {
  UP = 'up',
  DOWN = 'down',
  RECOVERING = 'recovering',
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
  type: 'primary' | 'secondary' | 'dr';
  nodes: string[]; // Node IDs
}

// Simulation state
export enum SimulationPhase {
  INITIAL = 'initial',
  FAILURE_OCCURRED = 'failure_occurred',
  RECOVERY_ACTIONS = 'recovery_actions',
  RECOVERED = 'recovered',
}

export interface SimulationState {
  currentScenario: ScenarioType;
  phase: SimulationPhase;
  nodes: MongoNode[];
  logs: LogEvent[];
  availableActions: ActionButton[];
  clusterStatus: ClusterStatus;
}

export interface ActionButton {
  id: string;
  label: string;
  action: () => void;
  variant: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  disabled?: boolean;
}

export interface ClusterStatus {
  isOperational: boolean;
  hasQuorum: boolean;
  canWrite: boolean;
  votingNodes: number;
  totalNodes: number;
  primaryNode?: string;
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
}

export interface ControlPanelProps {
  availableActions: ActionButton[];
  clusterStatus: ClusterStatus;
}

export interface EventLogProps {
  events: LogEvent[];
  maxHeight?: string;
}

export interface ScenarioTabsProps {
  currentScenario: ScenarioType;
  onScenarioChange: (scenario: ScenarioType) => void;
}
