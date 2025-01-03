export type PluginInfo = {
    id: string;
    name: string;
    version: string;
    description?: string;
    tags?: (
        | 'entertainment'
        | 'development'
        | 'tool'
        | 'information'
        | 'management'
        | 'api'
    )[];
    targetingSerein?: string[];
    dependencies?: { id: string; version: string[] }[];
    authors?: { name: string; description: string }[];
    type: 'js' | 'net';
    entryFile?: string;
};
