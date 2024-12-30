import github from '@actions/github';
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'fs';
import { got } from 'got';
import { join } from 'path';
import { PluginDetailedInfo } from '../types/pluginDetailedInfo.ts';
import { PluginIndex } from '../types/pluginIndex.ts';
import { PluginInfo } from '../types/pluginInfo.ts';
import { getOrFetchRepo } from './caches.ts';
import logger from './logger.ts';
import { octokit } from './octokitFactory.ts';
import { validatePluginIndex, validatePluginInfo } from './validators.ts';

const outputPath = '.output';
const client = got.extend({
    prefixUrl: 'https://raw.githubusercontent.com/',
    responseType: 'json',
});

export async function buildPluginInfo(path: string) {
    init();
    logger.info('初始化成功');

    const result: { [key: string]: PluginDetailedInfo } = {};

    for (const id of readdirSync(path)) {
        logger.info(`[${id}] 开始生成`);
        try {
            const index = await validatePluginIndex(
                JSON.parse(
                    readFileSync(join(path, id, 'plugin-index.json'), 'utf-8')
                ) as PluginIndex
            );
            logger.info(`[${id}] 成功读取索引：${index.owner}/${index.repo}`);

            const info = validatePluginInfo(await fetchPluginInfo(index));
            logger.info(`[${id}] 成功获取插件信息文件`);

            info.id = undefined!;
            const detailedInfo = {
                ...info,
                repo: await getRepoInfo(index.owner, index.repo, index.branch),
            } satisfies PluginDetailedInfo;
            logger.info(`[${id}] 成功获取仓库信息`);

            result[id] = detailedInfo;

            writeFileSync(
                join(outputPath, 'gallery', 'plugins', `${id}.json`),
                JSON.stringify(detailedInfo)
            );

            copyFiles(id, join(path, id));
        } catch (error) {
            logger.error(`[${id}] 生成失败：${error}`);
            continue;
        }

        logger.info(`[${id}] 生成完毕`);
    }

    logger.info('所有插件信息生成完毕');

    writeFileSync(
        join(outputPath, 'gallery', 'plugins', '@index.json'),
        JSON.stringify({
            metadata: {
                sha: github.context.sha,
                action: github.context.action,
                eventName: github.context.eventName,
                ref: github.context.ref,
                runId: github.context.runId,
                runNumber: github.context.runNumber,
                time: new Date().toISOString(),
            },
            data: result,
        })
    );
}

function init() {
    if (existsSync(outputPath)) {
        rmSync(outputPath, { recursive: true, force: true });
    }

    mkdirSync(join(outputPath, 'gallery', 'plugins'), { recursive: true });
    mkdirSync(join(outputPath, 'website', 'resources', 'plugins'), {
        recursive: true,
    });
}

async function fetchPluginInfo(pluginIndex: Required<PluginIndex>) {
    let url = `${pluginIndex.owner}/${pluginIndex.repo}/`;
    url += `refs/heads/${pluginIndex.branch}/`;
    url += `${pluginIndex.path}/`;
    url += 'plugin-info.json';

    const response = await client.get<PluginInfo>(url);

    if (!response.ok) {
        throw '无法获取插件信息';
    }

    return response.body;
}

async function getRepoInfo(
    owner: string,
    repo: string,
    branch: string
): Promise<PluginDetailedInfo['repo']> {
    const releaseList = (await octokit.rest.repos.listReleases({ owner, repo }))
        .data;
    const releases: PluginDetailedInfo['repo']['releases'] = {};

    let downloads = 0;
    for (const release of releaseList) {
        if (release.draft || !release.published_at) {
            continue;
        }

        const thisDownloads = release.assets.reduce(
            (acc, asset) => acc + asset.download_count,
            0
        );

        downloads += thisDownloads;

        releases[release.tag_name] = {
            url: release.html_url,
            body: release.body_text || '',
            downloads: thisDownloads,
            publishedAt: release.published_at,
            assets: release.assets.map((asset) => ({
                name: asset.name,
                size: asset.size,
                downloads: asset.download_count,
                url: asset.browser_download_url,
            })),
        };
    }

    const repository = await getOrFetchRepo(owner, repo);

    return {
        owner,
        repo,
        branch,
        url: repository.html_url,
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        issues: repository.open_issues_count,
        pullRequests: repository.open_issues_count,
        createAt: repository.created_at,
        updatedAt: repository.updated_at,
        license: repository.license?.name || null,
        releases: releases,
        downloads,
    };
}

function copyFiles(id: string, dir: string) {
    for (const file of readdirSync(dir)) {
        if (file === 'plugin-index.json') {
            continue;
        }

        copyFileSync(
            join(dir, file),
            join(outputPath, 'website', 'resources', 'plugins', id, file)
        );
    }
}
