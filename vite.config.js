import { defineConfig } from 'vite';

// GitHub Pages pubblica un repository standard su /nome-repository/.
// L'indirizzo viene ricavato automaticamente durante GitHub Actions.
const repository = process.env.GITHUB_REPOSITORY || '';
const [owner, repo] = repository.split('/');
const githubPagesRoot = owner && repo && repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
const base = process.env.GITHUB_PAGES_BASE || (repo && !githubPagesRoot ? `/${repo}/` : '/');

export default defineConfig({ base });
