import { PluginDetailedInfo } from './pluginDetailedInfo.ts';

export type Result = {
    success: Map<string, PluginDetailedInfo>;
    failed: Map<string, string>;
};
