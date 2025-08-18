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
import { ControlPanelProps, ActionButton } from '@/types';

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  availableActions, 
  clusterStatus 
}) => {
  const getStatusIcon = (isOperational: boolean, hasQuorum: boolean) => {
    if (isOperational) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (hasQuorum) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusLabel = (isOperational: boolean, hasQuorum: boolean) => {
    if (isOperational) {
      return 'Operational';
    } else if (hasQuorum) {
      return 'Degraded';
    } else {
      return 'Down';
    }
  };

  const getStatusClasses = (isOperational: boolean, hasQuorum: boolean) => {
    if (isOperational) {
      return 'bg-green-50 border-green-200 text-green-800';
    } else if (hasQuorum) {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    } else {
      return 'bg-red-50 border-red-200 text-red-800';
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
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* Cluster Status Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Activity className="w-5 h-5 text-gray-600" />
          <span>Cluster Control Panel</span>
        </h3>
      </div>

      {/* Cluster Status */}
      <div className="p-6">
        <div className={`p-4 rounded-lg border-2 mb-6 ${getStatusClasses(clusterStatus.isOperational, clusterStatus.hasQuorum)}`}>
          <div className="flex items-center space-x-3 mb-3">
            {getStatusIcon(clusterStatus.isOperational, clusterStatus.hasQuorum)}
            <h4 className="font-semibold text-lg">
              Cluster Status: {getStatusLabel(clusterStatus.isOperational, clusterStatus.hasQuorum)}
            </h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Quorum: {clusterStatus.hasQuorum ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4" />
              <span>Write Capability: {clusterStatus.canWrite ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Vote className="w-4 h-4" />
              <span>Voting Nodes: {clusterStatus.votingNodes}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Crown className="w-4 h-4" />
              <span>Primary: {clusterStatus.primaryNode ? 'Yes' : 'No'}</span>
            </div>
          </div>

          {!clusterStatus.isOperational && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-20">
              <p className="text-sm font-medium">
                {!clusterStatus.hasQuorum 
                  ? '⚠️ Cluster has lost quorum and is read-only'
                  : '⚠️ Cluster is degraded but operational'
                }
              </p>
            </div>
          )}
        </div>

        {/* Detailed Status */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h5 className="font-semibold text-gray-900 mb-3">Detailed Status</h5>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Total Nodes:</span>
              <span className="font-medium">{clusterStatus.totalNodes}</span>
            </div>
            <div className="flex justify-between">
              <span>Voting Members:</span>
              <span className="font-medium">{clusterStatus.votingNodes}</span>
            </div>
            <div className="flex justify-between">
              <span>Quorum Required:</span>
              <span className="font-medium">
                {Math.floor(clusterStatus.votingNodes / 2) + 1}
              </span>
            </div>
            {clusterStatus.primaryNode && (
              <div className="flex justify-between">
                <span>Primary Node:</span>
                <span className="font-medium">{clusterStatus.primaryNode}</span>
              </div>
            )}
          </div>
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
