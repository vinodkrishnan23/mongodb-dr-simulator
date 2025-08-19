import React from 'react';
import { 
  ArrowRight, 
  HardDrive, 
  Activity, 
  Pause,
  Building,
  Globe,
  Server
} from 'lucide-react';
import { MongoNode, Region, NodeRole } from '@/types';
import Node from './Node';

interface RegionClusterProps {
  region: Region;
  nodes: MongoNode[];
  showSyncArrow?: boolean;
  isTarget?: boolean;
}

const RegionCluster: React.FC<RegionClusterProps> = ({ 
  region, 
  nodes, 
  showSyncArrow = false,
  isTarget = false 
}) => {
  const getRegionIcon = (regionType: string) => {
    switch (regionType) {
      case 'primary':
        return <Building className="w-5 h-5 text-blue-600" />;
      case 'secondary':
        return <Building className="w-5 h-5 text-green-600" />;
      case 'dr':
        return <Globe className="w-5 h-5 text-purple-600" />;
      case 'cluster':
        return <Server className="w-5 h-5 text-indigo-600" />;
      case 'backup':
        return <HardDrive className="w-5 h-5 text-orange-600" />;
      default:
        return <Building className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRegionClasses = (regionType: string, clusterState?: string) => {
    let baseClasses = 'border-2 rounded-lg p-4 transition-all duration-300';
    
    if (regionType === 'backup') {
      return `${baseClasses} bg-orange-50 border-orange-200`;
    }
    
    if (regionType === 'cluster') {
      switch (clusterState) {
        case 'active':
          return `${baseClasses} bg-green-50 border-green-300 shadow-lg`;
        case 'standby':
          return `${baseClasses} bg-gray-50 border-gray-300`;
        case 'down':
          return `${baseClasses} bg-red-50 border-red-300 opacity-60`;
        default:
          return `${baseClasses} bg-blue-50 border-blue-200`;
      }
    }
    
    // Default region styling
    switch (regionType) {
      case 'primary':
        return `${baseClasses} bg-blue-50 border-blue-200`;
      case 'secondary':
        return `${baseClasses} bg-green-50 border-green-200`;
      case 'dr':
        return `${baseClasses} bg-purple-50 border-purple-200`;
      default:
        return `${baseClasses} bg-gray-50 border-gray-200`;
    }
  };

  const getClusterStateLabel = (clusterState?: string) => {
    switch (clusterState) {
      case 'active':
        return { label: 'ACTIVE', color: 'text-green-600 bg-green-100' };
      case 'standby':
        return { label: 'HOT STANDBY', color: 'text-yellow-600 bg-yellow-100' };
      case 'down':
        return { label: 'DOWN', color: 'text-red-600 bg-red-100' };
      case 'provisioning':
        return { label: 'PROVISIONING', color: 'text-blue-600 bg-blue-100' };
      default:
        return null;
    }
  };

  const regionNodes = nodes.filter(node => node.region === region.id);
  const regionStatus = getRegionStatus(regionNodes, region.type);
  const stateLabel = getClusterStateLabel(region.clusterState);

  function getRegionStatus(regionNodes: MongoNode[], regionType: string) {
    // For backup storage, show storage availability based on region cluster state
    if (regionType === 'backup') {
      if (region.clusterState === 'down') {
        return { label: 'Storage Unavailable', color: 'text-red-600' };
      } else {
        return { label: 'Storage Available', color: 'text-green-600' };
      }
    }
    
    const upNodes = regionNodes.filter(node => node.status === 'up').length;
    const totalNodes = regionNodes.length;
    
    if (totalNodes === 0) {
      return { label: 'No Nodes', color: 'text-gray-600' };
    } else if (upNodes === 0) {
      return { label: 'All Down', color: 'text-red-600' };
    } else if (upNodes === totalNodes) {
      return { label: 'All Up', color: 'text-green-600' };
    } else {
      return { label: `${upNodes}/${totalNodes} Up`, color: 'text-yellow-600' };
    }
  }

  return (
    <div className="relative">
      <div className={getRegionClasses(region.type, region.clusterState)}>
        {/* Region Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {getRegionIcon(region.type)}
            <h4 className="font-semibold text-gray-900">
              {region.name}
            </h4>
          </div>
          <div className="flex items-center space-x-2">
            {stateLabel && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${stateLabel.color}`}>
                {stateLabel.label}
              </span>
            )}
            <span className={`text-xs font-medium ${regionStatus.color}`}>
              {regionStatus.label}
            </span>
          </div>
        </div>

        {/* Cluster-to-Cluster Sync Indicator for Hot Standby */}
        {region.hasSync && (
          <div className="mb-4 flex items-center space-x-2 p-2 bg-blue-100 rounded-md">
            <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
            <div>
              <span className="text-sm font-medium text-blue-800">
                Cluster-2-Cluster Sync Source
              </span>
              <div className="text-xs text-blue-600">
                Continuously replicating to DR cluster
              </div>
            </div>
          </div>
        )}

        {/* Region Type Badge */}
        <div className="mb-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-300">
            {region.type.toUpperCase()} {region.type === 'cluster' ? 'CLUSTER' : 'REGION'}
          </span>
          
          {/* Special indicator for Hot Standby DR cluster */}
          {region.type === 'cluster' && region.clusterState === 'standby' && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300">
                📱 Invisible to Apps
              </span>
            </div>
          )}
        </div>

        {/* Special handling for backup storage - Not MongoDB nodes but storage infrastructure */}
        {region.type === 'backup' ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-orange-200">
              <HardDrive className="w-8 h-8 text-orange-600" />
              <div>
                <h5 className="font-medium text-gray-900">Cloud Storage</h5>
                <p className="text-sm text-gray-600">Automated Database Backups</p>
                <div className="text-xs text-gray-500 mt-1">
                  • Daily snapshots (Full backups)
                </div>
                <div className="text-xs text-gray-500">
                  • PITR logs (Point-in-Time Recovery)
                </div>
                <div className="flex items-center space-x-1 mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600">Storage Available</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-orange-700 bg-orange-100 p-2 rounded-md">
              💡 This is backup storage infrastructure, not MongoDB nodes
            </div>
          </div>
        ) : (
          // Regular nodes display
          <div className="space-y-3">
            {regionNodes.map((node: MongoNode) => (
              <Node 
                key={node.id} 
                node={node}
                onClick={() => {
                  console.log(`Clicked node: ${node.name}`);
                }}
              />
            ))}
          </div>
        )}

        {/* Region Summary */}
        {region.type === 'backup' ? (
          <div className="mt-4 pt-3 border-t border-orange-200">
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Storage Type:</span>
                <span className="font-medium">Cloud Object Storage/Local Storage</span>
              </div>
            </div>
          </div>
        ) : regionNodes.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Total Nodes:</span>
                <span className="font-medium">{regionNodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Voting Nodes:</span>
                <span className="font-medium">
                  {regionNodes.filter(node => node.votingRights === 'voter').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Online:</span>
                <span className="font-medium">
                  {regionNodes.filter(node => node.status === 'up').length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sync Arrow */}
      {showSyncArrow && (
        <div className="absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
          <div className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-blue-300 shadow-lg">
            <ArrowRight className="w-6 h-6 text-blue-600 animate-pulse" />
          </div>
          <div className="text-xs text-center mt-1 text-blue-600 font-medium">
            Cluster Sync
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionCluster;
