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
  electNewPrimary,
  createLogEvent,
  getFailureActions,
  getRecoveryActions,
  reconfigureStandalone,
  addNewNodesToDR,
  grantVotingRights,
} from '@/utils/simulation';

import ScenarioTabs from './ScenarioTabs';
import ArchitectureDiagram from './ArchitectureDiagram';
import ControlPanel from './ControlPanel';
import EventLog from './EventLog';

const SimulatorWrapper: React.FC = () => {
  const [simulationState, setSimulationState] = useState<SimulationState>(() => {
    const initialScenario = ScenarioType.BASIC_DR;
    const scenario = scenarios[initialScenario];
    
    return {
      currentScenario: initialScenario,
      phase: SimulationPhase.INITIAL,
      nodes: [...scenario.nodes],
      logs: [
        createLogEvent(
          EventType.INITIALIZATION,
          `Initialized ${scenario.name} scenario`,
          scenario.description
        ),
      ],
      availableActions: [],
      clusterStatus: calculateClusterStatus(scenario.nodes),
    };
  });

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
    const clusterStatus = calculateClusterStatus(initialNodes);
    
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
    });
  }, [updateAvailableActions]);

  // Handle failure actions
  const handleFailureAction = useCallback((regionId: string) => {
    setSimulationState(prevState => {
      const scenario = scenarios[prevState.currentScenario];
      const region = scenario.regions.find(r => r.id === regionId);
      if (!region) return prevState;

      // Fail the region
      const updatedNodes = failRegion(prevState.nodes, regionId);
      const clusterStatus = calculateClusterStatus(updatedNodes);
      
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

      const finalClusterStatus = calculateClusterStatus(finalNodes);
      const newPhase = finalClusterStatus.isOperational 
        ? SimulationPhase.INITIAL 
        : SimulationPhase.FAILURE_OCCURRED;

      return {
        ...prevState,
        phase: newPhase,
        nodes: finalNodes,
        logs: newLogs,
        clusterStatus: finalClusterStatus,
        availableActions: updateAvailableActions(newPhase, prevState.currentScenario, finalNodes),
      };
    });
  }, [updateAvailableActions]);

  // Handle recovery actions
  const handleRecoveryAction = useCallback((
    action: typeof reconfigureStandalone | typeof addNewNodesToDR | typeof grantVotingRights,
    actionId: string
  ) => {
    setSimulationState(prevState => {
      const result = action(prevState.nodes);
      const clusterStatus = calculateClusterStatus(result.updatedNodes);
      
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

  // Handle reset
  const handleReset = useCallback(() => {
    setSimulationState(prevState => {
      const scenario = scenarios[prevState.currentScenario];
      const initialNodes = [...scenario.nodes];
      const clusterStatus = calculateClusterStatus(initialNodes);
      
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
            />
          </div>

          {/* Control Panel */}
          <div className="xl:col-span-1">
            <ControlPanel
              availableActions={simulationState.availableActions}
              clusterStatus={simulationState.clusterStatus}
            />
          </div>
        </div>

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
