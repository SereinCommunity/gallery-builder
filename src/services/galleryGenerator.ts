import github from '@actions/github';
import { Context } from '@actions/github/lib/context.js';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PluginDetailedInfo } from '../types/pluginDetailedInfo.ts';
import { Result } from '../types/result.ts';
import pathConstants from '../utils/pathConstants.ts';

function generate(result: Result) {
    const plugins: { [key: string]: PluginDetailedInfo } = {};
    const authors: {
        [key: string]: {
            description: string | null;
            plugins: string[];
        };
    } = {};
    const tags = {
        entertainment: [] as string[],
        development: [] as string[],
        tool: [] as string[],
        information: [] as string[],
        management: [] as string[],
        api: [] as string[],
    };

    for (const [id, plugin] of result.success.entries()) {
        plugins[id] = plugin;

        for (const tag of plugin.tags) {
            tags[tag].push(id);
        }

        for (const author of plugin.authors) {
            if (!authors[author.name]) {
                authors[author.name] = {
                    description: author.description || null,
                    plugins: [],
                };
            }

            authors[author.name].plugins.push(id);
        }
    }

    for (const key in plugins) {
        const dir = join(
            pathConstants.root,
            pathConstants.gallery,
            pathConstants.plugins
        );
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `${key}.json`), JSON.stringify(plugins[key]));
    }

    mkdirSync(
        join(pathConstants.root, pathConstants.gallery, pathConstants.plugins),
        {
            recursive: true,
        }
    );

    writeFileSync(
        join(
            pathConstants.root,
            pathConstants.gallery,
            pathConstants.plugins,
            '@tags.json'
        ),
        JSON.stringify({ data: tags, time: new Date().toISOString() })
    );

    writeFileSync(
        join(
            pathConstants.root,
            pathConstants.gallery,
            pathConstants.plugins,
            '@authors.json'
        ),
        JSON.stringify({ data: authors, time: new Date().toISOString() })
    );

    writeFileSync(
        join(
            pathConstants.root,
            pathConstants.gallery,
            pathConstants.plugins,
            '@all.json'
        ),
        JSON.stringify({ data: plugins, time: new Date().toISOString() })
    );

    const context: Partial<Context> = { ...github.context };
    context.apiUrl = undefined;
    context.graphqlUrl = undefined;
    context.serverUrl = undefined;

    writeFileSync(
        join(
            pathConstants.root,
            pathConstants.gallery,
            pathConstants.plugins,
            '@meta.json'
        ),
        JSON.stringify({
            data: {
                context,
                node: process.version,
                arch: process.arch,
                platform: process.platform,
            },
            time: new Date().toISOString(),
        })
    );
}

export default {
    generate,
};
