import { Model, TabNode } from 'flexlayout-react';
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
}

export const panelRegistry = new PanelRegistry();

// Default Layout Model
export const defaultLayout: IJsonModel = {
    global: {
        tabEnableClose: true,
        tabEnableFloat: true,
        tabSetEnableMaximize: true,
    },
    borders: [],
    layout: {
        type: 'row',
        weight: 100,
        children: [
            {
                type: 'tabset',
                weight: 50,
                children: [
                    {
                        type: 'tab',
                        name: 'Welcome',
                        component: 'WelcomePanel', // We will implement this
                    },
                ],
            },
            {
                type: 'tabset',
                weight: 50,
                children: [
                    {
                        type: 'tab',
                        name: 'Telemtry',
                        component: 'TelemetryPanel',
                    },
                ],
            },
        ],
    },
};
