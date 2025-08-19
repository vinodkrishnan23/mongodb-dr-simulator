import React from 'react';
import { Database, Shield, Globe, GitBranch, RefreshCw, HardDrive } from 'lucide-react';
import { ScenarioTabsProps, ScenarioType } from '@/types';

const ScenarioTabs: React.FC<ScenarioTabsProps> = ({ 
  currentScenario, 
  onScenarioChange 
}) => {
  const scenarios = [
    {
      id: ScenarioType.BASIC_DR,
      name: 'Basic DR',
      description: '3 Nodes: 2 DC + 1 DR',
      icon: <Database className="w-5 h-5" />,
      color: 'blue',
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
      color: 'purple',
    },
    {
      id: ScenarioType.ENHANCED_2_STEP,
      name: '2-Step Recovery',
      description: '4 Nodes: 2 DC + 2 DR (1 Read-Only)',
      icon: <GitBranch className="w-5 h-5" />,
      color: 'yellow',
    },
    {
      id: ScenarioType.HOT_STANDBY,
      name: 'Hot Standby',
      description: '6 Nodes: 2 Independent Clusters + Sync',
      icon: <RefreshCw className="w-5 h-5" />,
      color: 'red',
    },
    {
      id: ScenarioType.COLD_STANDBY,
      name: 'Cold Standby',
      description: '3 Nodes: DC Cluster + Backup',
      icon: <HardDrive className="w-5 h-5" />,
      color: 'orange',
    },
  ];

  const getTabClasses = (scenarioId: ScenarioType, color: string) => {
    const isActive = currentScenario === scenarioId;
    
    if (isActive) {
      switch (color) {
        case 'blue':
          return 'bg-blue-100 border-blue-500 text-blue-700';
        case 'green':
          return 'bg-green-100 border-green-500 text-green-700';
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
    
    return 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400';
  };

  const getIconClasses = (scenarioId: ScenarioType, color: string) => {
    const isActive = currentScenario === scenarioId;
    
    if (isActive) {
      switch (color) {
        case 'blue':
          return 'text-blue-600';
        case 'green':
          return 'text-green-600';
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
    
    return 'text-gray-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
        <h2 className="text-xl font-bold text-gray-900">
          MongoDB Replica Set DR Simulator
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Select a scenario to explore different disaster recovery architectures
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => onScenarioChange(scenario.id)}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200 text-left
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
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

        {/* Scenario Benefits */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">
            What you'll learn:
          </h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>How MongoDB replica sets handle different types of failures</li>
            <li>Manual disaster recovery procedures and their trade-offs</li>
            <li>The importance of quorum in distributed database systems</li>
            <li>How voting rights and node roles affect cluster resilience</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ScenarioTabs;
