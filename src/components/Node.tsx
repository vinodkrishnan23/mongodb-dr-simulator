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
        return <Crown className="w-5 h-5 text-blue-600" />;
      case NodeRole.SECONDARY:
        return <Shield className="w-5 h-5 text-green-600" />;
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
    let baseClasses = 'node-card cursor-pointer hover:shadow-lg transition-all duration-300';
    
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
      {/* Node Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Server className="w-5 h-5 text-gray-700" />
          <h3 className="font-semibold text-gray-900">{node.name}</h3>
        </div>
        {getStatusIcon(node.status)}
      </div>

      {/* Role Information */}
      <div className="flex items-center space-x-2 mb-2">
        {getRoleIcon(node.role)}
        <span className="text-sm font-medium text-gray-700">
          {getRoleLabel(node.role)}
        </span>
      </div>

      {/* Status Information */}
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-sm text-gray-600">
          Status: {getStatusLabel(node.status)}
        </span>
      </div>

      {/* Voting Rights */}
      <div className="flex items-center space-x-2 mb-2">
        {getVotingIcon(node.votingRights)}
        <span className="text-sm text-gray-600">
          {getVotingLabel(node.votingRights)}
        </span>
      </div>

      {/* Datacenter Information */}
      <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
        {node.datacenter}
      </div>
    </div>
  );
};

export default Node;
