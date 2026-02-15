import React from 'react';
import { X } from 'lucide-react';

interface SettingsScreenProps {
    onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
    return (
        <div className="w-full h-full flex flex-col bg-zinc-950 text-white">
            {/* Header */}
            <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950">
                <span className="font-bold text-lg">Settings</span>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-zinc-800 rounded-md transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-8">
                <h2 className="text-xl font-semibold mb-4 text-zinc-400">General Settings</h2>
                <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                        <p className="text-sm text-zinc-500">Settings content will go here...</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
