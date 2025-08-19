'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  SimulationState, 
  SimulationPhase,
  ScenarioType,
  MongoNode,
  LogEvent,
  ActionButton,
  EventType,
  NodeStatus,
  NodeRole,
} from '@/types';
import { scenarios } from '@/utils/scenarios';
import { 
  calculateClusterStatus,
  failRegion,
  failRegionWithBackup,
  electNewPrimary,
  createLogEvent,
  getFailureActions,
  getRecoveryActions,
  reconfigureStandalone,
  addNewNodesToDR,
  grantVotingRights,
  grantVotingRightsStep1,
  addNewNodeStep2,
  repointApplicationToDR,
  restoreFromBackup,
  progressBackupRestore,
} from '@/utils/simulation';

import ScenarioTabs from './ScenarioTabs';
import ArchitectureDiagram from './ArchitectureDiagram';
import ControlPanel from './ControlPanel';
import EventLog from './EventLog';
import RecoveryInfo from './RecoveryInfo';
import ProgressBar from './ProgressBar';

const SimulatorWrapper: React.FC = () => {
  const [simulationState, setSimulationState] = useState<SimulationState>(() => {
    const initialScenario = ScenarioType.BASIC_DR;
    const scenario = scenarios[initialScenario];
    
    return {
      currentScenario: initialScenario,
      phase: SimulationPhase.INITIAL,
      nodes: [...scenario.nodes],
      logs: [], // Start with empty logs to prevent hydration mismatch
      availableActions: [],
      clusterStatus: calculateClusterStatus(scenario.nodes, initialScenario),
    };
  });

  // Add initial log event after component mounts (client-side only) to prevent hydration mismatch
  useEffect(() => {
    const currentScenario = scenarios[simulationState.currentScenario];
    setSimulationState(prevState => ({
      ...prevState,
      logs: prevState.logs.length === 0 ? [
        createLogEvent(
          EventType.INITIALIZATION,
          `Initialized ${currentScenario.name} scenario`,
          currentScenario.description
        ),
      ] : prevState.logs,
    }));
  }, []); // Only run once on mount

  // Update available actions based on current state
  const updateAvailableActions = useCallback((
    phase: SimulationPhase,
    scenario: ScenarioType,
    nodes: MongoNode[]
  ): ActionButton[] => {
    const actions: ActionButton[] = [];

    if (phase === SimulationPhase.INITIAL) {
      // Add failure actions
      const failureActions = getFailureActions(scenario);
      failureActions.forEach(action => {
        actions.push({
          id: action.id,
          label: action.label,
          action: () => handleFailureAction(action.regionId),
          variant: 'danger',
        });
      });

      // Add reset action
      actions.push({
        id: 'reset',
        label: 'Reset Simulation',
        action: handleReset,
        variant: 'secondary',
      });
    } else if (phase === SimulationPhase.FAILURE_OCCURRED) {
      // Add recovery actions
      const recoveryActions = getRecoveryActions(scenario, nodes);
      recoveryActions.forEach(action => {
        actions.push({
          id: action.id,
          label: action.label,
          action: () => handleRecoveryAction(action.action, action.id),
          variant: 'warning',
        });
      });

      // Add reset action
      actions.push({
        id: 'reset',
        label: 'Reset Simulation',
        action: handleReset,
        variant: 'secondary',
      });
    } else if (phase === SimulationPhase.STEP_1_COMPLETE) {
      // Add Step 2 recovery actions for Enhanced 2-Step scenario
      const recoveryActions = getRecoveryActions(scenario, nodes);
      recoveryActions.forEach(action => {
        actions.push({
          id: action.id,
          label: action.label,
          action: () => handleRecoveryAction(action.action, action.id),
          variant: 'warning',
        });
      });

      // Add reset action
      actions.push({
        id: 'reset',
        label: 'Reset Simulation',
        action: handleReset,
        variant: 'secondary',
      });
    } else if (phase === SimulationPhase.RECOVERED) {
      actions.push({
        id: 'reset',
        label: 'Reset Simulation',
        action: handleReset,
        variant: 'success',
      });
    }

    return actions;
  }, []);

  // Handle scenario change
  const handleScenarioChange = useCallback((newScenario: ScenarioType) => {
    const scenario = scenarios[newScenario];
    const initialNodes = [...scenario.nodes];
    const clusterStatus = calculateClusterStatus(initialNodes, newScenario);
    
    setSimulationState({
      currentScenario: newScenario,
      phase: SimulationPhase.INITIAL,
      nodes: initialNodes,
      logs: [
        createLogEvent(
          EventType.INITIALIZATION,
          `Switched to ${scenario.name} scenario`,
          scenario.description
        ),
      ],
      availableActions: updateAvailableActions(SimulationPhase.INITIAL, newScenario, initialNodes),
      clusterStatus,
      progressPercent: undefined, // Clear any progress
      recoveryStep: undefined, // Clear any recovery steps
      regions: undefined, // Clear any dynamic regions
    });
  }, [updateAvailableActions]);

  // Handle failure actions
  const handleFailureAction = useCallback((regionId: string) => {
    setSimulationState(prevState => {
      const scenario = scenarios[prevState.currentScenario];
      const region = scenario.regions.find(r => r.id === regionId);
      if (!region) return prevState;

      let updatedNodes;
      let updatedRegions = prevState.regions;

      // For Cold Standby, fail both cluster and associated backup storage
      if (prevState.currentScenario === ScenarioType.COLD_STANDBY) {
        const allRegions = prevState.regions || scenario.regions;
        const result = failRegionWithBackup(prevState.nodes, allRegions, regionId);
        updatedNodes = result.updatedNodes;
        updatedRegions = result.updatedRegions;
      } else {
        // For other scenarios, use regular failRegion
        updatedNodes = failRegion(prevState.nodes, regionId);
      }

      const clusterStatus = calculateClusterStatus(updatedNodes, prevState.currentScenario);
      
      // Create log events
      const newLogs = [
        ...prevState.logs,
        createLogEvent(
          EventType.FAILURE,
          `Failed ${region.name}`,
          `All nodes in ${region.name} are now offline`
        ),
      ];

      // Check for automatic election (Multi-DC scenario)
      let finalNodes = updatedNodes;
      if (prevState.currentScenario === ScenarioType.MULTI_DC && regionId === 'primary-dc1') {
        finalNodes = electNewPrimary(updatedNodes);
        const newPrimary = finalNodes.find(node => node.role === NodeRole.PRIMARY);
        if (newPrimary) {
          newLogs.push(
            createLogEvent(
              EventType.ELECTION,
              'Automatic failover completed',
              `${newPrimary.name} elected as new Primary`
            ),
            createLogEvent(
              EventType.SUCCESS,
              'Cluster remains operational',
              'Remaining nodes in DC2 and DR maintain quorum'
            )
          );
        }
      } else {
        // Add status information
        if (!clusterStatus.hasQuorum) {
          newLogs.push(
            createLogEvent(
              EventType.QUORUM,
              'Quorum lost - cluster is read-only',
              'Manual intervention required to restore write capability'
            )
          );
        } else if (!clusterStatus.isOperational) {
          newLogs.push(
            createLogEvent(
              EventType.WARNING,
              'Cluster is degraded but operational',
              'Consider recovery actions to improve resilience'
            )
          );
        }
      }

      const finalClusterStatus = calculateClusterStatus(finalNodes, prevState.currentScenario);
      
      // Check if recovery actions are available regardless of cluster operational status
      const recoveryActions = getRecoveryActions(prevState.currentScenario, finalNodes);
      const hasRecoveryActions = recoveryActions.length > 0;
      
      // For scenarios like Hot Standby and Enhanced 2-Step, we may need to show recovery actions 
      // even when the cluster is operational
      const newPhase = hasRecoveryActions 
        ? SimulationPhase.FAILURE_OCCURRED
        : finalClusterStatus.isOperational 
          ? SimulationPhase.INITIAL 
          : SimulationPhase.FAILURE_OCCURRED;

      return {
        ...prevState,
        phase: newPhase,
        nodes: finalNodes,
        regions: updatedRegions,
        logs: newLogs,
        clusterStatus: finalClusterStatus,
        availableActions: updateAvailableActions(newPhase, prevState.currentScenario, finalNodes),
      };
    });
  }, [updateAvailableActions]);

  // Handle recovery actions
  const handleRecoveryAction = useCallback((
    action: any,
    actionId: string
  ) => {
    // Handle Cold Standby restoration as a special case
    if (actionId === 'restore-from-backup') {
      setSimulationState(prevState => {
        const result = restoreFromBackup(prevState.nodes);
        
        // Start the restoration process
        setTimeout(() => startRestoreProgress(), 500);
        
        return {
          ...prevState,
          phase: SimulationPhase.RESTORING,
          logs: [...prevState.logs, ...result.logEvents],
          progressPercent: 0,
          availableActions: [], // No actions available during restoration
        };
      });
      return;
    }

    // Handle multi-step recovery for Enhanced 2-Step scenario
    if (actionId === 'grant-voting-rights-step1') {
      setSimulationState(prevState => {
        const result = grantVotingRightsStep1(prevState.nodes);
        const clusterStatus = calculateClusterStatus(result.updatedNodes, prevState.currentScenario);
        
        return {
          ...prevState,
          phase: SimulationPhase.STEP_1_COMPLETE,
          nodes: result.updatedNodes,
          logs: [...prevState.logs, ...result.logEvents],
          clusterStatus,
          recoveryStep: 1,
          availableActions: updateAvailableActions(SimulationPhase.STEP_1_COMPLETE, prevState.currentScenario, result.updatedNodes),
        };
      });
      return;
    }

    if (actionId === 'add-new-node-step2') {
      setSimulationState(prevState => {
        const result = addNewNodeStep2(prevState.nodes);
        const clusterStatus = calculateClusterStatus(result.updatedNodes, prevState.currentScenario);
        
        return {
          ...prevState,
          phase: SimulationPhase.RECOVERED,
          nodes: result.updatedNodes,
          logs: [...prevState.logs, ...result.logEvents],
          clusterStatus,
          recoveryStep: 2,
          availableActions: updateAvailableActions(SimulationPhase.RECOVERED, prevState.currentScenario, result.updatedNodes),
        };
      });
      return;
    }

    // Handle Hot Standby repoint action
    if (actionId === 'repoint-application') {
      setSimulationState(prevState => {
        const result = repointApplicationToDR(prevState.nodes);
        const clusterStatus = calculateClusterStatus(result.updatedNodes, prevState.currentScenario);
        
        return {
          ...prevState,
          phase: SimulationPhase.RECOVERED,
          nodes: result.updatedNodes,
          logs: [...prevState.logs, ...result.logEvents],
          clusterStatus,
          availableActions: updateAvailableActions(SimulationPhase.RECOVERED, prevState.currentScenario, result.updatedNodes),
        };
      });
      return;
    }

    // Handle standard recovery actions
    setSimulationState(prevState => {
      const result = action(prevState.nodes);
      const clusterStatus = calculateClusterStatus(result.updatedNodes, prevState.currentScenario);
      
      const newLogs = [
        ...prevState.logs,
        ...result.logEvents,
      ];

      const newPhase = clusterStatus.isOperational 
        ? SimulationPhase.RECOVERED 
        : SimulationPhase.FAILURE_OCCURRED;

      return {
        ...prevState,
        phase: newPhase,
        nodes: result.updatedNodes,
        logs: newLogs,
        clusterStatus,
        availableActions: updateAvailableActions(newPhase, prevState.currentScenario, result.updatedNodes),
      };
    });
  }, [updateAvailableActions]);

  // Start restore progress for Cold Standby
  const startRestoreProgress = useCallback(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      
      setSimulationState(prevState => {
        const result = progressBackupRestore(prevState.nodes, progress);
        const clusterStatus = calculateClusterStatus(result.updatedNodes, prevState.currentScenario);
        
        if (progress >= 100 && prevState.phase !== SimulationPhase.RECOVERED) {
          clearInterval(interval);
          
          // Add the new restored cluster region for Cold Standby (only if it doesn't exist)
          const newRestoredRegion = {
            id: 'dr-cluster-restored',
            name: 'DR Restored Cluster (Region-B)',
            type: 'cluster' as const,
            clusterState: 'active' as const,
            nodes: ['restored-primary', 'restored-secondary1', 'restored-secondary2'],
          };
          
          // Check if the restored region already exists to prevent duplicates
          const existingRegions = prevState.regions || [];
          const regionExists = existingRegions.some(region => region.id === 'dr-cluster-restored');
          
          const updatedRegions = regionExists 
            ? existingRegions
            : [...existingRegions, newRestoredRegion];
          
          return {
            ...prevState,
            phase: SimulationPhase.RECOVERED,
            nodes: result.updatedNodes,
            logs: [...prevState.logs, ...result.logEvents],
            clusterStatus,
            progressPercent: 100,
            regions: updatedRegions,
            availableActions: updateAvailableActions(SimulationPhase.RECOVERED, prevState.currentScenario, result.updatedNodes),
          };
        }
        
        return {
          ...prevState,
          logs: [...prevState.logs, ...result.logEvents],
          progressPercent: progress,
        };
      });
    }, 2000); // Update every 2 seconds
  }, [updateAvailableActions]);

  // Handle reset
  const handleReset = useCallback(() => {
    setSimulationState(prevState => {
      const scenario = scenarios[prevState.currentScenario];
      const initialNodes = [...scenario.nodes];
      const clusterStatus = calculateClusterStatus(initialNodes, prevState.currentScenario);
      
      return {
        currentScenario: prevState.currentScenario, // Keep the same scenario
        phase: SimulationPhase.INITIAL,
        nodes: initialNodes,
        logs: [
          createLogEvent(
            EventType.INITIALIZATION,
            `Reset ${scenario.name} scenario`,
            scenario.description
          ),
        ],
        availableActions: updateAvailableActions(SimulationPhase.INITIAL, prevState.currentScenario, initialNodes),
        clusterStatus,
        progressPercent: undefined, // Clear any progress
        recoveryStep: undefined, // Clear any recovery steps
        regions: undefined, // Clear any dynamic regions
      };
    });
  }, [updateAvailableActions]);

  // Update available actions when state changes
  useEffect(() => {
    setSimulationState(prevState => ({
      ...prevState,
      availableActions: updateAvailableActions(
        prevState.phase,
        prevState.currentScenario,
        prevState.nodes
      ),
    }));
  }, [updateAvailableActions]);

  const currentScenario = scenarios[simulationState.currentScenario];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Scenario Selection */}
        <ScenarioTabs
          currentScenario={simulationState.currentScenario}
          onScenarioChange={handleScenarioChange}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Architecture Diagram - Takes up 2 columns on xl screens */}
          <div className="xl:col-span-2">
            <ArchitectureDiagram
              scenario={currentScenario}
              nodes={simulationState.nodes}
              dynamicRegions={simulationState.regions}
            />
            
            {/* Progress Bar for Cold Standby restoration */}
            {simulationState.phase === SimulationPhase.RESTORING && simulationState.progressPercent !== undefined && (
              <div className="mt-4">
                <ProgressBar
                  progress={simulationState.progressPercent}
                  label="Restoring cluster from backup..."
                />
              </div>
            )}
          </div>

          {/* Control Panel */}
          <div className="xl:col-span-1">
            <ControlPanel
              availableActions={simulationState.availableActions}
              clusterStatus={simulationState.clusterStatus}
              nodes={simulationState.nodes}
            />
          </div>
        </div>

        {/* Recovery Approach Analysis */}
        <RecoveryInfo
          scenario={simulationState.currentScenario}
          phase={simulationState.phase}
          recoveryStep={simulationState.recoveryStep}
        />

        {/* Event Log - Full width */}
        <EventLog
          events={simulationState.logs}
          maxHeight="max-h-80"
        />
      </div>
    </div>
  );
};

export default SimulatorWrapper;
