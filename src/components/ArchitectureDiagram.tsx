import React from 'react';
import { MapPin, Building, Globe, ArrowRight } from 'lucide-react';
import { ArchitectureDiagramProps, MongoNode, Region, ScenarioType } from '@/types';
import Node from './Node';
import RegionCluster from './RegionCluster';

const ArchitectureDiagram: React.FC<ArchitectureDiagramProps> = ({ 
  scenario, 
  nodes,
  dynamicRegions,
  onNodeClick
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
        return 'bg-white border-green-700';
      case 'secondary':
        return 'bg-white border-green-700';
      case 'dr':
        return 'bg-white border-green-700';
      default:
        return 'bg-white border-green-700';
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

  // Combine scenario regions with any dynamic regions, with dynamic regions taking precedence
  const allRegions = dynamicRegions && dynamicRegions.length > 0 
    ? dynamicRegions 
    : scenario.regions;

  // Render different layouts based on scenario type
  const renderScenarioLayout = () => {
    if (scenario.id === ScenarioType.HOT_STANDBY) {
      // Special layout for Hot Standby with single cluster-to-cluster sync arrow
      return (
        <div className="flex items-center justify-center space-x-8">
          <div className="flex-1">
            <RegionCluster
              region={scenario.regions[0]}
              nodes={nodes}
              onNodeClick={onNodeClick}
            />
          </div>
          <div className="flex flex-col items-center space-y-2">
            {/* Check if sync is broken */}
            {dynamicRegions?.find(region => region.id === 'dc-cluster')?.syncBroken ? (
              <>
                {/* Broken sync display */}
                <div className="relative">
                  <ArrowRight className="w-10 h-10 text-red-500" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-0.5 bg-red-500 transform rotate-45"></div>
                    <div className="w-8 h-0.5 bg-red-500 transform -rotate-45 absolute"></div>
                  </div>
                </div>
                <span className="text-sm font-bold text-red-600">
                  Cluster-2-Cluster-Sync
                </span>
                <span className="text-xs text-red-500 font-medium">
                  🚫 BROKEN
                </span>
              </>
            ) : (
              <>
                {/* Streaming sync display */}
                <div className="relative">
                  <ArrowRight className="w-10 h-10 text-blue-600" />
                  {/* Streaming dots animation */}
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full overflow-hidden">
                    <div className="flex space-x-1 animate-pulse">
                      <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold text-blue-600">
                  Cluster-2-Cluster-Sync
                </span>
                <span className="text-xs text-blue-500 flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>📡 Streaming Data</span>
                </span>
              </>
            )}
          </div>
          <div className="flex-1">
            <RegionCluster
              region={scenario.regions[1]}
              nodes={nodes}
              isTarget={true}
              onNodeClick={onNodeClick}
            />
          </div>
        </div>
      );
    }
    
    if (scenario.id === ScenarioType.COLD_STANDBY) {
      // Special layout for Cold Standby with backup storage and restored cluster
      return (
        <div className="grid gap-6 lg:grid-cols-2 md:grid-cols-1">
          {allRegions.map((region: Region) => (
            <RegionCluster
              key={region.id}
              region={region}
              nodes={nodes}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      );
    }

    if (scenario.id === ScenarioType.SINGLE_REGION_NO_DR) {
      // Special layout for Single Region - 75% width centered
      return (
        <div className="flex justify-center">
          <div className="w-full max-w-none" style={{ width: '75%' }}>
            {allRegions.map((region: Region) => (
              <RegionCluster
                key={region.id}
                region={region}
                nodes={nodes}
                onNodeClick={onNodeClick}
              />
            ))}
          </div>
        </div>
      );
    }
    
    // Default layout for other scenarios
    // Use 2-column layout for scenarios with 2 regions (Primary DC + DR Region)
    const gridCols = allRegions.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3';
    
    return (
      <div className={`grid gap-6 ${gridCols} md:grid-cols-2 sm:grid-cols-1`}>
        {allRegions.map((region: Region) => {
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-green-800 border border-green-700">
                  {region.type.toUpperCase()} REGION
                </span>
              </div>

              {/* Nodes in Region */}
              <div className="space-y-3">
                {regionNodes.map((node: MongoNode) => (
                  <Node 
                    key={node.id} 
                    node={node}
                    onClick={() => onNodeClick?.(node.id)}
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
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md border-2 border-green-700 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {scenario.name}
        </h3>
        <p className="text-gray-600 text-sm">
          {scenario.description}
        </p>
      </div>

      {renderScenarioLayout()}

      {/* Overall Cluster Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h5 className="font-semibold text-gray-900 mb-3">DC+DR Cluster Overview</h5>
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
