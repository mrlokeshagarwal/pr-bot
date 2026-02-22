# prbot - Multi-Platform PR Review Bot

AI-powered pull request code review for **Azure DevOps**, **GitHub**, and **Bitbucket**. Fetches PR metadata and diffs, applies your coding standards, and posts structured review feedback as PR comments.

## Supported Platforms

| Platform | Repo Format | Auth |
|---------|-------------|------|
| **Azure DevOps** | `repo-name` or GUID | Personal Access Token (PAT) |
| **GitHub** | `owner/repo` | Personal Access Token |
| **Bitbucket Cloud** | `workspace/repo-slug` | App Password or API Token |

## Prerequisites

- **Node.js 18+** (uses native `fetch`)
- **Source control account** with a PR/MR and API access (PAT or token)
- **AI API key** from [Anthropic](https://console.anthropic.com/) (Claude), [OpenAI](https://platform.openai.com/api-keys) (GPT), or [Cursor](https://cursor.com/dashboard?tab=integrations) (Cloud Agents)
- A **Code Standard.md** file (your team's coding guidelines)

## Installation

```bash
npm install
npm run build
```

For global CLI usage:

```bash
npm link
```

## Setup

### 1. Choose platform and configure

#### Azure DevOps (default)

```bash
prbot set platform ado
prbot set org https://dev.azure.com/YourOrg
prbot set project YourProject
prbot set repo YourRepoNameOrId
prbot set pat          # Prompts for PAT (hidden input)
prbot set standard C:\path\to\Code Standard.md
```

**PAT scopes:** Code (Read & Write)

#### GitHub

```bash
prbot set platform github
prbot set repo owner/repo          # e.g. myorg/my-repo
prbot set github-token             # Prompts for token (hidden input)
prbot set standard C:\path\to\Code Standard.md
```

**Token scopes:** `repo` (or `pull_request` read/write for fine-grained tokens)

#### Bitbucket Cloud

```bash
prbot set platform bitbucket
prbot set repo workspace/repo-slug  # e.g. myteam/myrepo
prbot set bitbucket-token          # Prompts for App Password (hidden input)
prbot set standard C:\path\to\Code Standard.md
```

**App Password scopes:** Pull request (Read, Write), Repository (Read)

Create an App Password at: [Bitbucket Settings → App passwords](https://bitbucket.org/account/settings/app-passwords/)

### 2. Configure AI provider

```bash
# Claude (default)
prbot set provider claude
prbot set claude-key   # Prompts for Claude API key (hidden input)
prbot set model claude-3-5-sonnet-latest

# OpenAI (GPT)
prbot set provider openai
prbot set openai-key   # Prompts for OpenAI API key (hidden input)
prbot set model gpt-4o

# Cursor (requires GitHub PR URL)
prbot set provider cursor
prbot set cursor-key   # Prompts for Cursor API key (hidden input)
prbot set github-pr https://github.com/org/repo/pull/123   # Required for Cursor
```

### 3. Optional settings

```bash
prbot set maxissues 8   # Max issues per review (default: 8)
prbot set dryrun true   # Never post comments (default: false)
```

### 4. Verify configuration

```bash
prbot status
```

Shows current config with secrets redacted.

## Usage

### Run a review

```bash
# Use default repo from config
prbot review 123

# Override repo for this run (ADO: repo name; GitHub/Bitbucket: owner/repo)
prbot review OtherRepo 456
prbot review other-org/other-repo 456    # GitHub/Bitbucket

# Dry run: generate review JSON, print to console, do NOT post
prbot review 123 --dry-run

# Replace: delete existing [AI Review] comments and post a fresh review
prbot review 123 --replace
```

### Example: Azure DevOps

```bash
$ prbot set platform ado
$ prbot set org https://dev.azure.com/YourOrg
$ prbot set project YourProject
$ prbot set repo MyRepo
$ prbot set pat
Enter Azure DevOps PAT (hidden): ****
PAT set.
$ prbot set standard C:\standards\Code Standard.md
$ prbot set claude-key
$ prbot review 42
```

### Example: GitHub

```bash
$ prbot set platform github
$ prbot set repo myorg/my-repo
$ prbot set github-token
Enter GitHub token (hidden): ****
GitHub token set.
$ prbot set standard C:\standards\Code Standard.md
$ prbot set claude-key
$ prbot review 42
```

### Example: Bitbucket

```bash
$ prbot set platform bitbucket
$ prbot set repo myteam/myrepo
$ prbot set bitbucket-token
Enter Bitbucket App Password (hidden): ****
Bitbucket token set.
$ prbot set standard C:\standards\Code Standard.md
$ prbot set claude-key
$ prbot review 42
```

## Configuration

Config is stored at `%APPDATA%\ado-pr-reviewer\config.json` on Windows (or `~/.config/ado-pr-reviewer/` on Linux/macOS).

### Platform-specific keys

| Key | Platform | Description |
|-----|----------|-------------|
| platform | All | `ado` (default), `github`, or `bitbucket` |
| orgUrl | ADO | Azure DevOps org URL (e.g. https://dev.azure.com/YourOrg) |
| project | ADO | Project name or ID |
| pat | ADO | Personal Access Token (Code Read & Write) |
| githubToken | GitHub | Personal Access Token |
| bitbucketToken | Bitbucket | App Password or API Token |
| defaultRepo | All | ADO: repo name/ID; GitHub: owner/repo; Bitbucket: workspace/repo-slug |

### Shared keys

| Key | Description |
|-----|-------------|
| codingStandardPath | Absolute path to Code Standard.md |
| aiProvider | `claude` (default), `cursor`, or `openai` |
| claudeApiKey | Anthropic API key (for Claude provider) |
| claudeModel | Claude model (default: claude-3-5-sonnet-latest) |
| cursorApiKey | Cursor API key (for Cursor provider) |
| cursorModel | Cursor model (default: claude-4-sonnet-thinking) |
| openaiApiKey | OpenAI API key (for OpenAI provider) |
| openaiModel | OpenAI model (default: gpt-4o) |
| githubPrUrl | GitHub PR URL (required when using Cursor provider) |
| maxIssues | Max issue threads per run (default: 8) |
| dryRun | If true, never post (default: false) |

## Commands

### Platform & auth

| Command | Description |
|--------|-------------|
| `prbot set platform <ado\|github\|bitbucket>` | Set source control platform |
| `prbot set org <url>` | Set Azure DevOps org URL |
| `prbot set project <name>` | Set Azure DevOps project |
| `prbot set repo <name>` | Set default repo (format depends on platform) |
| `prbot set pat` | Set Azure DevOps PAT (prompts hidden) |
| `prbot set github-token` | Set GitHub token (prompts hidden) |
| `prbot set bitbucket-token` | Set Bitbucket App Password (prompts hidden) |

### AI & review

| Command | Description |
|--------|-------------|
| `prbot set standard <path>` | Set path to Code Standard.md |
| `prbot set provider <claude\|cursor\|openai>` | Set AI provider |
| `prbot set claude-key` | Set Claude API key (prompts hidden) |
| `prbot set cursor-key` | Set Cursor API key (prompts hidden) |
| `prbot set openai-key` | Set OpenAI API key (prompts hidden) |
| `prbot set model <name>` | Set model for current provider |
| `prbot set github-pr <url>` | Set GitHub PR URL (for Cursor) |
| `prbot review <prId>` | Review PR (uses default repo) |
| `prbot review <repo> <prId>` | Review PR with repo override |
| `prbot review <prId> --dry-run` | Generate review, do not post |
| `prbot review <prId> --replace` | Delete old [AI Review] comments and post fresh |
| `prbot review <prId> --github-pr <url>` | Override GitHub PR URL (Cursor) |
| `prbot status` | Show config and status |
| `prbot reset` | Reset config and state |

## Troubleshooting

### Azure DevOps: 401 Unauthorized

- Ensure PAT has **Code (Read & Write)** scope
- Check org URL format: `https://dev.azure.com/OrgName` (no trailing slash)
- Verify project and repo names/IDs are correct

### GitHub: 401 or 403

- Ensure token has `repo` scope (or `pull_request` read/write for fine-grained)
- For organization repos, token may need org permissions

### Bitbucket: 401 or 403

- Create an [App Password](https://bitbucket.org/account/settings/app-passwords/) with Pull request (Read, Write) and Repository (Read)
- Username/password auth is deprecated; use App Password

### Repo format errors

| Platform | Correct format | Example |
|----------|----------------|---------|
| Azure DevOps | repo name or GUID | `MyRepo` |
| GitHub | owner/repo | `myorg/my-repo` |
| Bitbucket | workspace/repo-slug | `myteam/myrepo` |

### Large diffs

- The bot truncates diffs at ~150K chars and limits to 50 files (ADO)
- Consider splitting large PRs or excluding generated files

### AI output invalid

- Raw response is saved to `%APPDATA%\ado-pr-reviewer\ai-debug-response.json` (Windows) or `~/.config/ado-pr-reviewer/ai-debug-response.json` (Linux/macOS)
- Check schema: overview.summary and issues array required

### Coding standard not found

```bash
prbot set standard "C:\full\path\to\Code Standard.md"
```

Use absolute path. On Windows, paths with spaces may need quotes.

## Development

```bash
npm run dev -- review 123    # Run with ts-node
npm run build                # Compile to dist/
npm start -- review 123      # Run compiled
```

## Inline Comments

When the AI returns issues with `file` and `line`, comments are posted as **inline file comments** (attached to the specific line) instead of general PR comments. Code snippets are included in the comment body when provided.

## License

MIT
