import { components } from '@octokit/openapi-types';
import { octokit } from './octokitFactory.ts';
type Repository = components['schemas']['full-repository'];

const repoCache = new Map<string, Repository>();

export async function getOrFetchRepo(
    owner: string,
    repo: string
): Promise<Repository> {
    const key = `${owner}/${repo}`;

    if (repoCache.has(key)) {
        repoCache.get(key);
    }
    const response = await octokit.rest.repos.get({
        owner,
        repo,
    });

    repoCache.set(key, response.data);
    return response.data;
}
