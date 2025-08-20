import React from 'react';
import { Info, CheckCircle, AlertTriangle, Clock, DollarSign, Shield } from 'lucide-react';
import { ScenarioType, SimulationPhase } from '@/types';

interface RecoveryInfoProps {
  scenario: ScenarioType;
  phase: SimulationPhase;
  recoveryStep?: number;
}

interface RecoveryApproach {
  name: string;
  pros: string[];
  cons: string[];
  rto: string; // Recovery Time Objective
  rpo: string; // Recovery Point Objective
  cost: 'Low' | 'Medium' | 'High';
  complexity: 'Low' | 'Medium' | 'High';
}

const RecoveryInfo: React.FC<RecoveryInfoProps> = ({ scenario, phase, recoveryStep }) => {
  // Don't show for Single Region No DR scenario - it has no DR capabilities
  if (scenario === ScenarioType.SINGLE_REGION_NO_DR) {
    return null;
  }

  // Only show after recovery actions have been taken
  if (phase !== SimulationPhase.RECOVERED && 
      phase !== SimulationPhase.STEP_1_COMPLETE && 
      phase !== SimulationPhase.RESTORING) {
    return null;
  }

  const getRecoveryApproach = (): RecoveryApproach | null => {
    switch (scenario) {
      case ScenarioType.BASIC_DR:
        return {
          name: 'Basic DR with Manual Recovery',
          pros: [
            'Simple architecture with minimal infrastructure',
            'Lower ongoing operational costs'
          ],
          cons: [
            'Manual intervention required during disasters',
            'No automatic failover capabilities',
            'Single point of failure during normal operations',
            'Risk of human error during recovery procedures'
          ],
          rto: '15-60 minutes',
          rpo: '0-5 minutes',
          cost: 'Low',
          complexity: 'Medium'
        };

      case ScenarioType.ENHANCED_DR:
        return {
          name: 'Enhanced DR with Voting Rights Management',
          pros: [
            'More nodes available for disaster scenarios',
            'Read-only nodes provide better read scaling during normal ops',
            'Flexible voting rights reconfiguration',
            'Better resource utilization with read-only secondaries'
          ],
          cons: [
            'Higher infrastructure costs with more nodes',
            'Manual voting rights changes required during disasters',
            //'More complex configuration management',
            //'Potential for configuration drift between environments'
          ],
          rto: '10-30 minutes',
          rpo: '0-2 minutes',
          cost: 'Medium',
          complexity: 'Medium'
        };

      case ScenarioType.MULTI_DC:
        return {
          name: 'Multi-Datacenter High Availability',
          pros: [
            'Automatic failover with no manual intervention',
            'Geographic distribution provides better resilience',
            'Continuous availability during single datacenter failures',
            'Built-in load balancing across datacenters'
          ],
          cons: [
            'Highest infrastructure and network costs',
            'Complexity in network latency and data consistency',
            'Requires sophisticated monitoring and alerting',
            'Potential for split-brain scenarios in network partitions'
          ],
          rto: '30 seconds - 5 minutes',
          rpo: '0-1 minutes',
          cost: 'High',
          complexity: 'High'
        };

      case ScenarioType.ENHANCED_2_STEP:
        return {
          name: recoveryStep === 1 ? '2-Step Recovery (Step 1)' : '2-Step Recovery (Complete)',
          pros: [
            'Gradual recovery process allows for careful validation',
            'Flexibility to pause between steps for assessment',
            'Lower risk of configuration errors with staged approach',
            'Good balance between automation and control'
          ],
          cons: [
            'Longer total recovery time due to manual steps',
            'Requires operator knowledge of multi-step procedures',
            'Risk of incomplete recovery if steps are skipped',
            'More complex runbook documentation required'
          ],
          rto: recoveryStep === 1 ? '15-45 minutes (Partial)' : '20-60 minutes (Complete)',
          rpo: '0-3 minutes',
          cost: 'Medium',
          complexity: 'High'
        };

      case ScenarioType.HOT_STANDBY:
        return {
          name: 'Hot Standby with Cluster-to-Cluster Sync',
          pros: [
            'Very fast failover with minimal data loss',
            'Complete cluster isolation prevents cascading failures',
            'Independent scaling of primary and standby clusters',
            'Excellent for mission-critical applications'
          ],
          cons: [
            'Highest resource costs with duplicate infrastructure',
            'Complex cluster-to-cluster synchronization',
            'Potential for sync lag during high write volumes',
            'Requires sophisticated change data capture mechanisms'
          ],
          rto: '1-10 minutes',
          rpo: '0-30 seconds',
          cost: 'High',
          complexity: 'High'
        };

      case ScenarioType.COLD_STANDBY:
        return {
          name: 'Cold Standby with Backup and Restore',
          pros: [
            'Lowest ongoing operational costs',
            'Simple backup-based approach',
            'Works well for applications with longer acceptable downtime',
            'Easy to implement and understand'
          ],
          cons: [
            'Longest recovery time objective (RTO)',
            'Potential for significant data loss (RPO)',
            'Manual restoration process prone to errors',
            'No real-time failover capabilities',
            'Requires regular backup validation testing'
          ],
          rto: '2-8 hours',
          rpo: '1-24 hours',
          cost: 'Low',
          complexity: 'Low'
        };

      default:
        return null;
    }
  };

  const approach = getRecoveryApproach();
  
  if (!approach) return null;

  const getCostColor = (cost: string) => {
    switch (cost) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Info className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Recovery Approach Analysis: {approach.name}
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pros */}
        <div className="space-y-3">
          <h4 className="flex items-center space-x-2 font-medium text-green-800">
            <CheckCircle className="w-4 h-4" />
            <span>Advantages</span>
          </h4>
          <ul className="space-y-2">
            {approach.pros.map((pro, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cons */}
        <div className="space-y-3">
          <h4 className="flex items-center space-x-2 font-medium text-red-800">
            <AlertTriangle className="w-4 h-4" />
            <span>Disadvantages</span>
          </h4>
          <ul className="space-y-2">
            {approach.cons.map((con, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Key Metrics</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {/*<div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-600" />
            /*<div>
              <span className="text-gray-600">RTO:</span>
              <p className="font-medium">{approach.rto}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <div>
              <span className="text-gray-600">RPO:</span>
              <p className="font-medium">{approach.rpo}</p>
            </div>
          </div>*/}
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <div>
              <span className="text-gray-600">Cost:</span>
              <p className={`font-medium px-2 py-1 rounded-full text-xs ${getCostColor(approach.cost)}`}>
                {approach.cost}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-blue-600" />
            <div>
              <span className="text-gray-600">Complexity:</span>
              <p className={`font-medium px-2 py-1 rounded-full text-xs ${getComplexityColor(approach.complexity)}`}>
                {approach.complexity}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecoveryInfo;
