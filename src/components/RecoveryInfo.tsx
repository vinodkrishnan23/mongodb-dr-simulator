import React from 'react';
import { ScenarioType, SimulationPhase } from '@/types';

interface RecoveryInfoProps {
  scenario: ScenarioType;
  phase: SimulationPhase;
  recoveryStep?: number;
  recoveryAction?: string;
}

const RecoveryInfo: React.FC<RecoveryInfoProps> = ({ scenario, phase, recoveryStep, recoveryAction }) => {
  // Recovery Approach Analysis is disabled for all scenarios
  return null;
};

export default RecoveryInfo;