import { TabNode } from 'flexlayout-react';
import type { IJsonModel } from 'flexlayout-react';
import React from 'react';

// Define the interface for a panel component
export interface PanelProps {
    node: TabNode;
}

export type PanelComponent = React.ComponentType<PanelProps>;

class PanelRegistry {
    private panels: Map<string, PanelComponent> = new Map();

    register(type: string, component: PanelComponent) {
        if (this.panels.has(type)) {
            console.warn(`Panel type "${type}" is already registered. Overwriting.`);
        }
        this.panels.set(type, component);
    }

    get(type: string): PanelComponent | undefined {
        return this.panels.get(type);
    }

    getAvailablePanels(): string[] {
        return Array.from(this.panels.keys());
    }
}

export const panelRegistry = new PanelRegistry();

// Default Layout Model
export const defaultLayout: IJsonModel = {
    global: {
        tabEnableClose: true,
        tabSetEnableMaximize: true,
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
