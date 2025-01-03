import { PluginInfo } from './pluginInfo.ts';

export type PluginDetailedInfo = {
    repo: {
        owner: string;
        repo: string;
        branch: string;
        url: string;
        stars: number;
        forks: number;
        issues: number;
        pullRequests: number;
        createAt: string;
        pushedAt: string;
        updatedAt: string;
        license: string | null;
        downloads: number;
        releases: {
            [tagName: string]: {
                url: string;
                body: string;
                downloads: number;
                publishedAt: string;
                assets: {
                    name: string;
                    size: number;
                    downloads: number;
                    url: string;
                }[];
            };
        };
    };
} & Required<PluginInfo>;
