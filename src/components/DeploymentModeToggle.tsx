import React from 'react';
import { DeploymentMode } from '@/types';
import { Cloud, Server } from 'lucide-react';

interface DeploymentModeToggleProps {
  currentMode: DeploymentMode;
  onModeChange: (mode: DeploymentMode) => void;
}

const DeploymentModeToggle: React.FC<DeploymentModeToggleProps> = ({
  currentMode,
  onModeChange,
}) => {
  return (
    <div className="flex items-center space-x-3 bg-white rounded-lg shadow-md border-2 border-green-700 p-2">
      <span className="text-sm font-medium text-gray-700">Mode:</span>
      
      {/* Toggle Switch */}
      <div className="relative inline-flex">
        <div className="flex bg-white border border-green-600 rounded-lg p-1">
          {/* Atlas Option */}
          <button
            onClick={() => onModeChange(DeploymentMode.ATLAS)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${
                currentMode === DeploymentMode.ATLAS
                  ? 'bg-green-700 text-white shadow-md'
                  : 'text-green-700 hover:text-green-800'
              }
            `}
          >
            <Cloud className="w-4 h-4" />
            <span>Atlas</span>
          </button>
          
          {/* Enterprise Option */}
          <button
            onClick={() => onModeChange(DeploymentMode.ENTERPRISE)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${
                currentMode === DeploymentMode.ENTERPRISE
                  ? 'bg-green-700 text-white shadow-md'
                  : 'text-green-700 hover:text-green-800'
              }
            `}
          >
            <Server className="w-4 h-4" />
            <span>Enterprise</span>
          </button>
        </div>
      </div>
      
      {/* Mode Description */}
      <div className="text-xs text-gray-500">
        {currentMode === DeploymentMode.ATLAS ? (
          <span>Cloud-managed MongoDB</span>
        ) : (
          <span>Licensed MongoDB</span>
        )}
      </div>
    </div>
  );
};

export default DeploymentModeToggle;
