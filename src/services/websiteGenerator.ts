import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from 'fs';
import { join } from 'path';
import { Result } from '../types/result.ts';
import pathConstants from '../utils/pathConstants.ts';
import { getOrFetchUser } from './caches.ts';
import logger from './logger.ts';
import { PluginDetailedInfo } from '../types/pluginDetailedInfo.ts';

export default {
    generate,
};

function generate(path: string, result: Result) {
    const authors: { [name: string]: string | undefined } = {};

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

        for (const author of info.authors) {
            authors[author.name] = author.description;
        }

        copyFiles(pluginPath, info);

        logger.info(`[${id}] 文件复制完成`);
    }

    generateAuthors(authors);
    logger.info(`作者文件生成完成`);
}

async function generateAuthors(authors: {
    [name: string]: string | undefined;
}) {
    let authorsContent = '';

    for (const [name, description] of Object.entries(authors)) {
        try {
            const user = await getOrFetchUser(name);
            authorsContent += `${name}:
    name: ${user.name}
    title: ${description || user.bio || '-'}
    image_url: ${user.avatar_url}
    url: ${user.html_url}
    page: true
    social:
        github: ${user.login}
`;
        } catch (error) {
            logger.error(`获取用户 ${name} 失败：${error}`);

            authorsContent += `${name}:
    name: ${name}
    page: true
`;
            if (description) {
                authorsContent += `    title: ${description}`;
            }
        }

        authorsContent += '\n\n';
    }

    writeFileSync(
        join(pathConstants.root, pathConstants.website, 'authors.yml'),
        authorsContent
    );
}

function copyFiles(pluginPath: string, pluginInfo: PluginDetailedInfo) {
    let hasMarkdown = false;
    for (const file of readdirSync(pluginPath)) {
        if (
            ['index.md', 'readme.md'].includes(file.toLowerCase()) &&
            !hasMarkdown
        ) {
            const txt = readFileSync(join(pluginPath, file), 'utf8');
            writeFileSync(
                join(
                    pathConstants.root,
                    pathConstants.website,
                    pluginInfo.id,
                    'index.md'
                ),
                `---
authors: [${pluginInfo.authors.map((v) => v.name).join(', ')}]
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
authors: [${pluginInfo.authors.map((v) => v.name).join(', ')}]
---

# ${pluginInfo.name}

${pluginInfo.description}
`
        );
    }
}
