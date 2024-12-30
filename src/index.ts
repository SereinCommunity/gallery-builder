import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { buildPluginInfo } from './services/infoBuilder.ts';
import logger from './services/logger.ts';
import { octokit } from './services/octokitFactory.ts';

await main(process.argv[2]);

async function main(root: string) {
    if (!existsSync(join(root, 'src', 'plugins'))) {
        throw new Error('目录不存在');
    }

    await buildPluginInfo(join(root, 'src', 'plugins'));
    await summary();
}

async function summary() {
    const r = await octokit.rest.rateLimit.get();
    logger.info(
        `Api用量：${r.data.resources.core.remaining}/${r.data.resources.core.limit}`
    );
}
