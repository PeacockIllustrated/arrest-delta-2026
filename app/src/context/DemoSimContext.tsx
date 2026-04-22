import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useDemoSimulator, type UseDemoSimulatorReturn } from '../hooks/useDemoSimulator';

// =============================================================================
// DEMO SIM CONTEXT - Shared simulator state across portal
// =============================================================================

const DemoSimContext = createContext<UseDemoSimulatorReturn | null>(null);

export interface DemoSimProviderProps {
    children: ReactNode;
    /** Auto-start the simulator on mount. Defaults to true for demo-ready behavior. */
    autoStart?: boolean;
}

/**
 * Provider component to wrap portal layout.
 * When autoStart is true (default), the simulator begins emitting events on mount
 * so the portal feels alive the moment the user arrives.
 */
export function DemoSimProvider({ children, autoStart = true }: DemoSimProviderProps) {
    const simulator = useDemoSimulator();
    const { start, isOn } = simulator;

    useEffect(() => {
        if (autoStart && !isOn) {
            start();
        }
    }, [autoStart, isOn, start]);

    return (
        <DemoSimContext.Provider value={simulator}>
            {children}
        </DemoSimContext.Provider>
    );
}

/**
 * Hook to consume simulator context
 */
export function useDemoSim(): UseDemoSimulatorReturn {
    const context = useContext(DemoSimContext);
    if (!context) {
        throw new Error('useDemoSim must be used within a DemoSimProvider');
    }
    return context;
}

export default DemoSimContext;
