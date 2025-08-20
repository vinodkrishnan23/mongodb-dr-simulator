import React from 'react';
import { 
  Server, 
  Crown, 
  Shield, 
  Eye, 
  X, 
  RefreshCw,
  Vote,
  MinusCircle,
  Database,
  HardDrive,
  Loader2
} from 'lucide-react';
import { 
  MongoNode, 
  NodeRole, 
  NodeStatus, 
  VotingRights,
  NodeProps 
} from '@/types';

const Node: React.FC<NodeProps> = ({ node, onClick }) => {
  const getRoleIcon = (role: NodeRole) => {
    switch (role) {
      case NodeRole.PRIMARY:
        return null; // No icon for Primary
      case NodeRole.SECONDARY:
        return null; // No icon for Secondary
      case NodeRole.READ_ONLY:
        return <Eye className="w-5 h-5 text-gray-600" />;
      case NodeRole.STANDALONE:
        return <Server className="w-5 h-5 text-purple-600" />;
      case NodeRole.BACKUP_STORAGE:
        return <HardDrive className="w-5 h-5 text-orange-600" />;
      default:
        return <Server className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRoleLabel = (role: NodeRole) => {
    switch (role) {
      case NodeRole.PRIMARY:
        return 'Primary';
      case NodeRole.SECONDARY:
        return 'Secondary';
      case NodeRole.READ_ONLY:
        return 'Read Only';
      case NodeRole.STANDALONE:
        return 'Standalone';
      case NodeRole.BACKUP_STORAGE:
        return 'Backup Storage';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = (status: NodeStatus) => {
    switch (status) {
      case NodeStatus.UP:
        return <div className="w-3 h-3 bg-green-500 rounded-full" />;
      case NodeStatus.DOWN:
        return <X className="w-4 h-4 text-red-500" />;
      case NodeStatus.RECOVERING:
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      case NodeStatus.PROVISIONING:
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case NodeStatus.RESTORING:
        return <Database className="w-4 h-4 text-purple-500 animate-pulse" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  const getStatusLabel = (status: NodeStatus) => {
    switch (status) {
      case NodeStatus.UP:
        return 'Online';
      case NodeStatus.DOWN:
        return 'Offline';
      case NodeStatus.RECOVERING:
        return 'Recovering';
      case NodeStatus.PROVISIONING:
        return 'Provisioning';
      case NodeStatus.RESTORING:
        return 'Restoring';
      default:
        return 'Unknown';
    }
  };

  const getVotingIcon = (votingRights: VotingRights) => {
    return votingRights === VotingRights.VOTER 
      ? <Vote className="w-4 h-4 text-blue-600" />
      : <MinusCircle className="w-4 h-4 text-gray-400" />;
  };

  const getVotingLabel = (votingRights: VotingRights) => {
    return votingRights === VotingRights.VOTER ? 'Voting' : 'Non-Voting';
  };

  const getNodeClasses = () => {
    let baseClasses = 'node-card cursor-pointer hover:shadow-lg transition-all duration-300 min-h-36';
    
    if (node.status === NodeStatus.DOWN) {
      baseClasses += ' node-down';
    } else if (node.role === NodeRole.PRIMARY) {
      baseClasses += ' node-primary';
    } else if (node.role === NodeRole.SECONDARY) {
      baseClasses += ' node-secondary';
    } else if (node.status === NodeStatus.RECOVERING) {
      baseClasses += ' node-recovering';
    }
    
    return baseClasses;
  };

  return (
    <div 
      className={getNodeClasses()}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      <div className="flex items-start min-h-full">
        {/* Left-aligned Database Icon - 40% width */}
        <div className="w-2/5 flex-shrink-0 flex items-center justify-center py-2">
          <img src="/Database.png" alt="MongoDB Database" className="w-full max-h-24 object-contain" />
        </div>

        {/* Right-aligned Content - 60% width */}
        <div className="w-3/5 flex-1 min-w-0 pl-3 py-2 flex flex-col justify-between min-h-full">
          {/* Top Section */}
          <div className="flex-1">
            {/* Status Icon - Top Right */}
            <div className="flex justify-end mb-2">
              {getStatusIcon(node.status)}
            </div>

            {/* Role Information */}
            <div className="text-right mb-1">
              {getRoleIcon(node.role) && (
                <div className="flex items-center justify-end space-x-2 mb-1">
                  {getRoleIcon(node.role)}
                  <span className="text-sm font-medium text-gray-700">
                    {getRoleLabel(node.role)}
                  </span>
                </div>
              )}
              {!getRoleIcon(node.role) && (
                <span className="text-sm font-medium text-gray-700">
                  {getRoleLabel(node.role)}
                </span>
              )}
            </div>

            {/* Status Information */}
            <div className="text-right mb-1">
              <span className="text-sm text-gray-600">
                Status: {getStatusLabel(node.status)}
              </span>
            </div>

            {/* Voting Rights */}
            <div className="flex items-center justify-end space-x-2 mb-2">
              {getVotingIcon(node.votingRights)}
              <span className="text-sm text-gray-600">
                {getVotingLabel(node.votingRights)}
              </span>
            </div>
          </div>

          {/* Bottom Section - Datacenter */}
          <div className="text-xs text-gray-500 text-right pt-2 border-t border-gray-200 mt-auto">
            {node.datacenter}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Node;
