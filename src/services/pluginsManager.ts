import { readdirSync, readFileSync } from 'fs';
import { got } from 'got';
import { join } from 'path';
import { PluginDetailedInfo } from '../types/pluginDetailedInfo.ts';
import { PluginIndex } from '../types/pluginIndex.ts';
import { PluginInfo } from '../types/pluginInfo.ts';
import { getOrFetchRepo } from './caches.ts';
import logger from './logger.ts';
import { octokit } from './octokitFactory.ts';
import { validatePluginIndex, validatePluginInfo } from './validators.ts';
import { Result } from '../types/result.ts';

const client = got.extend({
    prefixUrl: 'https://raw.githubusercontent.com/',
    responseType: 'json',
});

async function getPluginIndexes(
    path: string,
    ids: string[]
): Promise<{
    [id: string]: Required<PluginIndex> | null;
}> {
    const result: { [id: string]: Required<PluginIndex> | null } = {};

    for (const id of ids) {
        try {
            result[id] = await readPluginIndex(path, id);
        } catch (error) {
            result[id] = null;
            logger.error(`[${id}] 读取索引失败：${error}`);
        }
    }

    return result;
}

async function readPluginIndex(path: string, id: string) {
    const index = JSON.parse(
        readFileSync(join(path, id, 'plugin-index.json'), 'utf-8')
    ) as PluginIndex;

    logger.info(`[${id}] 成功读取索引：${index.owner}/${index.repo}`);

    return await validatePluginIndex(index);
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

async function getPluginInfo(id: string, index: Required<PluginIndex>) {
    return validatePluginInfo(id, await fetchPluginInfo(index));
}

async function getPluginDetailedInfo(
    index: Required<PluginIndex>,
    info: Required<PluginInfo>
) {
    const repoInfo = await getRepoInfo(index.owner, index.repo, index.branch);
    logger.info(`[${info.id}] 成功获取仓库信息`);

    return {
        ...info,
        repo: repoInfo,
    } as PluginDetailedInfo;
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
        pushedAt: repository.pushed_at,
        updatedAt: repository.updated_at,
        license: repository.license?.name || null,
        releases: releases,
        downloads,
    };
}

async function check(path: string): Promise<Result> {
    const ids = readdirSync(path);
    const indexes = await getPluginIndexes(path, ids);

    const success = new Map<string, PluginDetailedInfo>();
    const failed = new Map<string, string>();

    for (const id in indexes) {
        const index = indexes[id];
        if (!index) {
            failed.set(id, '索引文件读取失败');
            continue;
        }

        try {
            const info = await getPluginInfo(id, index);
            logger.info(`[${id}] 信息文件获取完成`);

            const detailedInfo = await getPluginDetailedInfo(index, info);
            logger.info(`[${id}] 信息生成完成`);

            success.set(id, detailedInfo);
        } catch (error) {
            logger.error(`[${id}] 信息生成失败：${error}`);
            failed.set(id, String(error));
        }
    }

    return { success, failed };
}

async function checkSingle(path: string, id: string) {
    const index = await readPluginIndex(path, id);
    const info = await getPluginInfo(id, index);

    await getPluginDetailedInfo(index, info);
}

export default { check, checkSingle };
