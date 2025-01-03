import { components } from '@octokit/openapi-types';
import { octokit } from './octokitFactory.ts';

type Repository = components['schemas']['full-repository'];
type User = components['schemas']['public-user'];

const repoCache = new Map<string, Repository>();
const userCache = new Map<string, User>();

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

export async function getOrFetchUser(username: string): Promise<User> {
    if (userCache.has(username)) {
        userCache.get(username);
    }
    const response = await octokit.rest.users.getByUsername({
        username,
    });

    userCache.set(username, response.data);

    return response.data;
}
