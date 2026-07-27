import type { GitHubMetrics } from "../../src/domain/types.ts";
import { ApiError } from "./http.ts";

interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  created_at: string;
  public_repos: number;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  fork: boolean;
  size: number;
  pushed_at: string;
  languages_url: string;
}

interface ContributionsResponse {
  data?: {
    viewer: {
      contributionsCollection: {
        totalCommitContributions: number;
        totalPullRequestContributions: number;
        contributionCalendar: {
          weeks: Array<{
            contributionDays: Array<{ date: string; contributionCount: number }>;
          }>;
        };
      };
    };
  };
  errors?: Array<{ message: string }>;
}

async function github<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Abse-Forge/1.0",
    },
  });
  if (response.status === 401 || response.status === 403) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    throw new ApiError(
      remaining === "0" ? "GITHUB_RATE_LIMITED" : "GITHUB_PERMISSION_REQUIRED",
      remaining === "0" ? "GitHub rate limit reached." : "Reconnect GitHub with the required read permissions.",
      429,
    );
  }
  if (!response.ok) throw new ApiError("INTERNAL_ERROR", "GitHub returned an unexpected response.", 502);
  return await response.json() as T;
}

async function githubGraphql(token: string): Promise<ContributionsResponse["data"]> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "Abse-Forge/1.0",
    },
    body: JSON.stringify({
      query: `query AbseContributionSnapshot {
        viewer {
          contributionsCollection {
            totalCommitContributions
            totalPullRequestContributions
            contributionCalendar {
              weeks {
                contributionDays { date contributionCount }
              }
            }
          }
        }
      }`,
    }),
  });
  if (!response.ok) throw new ApiError("INTERNAL_ERROR", "GitHub contribution data is unavailable.", 502);
  const payload = await response.json() as ContributionsResponse;
  if (payload.errors?.length || !payload.data) {
    throw new ApiError("GITHUB_PERMISSION_REQUIRED", "GitHub did not return contribution data.", 403);
  }
  return payload.data;
}

function streaks(days: Array<{ date: string; contributionCount: number }>) {
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0;
  let running = 0;
  for (const day of ordered) {
    running = day.contributionCount > 0 ? running + 1 : 0;
    longest = Math.max(longest, running);
  }
  let current = 0;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    if (ordered[index].contributionCount <= 0) break;
    current += 1;
  }
  return { current, longest };
}

export async function collectGitHubSnapshot(token: string) {
  const profile = await github<GitHubUser>("/user", token);
  const repos = await github<GitHubRepo[]>("/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator", token);
  const graph = await githubGraphql(token);
  const meaningful = repos.filter((repo) => !repo.fork && repo.size >= 20);
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const maintained = meaningful.filter((repo) => Date.parse(repo.pushed_at) >= oneYearAgo);
  const languageBytes: Record<string, number> = {};

  for (const repo of meaningful.slice(0, 35)) {
    const path = new URL(repo.languages_url).pathname;
    const languages = await github<Record<string, number>>(path, token);
    for (const [language, bytes] of Object.entries(languages)) {
      languageBytes[language] = (languageBytes[language] ?? 0) + bytes;
    }
  }
  const totalLanguageBytes = Object.values(languageBytes).reduce((sum, value) => sum + value, 0);
  const languageDistribution = Object.fromEntries(
    Object.entries(languageBytes)
      .sort((a, b) => b[1] - a[1])
      .map(([language, bytes]) => [language, totalLanguageBytes ? bytes / totalLanguageBytes : 0]),
  );

  const mergedSearch = await github<{ total_count: number }>(
    `/search/issues?q=author:${encodeURIComponent(profile.login)}+type:pr+is:merged&per_page=1`,
    token,
  );
  const externalMergedSearch = await github<{ total_count: number }>(
    `/search/issues?q=author:${encodeURIComponent(profile.login)}+type:pr+is:merged+-user:${encodeURIComponent(profile.login)}&per_page=1`,
    token,
  );
  const releaseLists = await Promise.all(
    meaningful.slice(0, 20).map((repo) =>
      github<Array<{ id: number }>>(`/repos/${repo.full_name}/releases?per_page=100`, token),
    ),
  );
  const calendar = graph!.viewer.contributionsCollection.contributionCalendar;
  const contributionDays = calendar.weeks.flatMap((week) => week.contributionDays);
  const activeWeeksLastYear = calendar.weeks.filter((week) =>
    week.contributionDays.some((day) => day.contributionCount > 0)
  ).length;
  const contributionStreaks = streaks(contributionDays);
  const commitsLastYear = graph!.viewer.contributionsCollection.totalCommitContributions;
  const metrics: GitHubMetrics = {
    accountAgeDays: Math.max(0, Math.floor((Date.now() - Date.parse(profile.created_at)) / 86_400_000)),
    meaningfulRepoCount: meaningful.length,
    totalVerifiedCommits: commitsLastYear,
    recentVerifiedCommits: commitsLastYear,
    currentStreakDays: contributionStreaks.current,
    longestStreakDays: contributionStreaks.longest,
    activeWeeksLastYear,
    pullRequestsMerged: mergedSearch.total_count,
    externalPullRequestsMerged: externalMergedSearch.total_count,
    releasesCount: releaseLists.reduce((sum, releases) => sum + releases.length, 0),
    maintainedRepoCount: maintained.length,
    languageDistribution,
  };
  return { profile, repos, metrics };
}
