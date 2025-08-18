import React from 'react';
import { MapPin, Building, Globe } from 'lucide-react';
import { ArchitectureDiagramProps, MongoNode, Region } from '@/types';
import Node from './Node';

const ArchitectureDiagram: React.FC<ArchitectureDiagramProps> = ({ 
  scenario, 
  nodes 
}) => {
  const getRegionIcon = (regionType: string) => {
    switch (regionType) {
      case 'primary':
        return <Building className="w-5 h-5 text-blue-600" />;
      case 'secondary':
        return <Building className="w-5 h-5 text-green-600" />;
      case 'dr':
        return <Globe className="w-5 h-5 text-purple-600" />;
      default:
        return <MapPin className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRegionClasses = (regionType: string) => {
    switch (regionType) {
      case 'primary':
        return 'bg-blue-50 border-blue-200';
      case 'secondary':
        return 'bg-green-50 border-green-200';
      case 'dr':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getNodesForRegion = (region: Region): MongoNode[] => {
    return nodes.filter(node => node.region === region.id);
  };

  const getRegionStatus = (regionNodes: MongoNode[]) => {
    const upNodes = regionNodes.filter(node => node.status === 'up').length;
    const totalNodes = regionNodes.length;
    
    if (upNodes === 0) {
      return { label: 'All Down', color: 'text-red-600' };
    } else if (upNodes === totalNodes) {
      return { label: 'All Up', color: 'text-green-600' };
    } else {
      return { label: `${upNodes}/${totalNodes} Up`, color: 'text-yellow-600' };
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {scenario.name}
        </h3>
        <p className="text-gray-600 text-sm">
          {scenario.description}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
        {scenario.regions.map((region: Region) => {
          const regionNodes = getNodesForRegion(region);
          const regionStatus = getRegionStatus(regionNodes);
          
          return (
            <div
              key={region.id}
              className={`border-2 rounded-lg p-4 transition-all duration-300 ${getRegionClasses(region.type)}`}
            >
              {/* Region Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {getRegionIcon(region.type)}
                  <h4 className="font-semibold text-gray-900">
                    {region.name}
                  </h4>
                </div>
                <span className={`text-xs font-medium ${regionStatus.color}`}>
                  {regionStatus.label}
                </span>
              </div>

              {/* Region Badge */}
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-300">
                  {region.type.toUpperCase()} REGION
                </span>
              </div>

              {/* Nodes in Region */}
              <div className="space-y-3">
                {regionNodes.map((node: MongoNode) => (
                  <Node 
                    key={node.id} 
                    node={node}
                    onClick={() => {
                      // Optional: Add node click handler for future features
                      console.log(`Clicked node: ${node.name}`);
                    }}
                  />
                ))}
              </div>

              {/* Region Summary */}
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
            </div>
          );
        })}
      </div>

      {/* Overall Cluster Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h5 className="font-semibold text-gray-900 mb-3">Cluster Overview</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-lg text-gray-900">
              {nodes.length}
            </div>
            <div className="text-gray-600">Total Nodes</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg text-green-600">
              {nodes.filter(node => node.status === 'up').length}
            </div>
            <div className="text-gray-600">Online</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg text-blue-600">
              {nodes.filter(node => node.votingRights === 'voter').length}
            </div>
            <div className="text-gray-600">Voting</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg text-purple-600">
              {nodes.filter(node => node.role === 'primary').length}
            </div>
            <div className="text-gray-600">Primary</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureDiagram;
