'use client'

import { useState, useTransition } from 'react'
import { parseISODate, toISODate, todayKST } from '@/lib/format'
import type { Staff } from '@/lib/types'
import { setHealthCert } from '../schedule/actions'

/**
 * 보건증 만료 관리.
 *
 * 보건증은 발급일로부터 1년이라 발급일만 받고 만료일은 계산해서 보여준다.
 * (만료일을 직접 받으면 헷갈려서 잘못 적기 쉽다)
 */
const VALID_DAYS = 365
const WARN_DAYS = 30

interface CertState {
  issued: string
  memo: string
}

function expiryOf(issued: string): string {
  const d = parseISODate(issued)
  d.setDate(d.getDate() + VALID_DAYS)
  return toISODate(d)
}

function daysLeft(issued: string, today: string): number {
  const exp = parseISODate(expiryOf(issued)).getTime()
  const now = parseISODate(today).getTime()
  return Math.round((exp - now) / 86400000)
}

function statusOf(issued: string, today: string) {
  if (!issued) {
    return { label: '미등록', className: 'bg-line-soft text-muted' }
  }
  const left = daysLeft(issued, today)
  if (left < 0) {
    return { label: `만료 ${-left}일 지남`, className: 'bg-bad/10 text-bad' }
  }
  if (left <= WARN_DAYS) {
    return { label: `만료 D-${left}`, className: 'bg-warn/25 text-[#8a5a00]' }
  }
  return { label: `유효 D-${left}`, className: 'bg-good/10 text-[#0a7d0a]' }
}

export function HealthCerts({ staff }: { staff: Staff[] }) {
  const today = todayKST()
  const [pending, startTransition] = useTransition()
  const [state, setState] = useState<Record<string, CertState>>(() =>
    Object.fromEntries(
      staff.map((s) => [
        s.id,
        { issued: s.health_cert_issued ?? '', memo: s.health_cert_memo ?? '' },
      ])
    )
  )
  const [flash, setFlash] = useState<Record<string, string>>({})

  function save(id: string) {
    const cur = state[id]
    startTransition(async () => {
      const res = await setHealthCert(id, cur.issued || null, cur.memo)
      setFlash((f) => ({ ...f, [id]: res.ok ? '저장됨' : (res.message ?? '실패') }))
      setTimeout(() => setFlash((f) => ({ ...f, [id]: '' })), 2000)
    })
  }

  // 만료·임박한 사람을 위로 올려서 눈에 먼저 띄게 한다
  const sorted = [...staff].sort((a, b) => {
    const la = state[a.id]?.issued
      ? daysLeft(state[a.id].issued, today)
      : Number.MAX_SAFE_INTEGER
    const lb = state[b.id]?.issued
      ? daysLeft(state[b.id].issued, today)
      : Number.MAX_SAFE_INTEGER
    return la - lb
  })

  const expiring = sorted.filter((s) => {
    const iss = state[s.id]?.issued
    return iss && daysLeft(iss, today) <= WARN_DAYS
  }).length
  const missing = sorted.filter((s) => !state[s.id]?.issued).length

  return (
    <div className="card mt-4">
      <h3 className="card-title">보건증 날짜 체크</h3>
      <p className="card-sub">
        발급일을 넣으면 만료일(발급일 + 1년)과 남은 일수를 자동으로 계산합니다.
        {expiring > 0 && (
          <b className="ml-1 text-bad">만료·임박 {expiring}명</b>
        )}
        {missing > 0 && (
          <span className="ml-1 text-muted">· 미등록 {missing}명</span>
        )}
      </p>

      {staff.length === 0 && (
        <p className="py-6 text-center text-[13px] text-muted">
          등록된 인원이 없습니다. [근무 스케줄] 화면에서 인원을 먼저
          추가해주세요.
        </p>
      )}

      {staff.length > 0 && (
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>이름</th>
                <th>직책</th>
                <th>발급일</th>
                <th>만료일</th>
                <th>상태</th>
                <th>메모</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => {
                const cur = state[s.id] ?? { issued: '', memo: '' }
                const st = statusOf(cur.issued, today)
                return (
                  <tr key={s.id}>
                    <td className="font-semibold">{s.name}</td>
                    <td>{s.emp_type}</td>
                    <td>
                      <input
                        type="date"
                        value={cur.issued}
                        onChange={(e) =>
                          setState((v) => ({
                            ...v,
                            [s.id]: { ...cur, issued: e.target.value },
                          }))
                        }
                        className="fld-input !py-1.5 !text-[12.5px]"
                      />
                    </td>
                    <td className="tabular-nums text-ink-2">
                      {cur.issued ? expiryOf(cur.issued) : '—'}
                    </td>
                    <td>
                      <span className={`pill ${st.className}`}>{st.label}</span>
                    </td>
                    <td>
                      <input
                        value={cur.memo}
                        onChange={(e) =>
                          setState((v) => ({
                            ...v,
                            [s.id]: { ...cur, memo: e.target.value },
                          }))
                        }
                        placeholder="예: 재발급 예약함"
                        className="fld-input !py-1.5 !text-[12.5px]"
                      />
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {flash[s.id] && (
                          <span className="text-[11.5px] font-semibold text-good">
                            {flash[s.id]}
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => save(s.id)}
                          className="btn-ghost !px-3 !py-1.5 !text-xs"
                        >
                          저장
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
