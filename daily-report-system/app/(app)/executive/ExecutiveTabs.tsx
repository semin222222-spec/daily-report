'use client'

import { useState } from 'react'
import { FileManager } from '@/app/(app)/owner-center/[folder]/FileManager'
import type { OcFile } from '@/lib/owner-center'
import type { MeetingNote } from '@/lib/types'
import { MeetingNotes } from './MeetingNotes'

type Tab = 'files' | 'notes'

export function ExecutiveTabs({
  files,
  urls,
  thumbs,
  notes,
  isOwner,
}: {
  files: OcFile[]
  urls: Record<string, string>
  thumbs: Record<string, string>
  notes: MeetingNote[]
  isOwner: boolean
}) {
  const [tab, setTab] = useState<Tab>('files')

  return (
    <>
      <div className="mb-4 inline-flex rounded-xl border border-line bg-white p-1">
        <button
          type="button"
          onClick={() => setTab('files')}
          className={`rounded-[9px] px-4 py-1.5 text-[13px] font-bold transition ${
            tab === 'files'
              ? 'bg-page text-ink shadow-[inset_0_0_0_1px_#e7e4dd]'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          📁 자료함
        </button>
        <button
          type="button"
          onClick={() => setTab('notes')}
          className={`rounded-[9px] px-4 py-1.5 text-[13px] font-bold transition ${
            tab === 'notes'
              ? 'bg-page text-ink shadow-[inset_0_0_0_1px_#e7e4dd]'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          📝 회의록
        </button>
      </div>

      {tab === 'files' ? (
        <FileManager
          folder="executive"
          files={files}
          urls={urls}
          thumbs={thumbs}
          isOwner={isOwner}
        />
      ) : (
        <MeetingNotes notes={notes} isOwner={isOwner} />
      )}
    </>
  )
}
