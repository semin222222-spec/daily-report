'use client'

import { useState } from 'react'
import { FileManager } from '@/app/(app)/owner-center/[folder]/FileManager'
import type { OcFile } from '@/lib/owner-center'
import type { MeetingNote, OpenChecklist as OpenList, OpenTask } from '@/lib/types'
import { MeetingNotes } from './MeetingNotes'
import { OpenChecklist } from './OpenChecklist'

type Tab = 'files' | 'notes' | 'open'

const TABS: { key: Tab; label: string }[] = [
  { key: 'files', label: '📁 자료함' },
  { key: 'notes', label: '📝 회의록' },
  { key: 'open', label: '🏗️ 매장 오픈 체크리스트' },
]

export function ExecutiveTabs({
  files,
  urls,
  thumbs,
  notes,
  openLists,
  openTasks,
  today,
  isOwner,
}: {
  files: OcFile[]
  urls: Record<string, string>
  thumbs: Record<string, string>
  notes: MeetingNote[]
  openLists: OpenList[]
  openTasks: OpenTask[]
  today: string
  isOwner: boolean
}) {
  const [tab, setTab] = useState<Tab>('files')

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-line bg-white p-1 shell:inline-flex">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-[9px] px-4 py-1.5 text-[13px] font-bold transition ${
              tab === t.key
                ? 'bg-page text-ink shadow-[inset_0_0_0_1px_#e7e4dd]'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'files' && (
        <FileManager
          folder="executive"
          files={files}
          urls={urls}
          thumbs={thumbs}
          isOwner={isOwner}
        />
      )}
      {tab === 'notes' && <MeetingNotes notes={notes} isOwner={isOwner} />}
      {tab === 'open' && (
        <OpenChecklist
          lists={openLists}
          tasks={openTasks}
          isOwner={isOwner}
          today={today}
        />
      )}
    </>
  )
}
