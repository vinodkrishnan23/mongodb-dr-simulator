import React from 'react';
import { DeploymentRegion } from '@/types';
import { MapPin } from 'lucide-react';

interface DeploymentRegionFilterProps {
  currentRegion: DeploymentRegion;
  onRegionChange: (region: DeploymentRegion) => void;
}

const DeploymentRegionFilter: React.FC<DeploymentRegionFilterProps> = ({
  currentRegion,
  onRegionChange,
}) => {
  const regions = [
    { value: DeploymentRegion.ONE, label: '1', description: 'Single region' },
    { value: DeploymentRegion.TWO, label: '2', description: 'Two regions' },
    { value: DeploymentRegion.THREE, label: '3', description: 'Three regions' },
  ];

  return (
    <div className="flex items-center space-x-3 bg-white rounded-lg shadow-md border-2 border-green-700 p-2">
      <div className="flex items-center space-x-2">
        <MapPin className="w-4 h-4 text-green-700" />
        <span className="text-sm font-medium text-gray-700">Regions:</span>
      </div>
      
      {/* Region Buttons */}
      <div className="flex bg-white border border-green-600 rounded-lg p-1 space-x-1">
        {regions.map((region) => (
          <button
            key={region.value}
            onClick={() => onRegionChange(region.value)}
            className={`
              px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${
                currentRegion === region.value
                  ? 'bg-green-700 text-white shadow-md'
                  : 'text-green-700 hover:text-green-800 hover:bg-green-50'
              }
            `}
            title={region.description}
          >
            {region.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DeploymentRegionFilter;
