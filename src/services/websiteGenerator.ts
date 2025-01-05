import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from 'fs';
import yaml from 'js-yaml';
import { join } from 'path';
import { PluginDetailedInfo } from '../types/pluginDetailedInfo.ts';
import { Result } from '../types/result.ts';
import pathConstants from '../utils/pathConstants.ts';
import logger from './logger.ts';

export default {
    generate,
};

function generate(path: string, result: Result) {
    mkdirSync(join(pathConstants.root, pathConstants.website), {
        recursive: true,
    });

    for (const [id, info] of result.success.entries()) {
        const pluginPath = join(path, id);

        if (!existsSync(pluginPath)) {
            logger.error(`[${id}] 插件文件夹不存在`);
            continue;
        }

        mkdirSync(join(pathConstants.root, pathConstants.website, id), {
            recursive: true,
        });

        logger.info(`[${id}] 开始生成网页`);

        copyFiles(pluginPath, info);

        logger.info(`[${id}] 文件复制完成`);
    }
}

function copyFiles(pluginPath: string, pluginInfo: PluginDetailedInfo) {
    let hasMarkdown = false;
    for (const file of readdirSync(pluginPath)) {
        if (
            ['index.md', 'readme.md'].includes(file.toLowerCase()) &&
            !hasMarkdown
        ) {
            const txt = readFileSync(join(pluginPath, file), 'utf8').replace(
                /^# .+$/m,
                ''
            );

            writeFileSync(
                join(
                    pathConstants.root,
                    pathConstants.website,
                    pluginInfo.id,
                    'index.md'
                ),
                `---
${yaml.dump({ ...pluginInfo, title: pluginInfo.name })}
---

` + txt
            );
            hasMarkdown = true;
        } else if (file.endsWith('.md')) {
            continue;
        } else if (file !== 'plugin-index.json') {
            copyFileSync(
                join(pluginPath, file),
                join(
                    pathConstants.root,
                    pathConstants.website,
                    pluginInfo.id,
                    file
                )
            );
        }
    }

    if (!hasMarkdown) {
        writeFileSync(
            join(
                pathConstants.root,
                pathConstants.website,
                pluginInfo.id,
                'index.md'
            ),
            `---
${yaml.dump({ ...pluginInfo, title: pluginInfo.name })}
---

${pluginInfo.description}
`
        );
    }
}
