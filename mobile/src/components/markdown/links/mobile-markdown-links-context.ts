import { createContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { createNativeChatFileLinkHooks } from '../../../../../src/shared/native-chat/file-access/native-chat-file-link-hooks'
import type { NativeChatFileLinkExistence } from '../../../../../src/shared/native-chat/file-access/native-chat-file-link-existence'
import type { GitHubRepoReference } from '../../../../../src/shared/github/markdown/github-reference-links'
import type { SlackPeople } from '../../../../../src/shared/connectors/slack-message-markup'

/** What a chat knows about its workspace for links in its text; absent outside chat. */
export type MobileMarkdownLinks = {
  /** Null until the workspace's folder is known; paths then link without a check. */
  fileLinks: NativeChatFileLinkExistence | null
  /** Where bare `#123` points; null leaves it text. */
  githubRepo: GitHubRepoReference | null
  /** A chat someone asked from Slack: the people it knows, so mentions its agent wrote show as names. */
  slackPeople?: SlackPeople | null
}

export const MobileMarkdownLinksContext = createContext<MobileMarkdownLinks | null>(null)

export const { useNativeChatFileLinkExistsFrom, useRecheckNativeChatFileLinksWhenSettled } =
  createNativeChatFileLinkHooks({ useEffect, useMemo, useRef, useSyncExternalStore })
