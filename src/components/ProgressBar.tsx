import React from 'react';
import { Loader2, CheckCircle } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  label: string;
  description?: string;
  isComplete?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  description,
  isComplete = false,
}) => {
  const getProgressColor = () => {
    if (isComplete) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getProgressText = () => {
    if (isComplete) return 'Complete';
    return `${progress}%`;
  };

  return (
    <div className="w-full p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center space-x-3 mb-3">
        {isComplete ? (
          <CheckCircle className="w-6 h-6 text-green-500" />
        ) : (
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        )}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{label}</h4>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
        <span className={`text-sm font-medium ${isComplete ? 'text-green-600' : 'text-blue-600'}`}>
          {getProgressText()}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-500 ease-out ${getProgressColor()}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        >
          <div className="h-full bg-white bg-opacity-30 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>Starting</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>Complete</span>
      </div>
    </div>
  );
};

export default ProgressBar;
