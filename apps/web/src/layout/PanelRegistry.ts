import { TabNode } from 'flexlayout-react';
import type { IJsonModel } from 'flexlayout-react';
import React from 'react';

// Define the interface for a panel component
export interface PanelProps {
    node: TabNode;
}

export type PanelComponent = React.ComponentType<PanelProps>;
export interface PanelDefinition {
    type: string;
    displayName: string;
}

interface PanelRegistration {
    component: PanelComponent;
    displayName: string;
}

class PanelRegistry {
    private panels: Map<string, PanelRegistration> = new Map();

    register(type: string, component: PanelComponent, displayName: string = type) {
        if (this.panels.has(type)) {
            console.warn(`Panel type "${type}" is already registered. Overwriting.`);
        }
        this.panels.set(type, { component, displayName });
    }

    get(type: string): PanelComponent | undefined {
        return this.panels.get(type)?.component;
    }

    getDisplayName(type: string): string {
        return this.panels.get(type)?.displayName ?? type;
    }

    getAvailablePanels(): PanelDefinition[] {
        return Array.from(this.panels.entries()).map(([type, panel]) => ({
            type,
            displayName: panel.displayName,
        }));
    }
}

export const panelRegistry = new PanelRegistry();

// Default Layout Model
export const defaultLayout: IJsonModel = {
    global: {
        tabEnableClose: true,
        tabSetEnableMaximize: true,
        splitterEnableHandle: false,
        splitterExtra: 10,
        splitterSize: 8, // Matches var(--gap)
    },
    borders: [],
    layout: {
        type: 'row',
        weight: 100,
        children: [
            {
                type: 'tabset',
                weight: 60,
                children: [
                    {
                        type: 'tab',
                        name: 'Welcome',
                        component: 'WelcomePanel',
                    },
                ],
            },
            {
                type: 'tabset',
                weight: 40,
                children: [
                    {
                        type: 'tab',
                        name: 'UI Reference',
                        component: 'StyleGuidePanel',
                    },
                ],
            },
        ],
    },
};
