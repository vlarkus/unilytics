import React from 'react';
import type { PanelProps } from '../PanelRegistry';

export const StyleGuidePanel: React.FC<PanelProps> = () => {
    return (
        <div className="p-6 h-full bg-zinc-950 text-zinc-100 overflow-y-auto space-y-8">

            {/* Headings */}
            <section className="space-y-4">
                <h2 className="text-zinc-500 uppercase text-xs font-bold tracking-wider">Typography</h2>
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold">Heading 1</h1>
                    <h2 className="text-3xl font-bold">Heading 2</h2>
                    <h3 className="text-2xl font-semibold">Heading 3</h3>
                    <h4 className="text-xl font-medium">Heading 4</h4>
                    <p className="text-base text-zinc-300">Body text: The quick brown fox jumps over the lazy dog.</p>
                    <p className="text-sm text-zinc-400">Small text: Used for captions or secondary info.</p>
                    <p className="text-xs text-zinc-500">Tiny text: Used for metadata or labels.</p>
                </div>
            </section>

            {/* Buttons */}
            <section className="space-y-4">
                <h2 className="text-zinc-500 uppercase text-xs font-bold tracking-wider">Buttons</h2>
                <div className="flex flex-wrap gap-4">
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium transition-colors">
                        Primary Action
                    </button>
                    <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md font-medium transition-colors">
                        Secondary Action
                    </button>
                    <button className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-600/50 rounded-md font-medium transition-colors">
                        Destructive
                    </button>
                    <button className="px-4 py-2 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-300 rounded-md font-medium transition-colors">
                        Outline
                    </button>
                    <button disabled className="px-4 py-2 bg-zinc-800 text-zinc-500 rounded-md font-medium cursor-not-allowed">
                        Disabled
                    </button>
                </div>
            </section>

            {/* Inputs */}
            <section className="space-y-4">
                <h2 className="text-zinc-500 uppercase text-xs font-bold tracking-wider">Form Elements</h2>
                <div className="max-w-md space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-zinc-400">Text Input</label>
                        <input
                            type="text"
                            placeholder="Type something..."
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-zinc-400">Select Menu</label>
                        <select className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none">
                            <option>Option 1</option>
                            <option>Option 2</option>
                            <option>Option 3</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="check1" className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-500" />
                        <label htmlFor="check1" className="text-sm text-zinc-300">Checkbox option</label>
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="radio" name="radio" id="rad1" className="w-4 h-4 border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-500" />
                        <label htmlFor="rad1" className="text-sm text-zinc-300">Radio option</label>
                    </div>
                </div>
            </section>

            {/* Cards & Containers */}
            <section className="space-y-4">
                <h2 className="text-zinc-500 uppercase text-xs font-bold tracking-wider">Containers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                        <h3 className="font-semibold mb-2">Standard Card</h3>
                        <p className="text-sm text-zinc-400">This is a standard container used for grouping related content.</p>
                    </div>
                    <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg backdrop-blur-sm">
                        <h3 className="font-semibold mb-2">Glass Card</h3>
                        <p className="text-sm text-zinc-400">A slightly transparent card for overlay effects.</p>
                    </div>
                </div>
            </section>

            {/* Status Indicators */}
            <section className="space-y-4">
                <h2 className="text-zinc-500 uppercase text-xs font-bold tracking-wider">Status & Feedback</h2>
                <div className="flex flex-wrap gap-4">
                    <span className="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-xs font-medium">
                        Active
                    </span>
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs font-medium">
                        Info
                    </span>
                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded text-xs font-medium">
                        Warning
                    </span>
                    <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-xs font-medium">
                        Error
                    </span>
                    <span className="px-2 py-1 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded text-xs font-medium">
                        Offline
                    </span>
                </div>
            </section>

        </div>
    );
};
