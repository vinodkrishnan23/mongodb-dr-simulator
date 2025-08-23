import React from 'react';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Users,
  Server,
  Crown,
  Vote
} from 'lucide-react';
import { ControlPanelProps, ActionButton, NodeRole } from '@/types';

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  availableActions, 
  clusterStatus,
  nodes 
}) => {
  const getStatusIcon = (isOperational: boolean, votingNodes: number) => {
    if (isOperational) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (votingNodes > 0) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusLabel = (isOperational: boolean, votingNodes: number) => {
    if (isOperational) {
      return 'Operational';
    } else if (votingNodes > 0) {
      return 'Degraded';
    } else {
      return 'Down';
    }
  };

  const getStatusClasses = (isOperational: boolean, votingNodes: number) => {
    if (isOperational) {
      return 'bg-white border-green-700 text-green-800';
    } else if (votingNodes > 0) {
      return 'bg-white border-green-700 text-yellow-800';
    } else {
      return 'bg-white border-green-700 text-red-800';
    }
  };

  const getButtonClasses = (variant: string) => {
    switch (variant) {
      case 'primary':
        return 'btn-primary';
      case 'secondary':
        return 'btn-secondary';
      case 'danger':
        return 'btn-danger';
      case 'warning':
        return 'btn-warning';
      case 'success':
        return 'btn-success';
      default:
        return 'btn-secondary';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border-2 border-green-700">
      {/* Cluster Status Header */}
      <div className="bg-white px-6 py-4 border-b-2 border-green-700 rounded-t-lg">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Activity className="w-5 h-5 text-gray-600" />
          <span>Cluster Control Panel</span>
        </h3>
      </div>

      {/* Cluster Status */}
      <div className="p-6">
        <div className={`p-4 rounded-lg border-2 mb-6 ${getStatusClasses(clusterStatus.isOperational, clusterStatus.votingNodes)}`}>
          <div className="flex items-center space-x-3 mb-3">
            {getStatusIcon(clusterStatus.isOperational, clusterStatus.votingNodes)}
            <h4 className="font-semibold text-lg">
              Cluster Status: {getStatusLabel(clusterStatus.isOperational, clusterStatus.votingNodes)}
            </h4>
          </div>
          
          {/* Check if we have a standalone configuration */}
          {nodes.some(node => node.role === NodeRole.STANDALONE) ? (
            // Standalone node display - no majority concepts
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Server className="w-4 h-4" />
                <span>Write Capability: {clusterStatus.canWrite ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Crown className="w-4 h-4" />
                <span>Standalone Node: Yes</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Configuration: Single Node</span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>Replication: Disabled</span>
              </div>
            </div>
          ) : (
            // Replica set display - show majority information
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Majority: {clusterStatus.hasMajority ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Server className="w-4 h-4" />
                <span>Write Capability: {clusterStatus.canWrite ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Vote className="w-4 h-4" />
                <span>Voting: {clusterStatus.votingNodes}/{clusterStatus.totalVotingNodes} Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <Crown className="w-4 h-4" />
                <span>Primary: {clusterStatus.primaryNode ? 'Yes' : 'No'}</span>
              </div>
            </div>
          )}

          {!clusterStatus.isOperational && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-20">
              <p className="text-sm font-medium">
                {clusterStatus.votingNodes === 0
                  ? '❌ Cluster is down - no voting nodes available'
                  : !clusterStatus.canWrite 
                    ? '⚠️ Cluster has lost majority and is read-only'
                    : '⚠️ Cluster is degraded but operational'
                }
              </p>
            </div>
          )}
          
          {clusterStatus.isOperational && clusterStatus.primaryNode && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-20">
              <p className="text-sm font-medium">
                {/* Check if we have a standalone configuration */}
                {nodes.some(node => node.role === NodeRole.STANDALONE)
                  ? '✅ Standalone node operational - reads and writes enabled (no replication)'
                  : clusterStatus.hasMajority && clusterStatus.votingNodes > 0
                  ? '✅ Replica set operational with healthy majority'
                  : '✅ System operational'
                }
              </p>
            </div>
          )}
        </div>

        {/* Detailed Status */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h5 className="font-semibold text-gray-900 mb-3">
            {clusterStatus.replicaSets ? 'Replica Sets Status' : 'Detailed Status'}
          </h5>
          
          {/* Multi-replica set display for Hot Standby and Cold Standby */}
          {clusterStatus.replicaSets ? (
            <div className="space-y-4">
              {clusterStatus.replicaSets.map((replicaSet, index) => (
                <div key={replicaSet.region} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h6 className="font-medium text-gray-900">{replicaSet.name}</h6>
                    <div className="flex items-center space-x-2">
                      {replicaSet.clusterState && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          replicaSet.clusterState === 'active' 
                            ? 'bg-green-100 text-green-700'
                            : replicaSet.clusterState === 'standby'
                            ? 'bg-yellow-100 text-yellow-700'
                            : replicaSet.clusterState === 'down'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {replicaSet.clusterState.toUpperCase()}
                        </span>
                      )}
                      <span className={`text-xs font-medium ${
                        replicaSet.isOperational ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {replicaSet.isOperational ? 'Operational' : 'Down'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Nodes:</span>
                      <span className="font-medium">{replicaSet.totalNodes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Write Capable:</span>
                      <span className="font-medium">{replicaSet.canWrite ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Voting:</span>
                      <span className="font-medium">{replicaSet.votingNodes}/{replicaSet.totalVotingNodes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Primary:</span>
                      <span className="font-medium">{replicaSet.primaryNode ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Overall summary */}
              <div className="pt-3 border-t border-gray-300">
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Total Nodes Across All Clusters:</span>
                    <span className="font-medium">{clusterStatus.totalNodes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Architecture:</span>
                    <span className="font-medium">
                      {clusterStatus.scenarioType === 'multi' ? 'Multi-Cluster' : 'Backup/Restore'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Single replica set display
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Total Nodes:</span>
                <span className="font-medium">{clusterStatus.totalNodes}</span>
              </div>
              
              {/* Show different details for standalone vs replica set */}
              {nodes.some(node => node.role === NodeRole.STANDALONE) ? (
                // Standalone configuration details
                <>
                  <div className="flex justify-between">
                    <span>Node Type:</span>
                    <span className="font-medium">Standalone MongoDB Instance</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Replication:</span>
                    <span className="font-medium">None (Single Node)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>High Availability:</span>
                    <span className="font-medium">No (No Failover)</span>
                  </div>
                  {clusterStatus.primaryNode && (
                    <div className="flex justify-between">
                      <span>Active Node:</span>
                      <span className="font-medium">{clusterStatus.primaryNode}</span>
                    </div>
                  )}
                </>
              ) : (
                // Replica set configuration details
                <>
                  <div className="flex justify-between">
                    <span>Total Voting Members:</span>
                    <span className="font-medium">{clusterStatus.totalVotingNodes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Online Voting Members:</span>
                    <span className="font-medium">{clusterStatus.votingNodes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Majority Required:</span>
                    <span className="font-medium">
                      {Math.floor(clusterStatus.totalVotingNodes / 2) + 1}
                    </span>
                  </div>
                  {clusterStatus.primaryNode && (
                    <div className="flex justify-between">
                      <span>Primary Node:</span>
                      <span className="font-medium">{clusterStatus.primaryNode}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div>
          <h5 className="font-semibold text-gray-900 mb-3">Available Actions</h5>
          {availableActions.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">No actions available at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableActions.map((action: ActionButton) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  disabled={action.disabled}
                  className={`
                    w-full ${getButtonClasses(action.variant)} 
                    disabled:opacity-50 disabled:cursor-not-allowed
                    text-left flex items-center justify-between
                  `}
                >
                  <span>{action.label}</span>
                  {action.variant === 'danger' && <XCircle className="w-4 h-4" />}
                  {action.variant === 'warning' && <AlertTriangle className="w-4 h-4" />}
                  {action.variant === 'success' && <CheckCircle className="w-4 h-4" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
