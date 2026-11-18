import type { Register } from 'claude-code'

// Model router. On every message you send, a cheap Haiku call sorts the message
// into three tiers. Each model request of that turn is then sent to the model
// and thinking level of the tier. Edit PLAN to change the models or levels.
// Opus is never picked on its own: a hard message runs on Sonnet at high
// thinking and a toast offers /router opus.

type Tier = 'simple' | 'routine' | 'hard'
type Level = 'low' | 'medium' | 'high'

const PLAN: Record<Tier, { model: string; effort: Level }> = {
  simple: { model: 'haiku', effort: 'low' },
  routine: { model: 'sonnet', effort: 'medium' },
  hard: { model: 'sonnet', effort: 'high' },
}

const MODELS = ['haiku', 'sonnet', 'opus']

const RULES = [
  'Sort the request below by how much model power it needs.',
  'Answer with one word: simple, routine or hard.',
  'simple: a lookup, a yes or no, reading or listing a file, a one-line edit, logging a line, a short factual question.',
  'routine: drafting or editing text, summaries, several steps, ordinary coding or file changes, anything written for other people to read.',
  'hard: weighing trade-offs or giving a verdict, debugging an unclear problem, comparing many sources, high-stakes or hard-to-undo work, vague requests that need judgement.',
  'Request:',
].join('\n')

// Writing for other people is never "simple".
const WRITES = /\b(email|e-mail|draft|reply|cover letter|resume|cv|post|message|outreach|letter)\b/i
// Short acknowledgements need no thinking.
const ACK = /^(yes|no|ok|okay|go|sure|thanks|thank you|yep|nope|continue|do it|go on|go ahead|first one|second one)\b/i

// Module state: starts over on a reload, which is fine.
let lock: string = 'auto' // auto | off | haiku | sonnet | opus
let tier: Tier | undefined
let used: string | undefined // the note shown under the answer

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'router',
      description:
        'Model router: /router auto | off | haiku | sonnet | opus | status',
    })

    return next(e)
  })

  on('command.run', { command: 'router' }, async (_$, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'auto' || arg === 'off' || MODELS.includes(arg)) {
      lock = arg
      tier = undefined
    } else if (arg !== '' && arg !== 'status') {
      return { text: 'Use /router auto, off, haiku, sonnet, opus or status.' }
    }

    return {
      text:
        lock === 'auto'
          ? 'Router: auto (picks the model and thinking level for each message).'
          : lock === 'off'
            ? 'Router: off (your own model and thinking level are used).'
            : `Router: locked to ${lock} until you type /router auto.`,
    }
  })

  on('prompt.submit', async ($, e, next) => {
    tier = undefined
    if (lock !== 'auto' || e.command) return next(e)

    tier = await pick($, e.text)
    if (tier === 'hard') {
      $.ui.toast('Hard question: answering on Sonnet (high). Type /router opus to use Opus.')
    }

    return next(e)
  }).catch(($, e, next) => {
    tier = undefined

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) return yield* next(e)
    if (lock === 'off') { $.ui.status('router: off'); return yield* next(e) }

    if (MODELS.includes(lock)) {
      used = `router: locked to ${lock}`
      $.ui.status(used)

      return yield* next({ ...e, model: lock })
    }

    if (tier === undefined) return yield* next(e)

    const plan = PLAN[tier]
    used = `router: ${tier} -> ${plan.model}, ${plan.effort} thinking`
    $.ui.status(used)

    return yield* next({ ...e, model: plan.model, effort: plan.effort })
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId !== undefined) return done

    const note = used
    if (note !== undefined) $.ui.status(note)
    tier = undefined
    used = undefined

    // Shown beneath the answer, so the choice is visible in every app.
    return note === undefined ? done : { ...done, text: note }
  })
}

async function pick(
  $: { model: { classify: (t: string, l: readonly string[], o?: { model?: string }) => Promise<string | undefined> } },
  text: string,
): Promise<Tier> {
  const t = text.trim()
  if (t.split(/\s+/).length <= 6 && ACK.test(t)) return 'simple'

  let found: Tier = 'routine'
  try {
    const label = await $.model.classify(
      RULES + '\n' + t.slice(0, 1500),
      ['simple', 'routine', 'hard'],
      { model: 'haiku' },
    )
    if (label === 'simple' || label === 'routine' || label === 'hard') {
      found = label
    }
  } catch {
    // The classifier failed: the middle tier is the safe guess.
  }

  if (found === 'simple' && WRITES.test(t)) found = 'routine'

  return found
}
