'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  DeploymentMode,
  DeploymentRegion,
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
  toggleNodeStatus,
  reconfigureStandalone,
  addNewNodesToDR,
  grantVotingRights,
  grantVotingRightsStep1,
  addNewNodeStep2,
  repointApplicationToDR,
  restoreFromBackup,
  progressBackupRestore,
  pointApplicationToRestoredCluster,
} from '@/utils/simulation';

import ScenarioTabs from './ScenarioTabs';
import ArchitectureDiagram from './ArchitectureDiagram';
import ControlPanel from './ControlPanel';
import EventLog from './EventLog';
import RecoveryInfo from './RecoveryInfo';
import ProgressBar from './ProgressBar';
import DeploymentModeToggle from './DeploymentModeToggle';
import DeploymentRegionFilter from './DeploymentRegionFilter';

const SimulatorWrapper: React.FC = () => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const architectureDiagramRef = useRef<HTMLDivElement>(null);
  const scenarioTabsRef = useRef<HTMLDivElement>(null);
  
  // Utility function to scroll to element
  const scrollToElement = useCallback((elementRef: React.RefObject<HTMLDivElement>, delay: number = 500) => {
    setTimeout(() => {
      elementRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, delay);
  }, []);
  
  // Utility function to scroll to top of element
  const scrollToElementTop = useCallback((elementRef: React.RefObject<HTMLDivElement>, delay: number = 500) => {
    setTimeout(() => {
      elementRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, delay);
  }, []);
  
  // Utility function to scroll to top of page
  const scrollToTop = useCallback((delay: number = 500) => {
    setTimeout(() => {
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    }, delay);
  }, []);
  
  const [simulationState, setSimulationState] = useState<SimulationState>(() => {
    const initialScenario = ScenarioType.BASIC_DR;
    const scenario = scenarios[initialScenario];
    
    return {
      currentScenario: initialScenario,
      deploymentMode: DeploymentMode.ATLAS, // Default to Atlas mode
      deploymentRegion: DeploymentRegion.TWO, // Default to 2 regions to show scenarios
      isScenarioSelected: false, // No scenario selected initially
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
    nodes: MongoNode[],
    deploymentMode?: DeploymentMode
  ): ActionButton[] => {
    const actions: ActionButton[] = [];

    if (phase === SimulationPhase.INITIAL) {
      // Add reset action - no failure actions needed as users click nodes directly
      actions.push({
        id: 'reset',
        label: 'Reset Simulation',
        action: handleReset,
        variant: 'secondary',
      });
    } else if (phase === SimulationPhase.FAILURE_OCCURRED) {
      // Add recovery actions
      const recoveryActions = getRecoveryActions(scenario, nodes, deploymentMode || simulationState.deploymentMode);
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
      const recoveryActions = getRecoveryActions(scenario, nodes, deploymentMode || simulationState.deploymentMode);
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
    } else if (phase === SimulationPhase.RESTORING) {
      // During restoration, only show reset action
      actions.push({
        id: 'reset',
        label: 'Reset Simulation',
        action: handleReset,
        variant: 'secondary',
      });
    }

    // Always ensure reset button is available as fallback
    if (!actions.some(action => action.id === 'reset')) {
      actions.push({
        id: 'reset',
        label: 'Reset Simulation',
        action: handleReset,
        variant: 'secondary',
      });
    }

    return actions;
  }, [simulationState.deploymentMode]);

  // Handle scenario change
  const handleScenarioChange = useCallback((newScenario: ScenarioType) => {
    const scenario = scenarios[newScenario];
    const initialNodes = [...scenario.nodes];
    const clusterStatus = calculateClusterStatus(initialNodes, newScenario);
    
    setSimulationState(prevState => ({
      currentScenario: newScenario,
      deploymentMode: prevState.deploymentMode, // Keep current deployment mode
      deploymentRegion: prevState.deploymentRegion, // Keep current deployment region
      isScenarioSelected: true, // Mark scenario as actively selected
      phase: SimulationPhase.INITIAL,
      nodes: initialNodes,
      logs: [
        createLogEvent(
          EventType.INITIALIZATION,
          `Switched to ${scenario.name} scenario`,
          scenario.description
        ),
      ],
      availableActions: updateAvailableActions(SimulationPhase.INITIAL, newScenario, initialNodes, simulationState.deploymentMode),
      clusterStatus,
      progressPercent: undefined, // Clear any progress
      recoveryStep: undefined, // Clear any recovery steps
      regions: undefined, // Clear any dynamic regions
      recoveryAction: undefined, // Clear recovery action tracking
    }));
  }, [updateAvailableActions]);

  // Handle deployment mode change
  const handleDeploymentModeChange = useCallback((newMode: DeploymentMode) => {
    setSimulationState(prevState => ({
      ...prevState,
      deploymentMode: newMode,
      isScenarioSelected: false, // Reset scenario selection when filters change
      logs: [
        ...prevState.logs,
        createLogEvent(
          EventType.INITIALIZATION,
          `Switched to ${newMode === DeploymentMode.ATLAS ? 'Atlas' : 'Enterprise'} mode`,
          `Now simulating ${newMode === DeploymentMode.ATLAS ? 'cloud-managed MongoDB Atlas' : 'self-managed MongoDB Enterprise'} disaster recovery scenarios`
        ),
      ],
    }));
  }, []);

  // Handle deployment region change
  const handleDeploymentRegionChange = useCallback((newRegion: DeploymentRegion) => {
    setSimulationState(prevState => ({
      ...prevState,
      deploymentRegion: newRegion,
      isScenarioSelected: false, // Reset scenario selection when filters change
      logs: [
        ...prevState.logs,
        createLogEvent(
          EventType.INITIALIZATION,
          `Switched to ${newRegion} region deployment`,
          `Now filtering scenarios for ${newRegion} region configurations`
        ),
      ],
    }));
  }, []);



  // Handle node click to toggle status
  const handleNodeClick = useCallback((nodeId: string) => {
    setSimulationState(prevState => {
      const { updatedNodes, logEvents } = toggleNodeStatus(prevState.nodes, nodeId, prevState.currentScenario, prevState.deploymentMode);
      
      // For Cold Standby, update backup storage regions based on DC cluster status
      let updatedRegions = prevState.regions;
      if (prevState.currentScenario === ScenarioType.COLD_STANDBY) {
        const dcNodes = updatedNodes.filter(node => node.region === 'dc-cluster');
        const allDCNodesDown = dcNodes.every(node => node.status === NodeStatus.DOWN);
        
        // Get original scenario regions or use existing regions
        const currentScenario = scenarios[prevState.currentScenario];
        const baseRegions = prevState.regions || currentScenario.regions;
        
        // Update backup storage regions based on DC cluster status
        updatedRegions = baseRegions.map(region => {
          if (region.id === 'dc-backup-storage') {
            return {
              ...region,
              clusterState: allDCNodesDown ? 'down' : 'active'
            };
          }
          if (region.id === 'dc-cluster') {
            return {
              ...region,
              clusterState: allDCNodesDown ? 'down' : 'active'
            };
          }
          return region;
        });
      }
      
      const clusterStatus = calculateClusterStatus(updatedNodes, prevState.currentScenario, updatedRegions);
      
      // Check if recovery actions are available
      const recoveryActions = getRecoveryActions(prevState.currentScenario, updatedNodes, prevState.deploymentMode);
      const hasRecoveryActions = recoveryActions.length > 0;
      
      // Determine the phase based on cluster status and available recovery actions
      const newPhase = hasRecoveryActions 
        ? SimulationPhase.FAILURE_OCCURRED
        : clusterStatus.isOperational 
          ? SimulationPhase.INITIAL 
          : SimulationPhase.FAILURE_OCCURRED;

      return {
        ...prevState,
        phase: newPhase,
        nodes: updatedNodes,
        regions: updatedRegions,
        logs: [...prevState.logs, ...logEvents],
        clusterStatus,
        availableActions: updateAvailableActions(newPhase, prevState.currentScenario, updatedNodes, prevState.deploymentMode),
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
        
        // Scroll to progress bar after a brief delay
        scrollToElement(progressBarRef, 1000);
        
        return {
          ...prevState,
          phase: SimulationPhase.RESTORING,
          logs: [...prevState.logs, ...result.logEvents],
          progressPercent: 0,
          availableActions: updateAvailableActions(SimulationPhase.RESTORING, prevState.currentScenario, result.updatedNodes, prevState.deploymentMode),
        };
      });
      return;
    }

    // Handle multi-step recovery for Enhanced 2-Step scenario
    if (actionId === 'grant-voting-rights-step1') {
      setSimulationState(prevState => {
        const result = grantVotingRightsStep1(prevState.nodes);
        const clusterStatus = calculateClusterStatus(result.updatedNodes, prevState.currentScenario, prevState.regions);
        
        return {
          ...prevState,
          phase: SimulationPhase.STEP_1_COMPLETE,
          nodes: result.updatedNodes,
          logs: [...prevState.logs, ...result.logEvents],
          clusterStatus,
          recoveryStep: 1,
          availableActions: updateAvailableActions(SimulationPhase.STEP_1_COMPLETE, prevState.currentScenario, result.updatedNodes, prevState.deploymentMode),
        };
      });
      return;
    }

    if (actionId === 'add-new-node-step2') {
      setSimulationState(prevState => {
        const result = addNewNodeStep2(prevState.nodes);
        const clusterStatus = calculateClusterStatus(result.updatedNodes, prevState.currentScenario, prevState.regions);
        
        return {
          ...prevState,
          phase: SimulationPhase.RECOVERED,
          nodes: result.updatedNodes,
          logs: [...prevState.logs, ...result.logEvents],
          clusterStatus,
          recoveryStep: 2,
          availableActions: updateAvailableActions(SimulationPhase.RECOVERED, prevState.currentScenario, result.updatedNodes, prevState.deploymentMode),
        };
      });
      return;
    }

    // Handle Hot Standby repoint action
    if (actionId === 'repoint-application') {
      setSimulationState(prevState => {
        const currentScenario = scenarios[prevState.currentScenario];
        const result = repointApplicationToDR(prevState.nodes, currentScenario.regions);
        const clusterStatus = calculateClusterStatus(result.updatedNodes, prevState.currentScenario, prevState.regions);
        
        return {
          ...prevState,
          phase: SimulationPhase.RECOVERED,
          nodes: result.updatedNodes,
          logs: [...prevState.logs, ...result.logEvents],
          clusterStatus,
          regions: result.updatedRegions, // Update regions with DR cluster marked as active
          availableActions: updateAvailableActions(SimulationPhase.RECOVERED, prevState.currentScenario, result.updatedNodes, prevState.deploymentMode),
        };
      });
      return;
    }

    // Handle Cold Standby point application action
    if (actionId === 'point-application-to-restored') {
      setSimulationState(prevState => {
        const result = pointApplicationToRestoredCluster(prevState.nodes);
        const clusterStatus = calculateClusterStatus(result.updatedNodes, prevState.currentScenario, prevState.regions);
        
        // Reorder regions to show DR regions first after pointing application
        let reorderedRegions = prevState.regions;
        if (prevState.regions) {
          // Mark restored cluster as visible to apps
          const updatedRegions = prevState.regions.map(region => {
            if (region.id === 'dr-cluster-restored') {
              return { ...region, visibleToApps: true };
            }
            return region;
          });
          
          const drRegions = updatedRegions.filter(region => 
            region.id === 'dr-cluster-restored' || region.id === 'dr-backup-storage'
          );
          const dcRegions = updatedRegions.filter(region => 
            region.id === 'dc-cluster' || region.id === 'dc-backup-storage'
          );
          reorderedRegions = [...drRegions, ...dcRegions];
        }
        
        // Scroll to top of scenario container (DR cluster will be at top)
        scrollToElementTop(scenarioTabsRef, 500);
        
        return {
          ...prevState,
          phase: SimulationPhase.RECOVERED,
          nodes: result.updatedNodes,
          regions: reorderedRegions,
          logs: [...prevState.logs, ...result.logEvents],
          clusterStatus,
          availableActions: updateAvailableActions(SimulationPhase.RECOVERED, prevState.currentScenario, result.updatedNodes, prevState.deploymentMode),
        };
      });
      return;
    }

    // Handle standard recovery actions
    setSimulationState(prevState => {
      const result = action(prevState.nodes);
      const clusterStatus = calculateClusterStatus(result.updatedNodes, prevState.currentScenario, prevState.regions);
      
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
        recoveryAction: actionId, // Track which recovery action was taken
        availableActions: updateAvailableActions(newPhase, prevState.currentScenario, result.updatedNodes, prevState.deploymentMode),
      };
    });
  }, [updateAvailableActions]);

  // Start restore progress for Cold Standby
  const startRestoreProgress = useCallback(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      
      setSimulationState(prevState => {
        // Don't process if we're already done
        if (prevState.phase === SimulationPhase.RECOVERED || prevState.progressPercent === 100) {
          clearInterval(interval);
          return prevState;
        }
        
        const result = progressBackupRestore(prevState.nodes, progress);
        const clusterStatus = calculateClusterStatus(result.updatedNodes, prevState.currentScenario, prevState.regions);
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // Add the new restored cluster region for Cold Standby
          const newRestoredRegion = {
            id: 'dr-cluster-restored',
            name: 'DR Restored Cluster (Region-B)',
            type: 'cluster' as const,
            clusterState: 'active' as const,
            visibleToApps: false, // Initially invisible to apps until repoint
            nodes: ['restored-primary', 'restored-secondary1', 'restored-secondary2'],
          };
          
          // Preserve current regions (which include failed DC state) instead of reverting to original
          const currentScenario = scenarios[prevState.currentScenario];
          const baseRegions = prevState.regions || currentScenario.regions;
          
          // Check if the restored region already exists to prevent duplicates
          const regionExists = baseRegions.some(region => region.id === 'dr-cluster-restored');
          
          // Preserve existing regions (including failed DC state) and add new restored region
          const updatedRegions = regionExists 
            ? baseRegions
            : [...baseRegions, newRestoredRegion];
          
          return {
            ...prevState,
            phase: SimulationPhase.FAILURE_OCCURRED, // Keep in failure phase to show point application action
            nodes: result.updatedNodes,
            logs: [...prevState.logs, ...result.logEvents],
            clusterStatus,
            progressPercent: 100,
            regions: updatedRegions,
            availableActions: updateAvailableActions(SimulationPhase.FAILURE_OCCURRED, prevState.currentScenario, result.updatedNodes, prevState.deploymentMode),
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
        deploymentMode: prevState.deploymentMode, // Keep current deployment mode
        deploymentRegion: prevState.deploymentRegion, // Keep current deployment region
        isScenarioSelected: prevState.isScenarioSelected, // Keep scenario selection status
        phase: SimulationPhase.INITIAL,
        nodes: initialNodes,
        logs: [
          createLogEvent(
            EventType.INITIALIZATION,
            `Reset ${scenario.name} scenario`,
            scenario.description
          ),
        ],
        availableActions: updateAvailableActions(SimulationPhase.INITIAL, prevState.currentScenario, initialNodes, prevState.deploymentMode),
        clusterStatus,
        progressPercent: undefined, // Clear any progress
        recoveryStep: undefined, // Clear any recovery steps
        regions: undefined, // Clear any dynamic regions
        recoveryAction: undefined, // Clear recovery action tracking
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
        prevState.nodes,
        prevState.deploymentMode
      ),
    }));
  }, [updateAvailableActions]);

  const currentScenario = scenarios[simulationState.currentScenario];

  // Determine if content should be shown based on current filters and scenario
  const isScenarioAvailable = () => {
    const { deploymentMode, deploymentRegion, currentScenario } = simulationState;
    
    // Single region scenarios - available for both Atlas and Enterprise
    if (deploymentRegion === DeploymentRegion.ONE) {
      return [ScenarioType.SINGLE_REGION_NO_DR].includes(currentScenario);
    }
    
    if (deploymentMode === DeploymentMode.ATLAS && deploymentRegion === DeploymentRegion.TWO) {
      return [ScenarioType.BASIC_DR, ScenarioType.ENHANCED_DR, ScenarioType.ENHANCED_2_STEP, 
              /* ScenarioType.HOT_STANDBY, */ ScenarioType.COLD_STANDBY].includes(currentScenario);
    }
    
    if (deploymentMode === DeploymentMode.ATLAS && deploymentRegion === DeploymentRegion.THREE) {
      return [ScenarioType.MULTI_DC].includes(currentScenario);
    }
    
    if (deploymentMode === DeploymentMode.ENTERPRISE && deploymentRegion === DeploymentRegion.TWO) {
      return [ScenarioType.BASIC_DR, ScenarioType.ENHANCED_DR, 
              /* ScenarioType.HOT_STANDBY, */ ScenarioType.COLD_STANDBY].includes(currentScenario);
    }
    
    if (deploymentMode === DeploymentMode.ENTERPRISE && deploymentRegion === DeploymentRegion.THREE) {
      return [ScenarioType.MULTI_DC].includes(currentScenario);
    }
    
    return false;
  };

  const shouldShowContent = isScenarioAvailable() && simulationState.isScenarioSelected;

  return (
    <div className="min-h-screen bg-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">MongoDB DR Simulator</h1>
          <p className="text-gray-600 mt-1">Interactive disaster recovery simulation for MongoDB deployments</p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap justify-center gap-4 items-center">
          {/* Deployment Mode Toggle */}
          <DeploymentModeToggle
            currentMode={simulationState.deploymentMode}
            onModeChange={handleDeploymentModeChange}
          />
          
          {/* Deployment Region Filter */}
          <DeploymentRegionFilter
            currentRegion={simulationState.deploymentRegion}
            onRegionChange={handleDeploymentRegionChange}
          />
        </div>

        {        /* Scenario Selection */}
        <div ref={scenarioTabsRef}>
          <ScenarioTabs
            currentScenario={simulationState.currentScenario}
            onScenarioChange={handleScenarioChange}
            deploymentMode={simulationState.deploymentMode}
            deploymentRegion={simulationState.deploymentRegion}
          />
        </div>

        {/* Main Content - Only show if a valid scenario is selected */}
        {shouldShowContent && (
          <>
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Architecture Diagram - Takes up 2 columns on xl screens */}
              <div className="xl:col-span-2" ref={architectureDiagramRef}>
                <ArchitectureDiagram
                  scenario={currentScenario}
                  nodes={simulationState.nodes}
                  dynamicRegions={simulationState.regions}
                  onNodeClick={handleNodeClick}
                />
                
                {/* Progress Bar for Cold Standby restoration */}
                {simulationState.phase === SimulationPhase.RESTORING && simulationState.progressPercent !== undefined && (
                  <div className="mt-4" ref={progressBarRef}>
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
              recoveryAction={simulationState.recoveryAction}
            />

            {/* Event Log - Full width */}
            <EventLog
              events={simulationState.logs}
              maxHeight="max-h-80"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default SimulatorWrapper;
