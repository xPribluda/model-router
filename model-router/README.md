# model-router

A Claude Code mod. On every message you send, a cheap Haiku call sorts the message into three tiers and each model request of that turn runs on the matching model and thinking level.

| Tier | Model | Thinking |
|---|---|---|
| simple | Haiku | low |
| routine | Sonnet | medium |
| hard | Sonnet (toast offers Opus) | high |

Opus is never chosen on its own. On a hard message a toast says "/router opus".

## Commands
- /router auto: the router picks (default)
- /router off: your own model and thinking level
- /router haiku, sonnet or opus: lock to that model until /router auto
- /router status

## Install on another computer
1. Unzip so you have a folder named model-router.
2. Put it in any folder, then start Claude Code with: claude --plugin-dir /path/to/model-router
   Or set CLAUDE_CODE_PLUGIN_DIRS=/path/to/model-router in your shell or in the env of ~/.claude/settings.json.
3. Needs a Claude Code build with mods (the turn.step hook).

Change models or levels in the PLAN table at the top of hooks/register.ts.

## One-step install (all sessions)
Unzip, open Terminal in the unzipped folder and run: `./install.sh`
It copies the mod to ~/.claude/mods, adds it to CLAUDE_CODE_PLUGIN_DIRS in ~/.claude/settings.json (backup saved) and works in every new session.
