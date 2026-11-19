import { botMembersFrom, type Bot } from '../bot-types'
import type { ConnectorMessageAsker } from '../connector-message-asker'
import {
  SLACK_MENTION_HREF,
  slackMentionSegments,
  slackMentionsShownText,
  type SlackPeople
} from './slack-message-markup'

/** The Slack people a chat's messages name, by user id: its askers and the agents that wrote
 *  for them. Null when no one asked from Slack, so other chats' text is never read as Slack's. */
export function slackPeopleIn(
  messages: readonly { asker?: Pick<ConnectorMessageAsker, 'source' | 'userId' | 'name' | 'via'> }[]
): SlackPeople | null {
  let people: Map<string, string> | null = null
  for (const { asker } of messages) {
    if (asker?.source !== 'slack') {
      continue
    }
    people ??= new Map()
    if (asker.name) {
      people.set(asker.userId, asker.name)
    }
    if (asker.via) {
      people.set(asker.via.userId, asker.via.name)
    }
  }
  return people
}

/** A reply as the chat list shows it: mentions written for Slack read as its Slack people's names. */
export function chatReplyShown(bot: Pick<Bot, 'members' | 'slack'>, reply: string): string {
  if (!bot.slack) {
    return reply
  }
  const people = new Map(botMembersFrom(bot.members, 'slack').map(({ id, name }) => [id, name]))
  return slackMentionsShownText(reply, people)
}

/** A key that changes only when the people do, so a chat's renders can keep one map. */
export function slackPeopleKey(people: SlackPeople | null): string {
  return people ? JSON.stringify([...people].sort(([a], [b]) => a.localeCompare(b))) : ''
}

export function slackPeopleFromKey(key: string): SlackPeople | null {
  if (!key) {
    return null
  }
  const pairs: [string, string][] = JSON.parse(key)
  return new Map(pairs)
}

type MarkdownNode = { type: string; value?: string; url?: string; children?: MarkdownNode[] }

// Text under these is code or already a link's label.
const SKIPPED = new Set(['code', 'inlineCode', 'link', 'linkReference', 'math', 'inlineMath'])
// Markdown reads `<!here>` as raw HTML; the whole node is the token.
const BROADCAST_HTML = /^<!(?:here|channel|everyone)(?:\|[^<>]*)?>$/

function mentionNodes(value: string, people: SlackPeople): MarkdownNode[] {
  return slackMentionSegments(value, people).map((segment) =>
    segment.kind === 'mention'
      ? { type: 'link', url: SLACK_MENTION_HREF, children: [{ type: 'text', value: segment.text }] }
      : { type: 'text', value: segment.text }
  )
}

/** Draws the Slack mentions an agent wrote in its markdown as the chat's mention links
 *  (`SLACK_MENTION_HREF`), outside code; the text itself, and what Slack gets, keep the tokens. */
export function drawSlackMentionTokens(node: MarkdownNode, people: SlackPeople): void {
  if (SKIPPED.has(node.type) || !node.children) {
    return
  }
  node.children = node.children.flatMap((child) => {
    if (
      (child.type === 'text' && child.value?.includes('<')) ||
      (child.type === 'html' && BROADCAST_HTML.test(child.value ?? ''))
    ) {
      return mentionNodes(child.value!, people)
    }
    drawSlackMentionTokens(child, people)
    return [child]
  })
}
