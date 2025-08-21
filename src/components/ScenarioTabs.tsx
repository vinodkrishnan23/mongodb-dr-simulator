import React from 'react';
import { Database, Shield, Globe, GitBranch, RefreshCw, HardDrive } from 'lucide-react';
import { ScenarioTabsProps, ScenarioType, DeploymentMode, DeploymentRegion } from '@/types';

const ScenarioTabs: React.FC<ScenarioTabsProps> = ({ 
  currentScenario, 
  onScenarioChange,
  deploymentMode,
  deploymentRegion 
}) => {
  const scenarios = [
    {
      id: ScenarioType.SINGLE_REGION_NO_DR,
      name: '1 Region No DR',
      description: '3 Nodes: Single Region Replica Set',
      icon: <Database className="w-5 h-5" />,
      color: 'gray',
    },
    {
      id: ScenarioType.BASIC_DR,
      name: 'Basic DR',
      description: '3 Nodes: 2 DC + 1 DR',
      icon: <Database className="w-5 h-5" />,
      color: 'green',
    },
    {
      id: ScenarioType.ENHANCED_DR,
      name: 'Enhanced DR',
      description: '5 Nodes: 2 DC + 3 DR (2 Read-Only)',
      icon: <Shield className="w-5 h-5" />,
      color: 'green',
    },
    {
      id: ScenarioType.MULTI_DC,
      name: 'Highly Available',
      description: '5 Nodes: 2 DC1 + 2 DC2 + 1 DR',
      icon: <Globe className="w-5 h-5" />,
      color: 'green',
    },
    {
      id: ScenarioType.ENHANCED_2_STEP,
      name: '2-Step Recovery',
      description: '4 Nodes: 2 DC + 2 DR (1 Read-Only)',
      icon: <GitBranch className="w-5 h-5" />,
      color: 'green',
    },
    {
      id: ScenarioType.HOT_STANDBY,
      name: 'Hot Standby',
      description: '6 Nodes: 2 Independent Clusters + Sync',
      icon: <RefreshCw className="w-5 h-5" />,
      color: 'green',
    },
    {
      id: ScenarioType.COLD_STANDBY,
      name: 'Cold Standby',
      description: '3 Nodes: DC Cluster + Backup',
      icon: <HardDrive className="w-5 h-5" />,
      color: 'green',
    },
  ];

  // Filter scenarios based on deployment mode and region combination
  const getVisibleScenarios = () => {
    // Single region scenarios - both Atlas and Enterprise
    if (deploymentRegion === DeploymentRegion.ONE) {
      return scenarios.filter(scenario => 
        [ScenarioType.SINGLE_REGION_NO_DR].includes(scenario.id)
      );
    }
    
    if (deploymentMode === DeploymentMode.ATLAS && deploymentRegion === DeploymentRegion.TWO) {
      return scenarios.filter(scenario => 
        [ScenarioType.BASIC_DR, ScenarioType.ENHANCED_DR, ScenarioType.ENHANCED_2_STEP, 
         /* ScenarioType.HOT_STANDBY, */ ScenarioType.COLD_STANDBY].includes(scenario.id)
      );
    }
    
    if (deploymentMode === DeploymentMode.ATLAS && deploymentRegion === DeploymentRegion.THREE) {
      return scenarios.filter(scenario => 
        [ScenarioType.MULTI_DC].includes(scenario.id)
      );
    }
    
    if (deploymentMode === DeploymentMode.ENTERPRISE && deploymentRegion === DeploymentRegion.TWO) {
      return scenarios.filter(scenario => 
        [ScenarioType.BASIC_DR, ScenarioType.ENHANCED_DR, 
         /* ScenarioType.HOT_STANDBY, */ ScenarioType.COLD_STANDBY].includes(scenario.id)
      );
    }
    
    if (deploymentMode === DeploymentMode.ENTERPRISE && deploymentRegion === DeploymentRegion.THREE) {
      return scenarios.filter(scenario => 
        [ScenarioType.MULTI_DC].includes(scenario.id)
      );
    }
    
    // Default: show no scenarios for invalid combinations
    return [];
  };

  const visibleScenarios = getVisibleScenarios();

  const getTabClasses = (scenarioId: ScenarioType, color: string) => {
    const isActive = currentScenario === scenarioId;
    
    if (isActive) {
      switch (color) {
        case 'blue':
          return 'bg-blue-100 border-blue-500 text-blue-700';
        case 'green':
          return 'bg-white border-green-800 text-green-800 ring-2 ring-green-700 ring-opacity-50';
        case 'purple':
          return 'bg-purple-100 border-purple-500 text-purple-700';
        case 'yellow':
          return 'bg-yellow-100 border-yellow-500 text-yellow-700';
        case 'red':
          return 'bg-red-100 border-red-500 text-red-700';
        case 'orange':
          return 'bg-orange-100 border-orange-500 text-orange-700';
        default:
          return 'bg-gray-100 border-gray-500 text-gray-700';
      }
    }
    
    return 'bg-white border-green-700 text-gray-700 hover:bg-white hover:text-green-800 hover:border-green-800';
  };

  const getIconClasses = (scenarioId: ScenarioType, color: string) => {
    const isActive = currentScenario === scenarioId;
    
    if (isActive) {
      switch (color) {
        case 'blue':
          return 'text-blue-600';
        case 'green':
          return 'text-green-800';
        case 'purple':
          return 'text-purple-600';
        case 'yellow':
          return 'text-yellow-600';
        case 'red':
          return 'text-red-600';
        case 'orange':
          return 'text-orange-600';
        default:
          return 'text-gray-600';
      }
    }
    
    return 'text-green-700';
  };

  return (
    <div className="bg-white rounded-lg shadow-md border-2 border-green-700">
      <div className="bg-white px-6 py-4 border-b-2 border-green-700 rounded-t-lg">
        <h2 className="text-xl font-bold text-gray-900">
          MongoDB Replica Set DR Simulator
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Select a scenario to explore different disaster recovery architectures
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleScenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => onScenarioChange(scenario.id)}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200 text-left
                focus:outline-none focus:ring-1 focus:ring-green-500 focus:ring-opacity-30
                ${getTabClasses(scenario.id, scenario.color)}
              `}
            >
              <div className="flex items-center space-x-3 mb-2">
                <div className={getIconClasses(scenario.id, scenario.color)}>
                  {scenario.icon}
                </div>
                <h3 className="font-semibold text-lg">
                  {scenario.name}
                </h3>
              </div>
              
              <p className="text-sm opacity-80 mb-3">
                {scenario.description}
              </p>

              {currentScenario === scenario.id && (
                <div className="flex items-center space-x-1 text-xs font-medium">
                  <div className="w-2 h-2 bg-current rounded-full"></div>
                  <span>Active</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScenarioTabs;
