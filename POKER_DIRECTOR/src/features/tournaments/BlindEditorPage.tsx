import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Label, Select } from '@/components/ui/Input'
import {
  BLIND_TEMPLATE_LABELS,
  autoGenerateBlinds,
  createBlindTemplate,
  renumber,
  totalDurationMinutes,
  type BlindTemplateKey,
} from '@/utils/blinds'
import { createId } from '@/utils/id'
import type { BlindLevel } from '@/types'

export function BlindEditorPage() {
  const { id } = useParams()
  const tournament = useAppStore((s) => s.tournaments.find((t) => t.id === id))
  const structure = useAppStore((s) =>
    s.blindStructures.find((b) => b.id === tournament?.blindStructureId),
  )
  const updateBlindLevels = useAppStore((s) => s.updateBlindLevels)
  const saveBlindStructure = useAppStore((s) => s.saveBlindStructure)
  const [levels, setLevels] = useState<BlindLevel[] | null>(null)
  const [template, setTemplate] = useState<BlindTemplateKey>('standard')
  const [bulkMinutes, setBulkMinutes] = useState('15')
  const current = useMemo(
    () => levels ?? structure?.levels ?? [],
    [levels, structure?.levels],
  )

  const total = useMemo(() => totalDurationMinutes(current), [current])

  if (!tournament || !structure) return <p className="text-mute">토너먼트를 찾을 수 없습니다.</p>

  const commit = (next: BlindLevel[]) => {
    const renumbered = renumber(next)
    setLevels(renumbered)
    updateBlindLevels(structure.id, renumbered)
  }

  const updateLevel = (index: number, patch: Partial<BlindLevel>) => {
    commit(current.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">블라인드 구조 편집</h1>
        <p className="text-sm text-mute">
          {tournament.name} · 총 {total}분
        </p>
      </div>

      <Card className="flex flex-wrap gap-2">
        <Select value={template} onChange={(e) => setTemplate(e.target.value as BlindTemplateKey)}>
          {Object.entries(BLIND_TEMPLATE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Button onClick={() => commit(createBlindTemplate(template))}>템플릿 불러오기</Button>
        <Button onClick={() => commit(autoGenerateBlinds(100, 12, 15))}>자동 생성</Button>
        <div className="flex items-end gap-2">
          <div>
            <Label>전체 시간(분)</Label>
            <Input value={bulkMinutes} onChange={(e) => setBulkMinutes(e.target.value)} />
          </div>
          <Button
            onClick={() =>
              commit(
                current.map((l) =>
                  l.isBreak
                    ? { ...l, breakMinutes: Number(bulkMinutes), durationMinutes: Number(bulkMinutes) }
                    : { ...l, durationMinutes: Number(bulkMinutes) },
                ),
              )
            }
          >
            일괄 수정
          </Button>
        </div>
        <Button
          onClick={() => {
            saveBlindStructure({
              ...structure,
              id: createId('blinds'),
              name: `${structure.name} 저장본`,
              isTemplate: true,
              levels: current,
            })
          }}
        >
          구조 템플릿 저장
        </Button>
      </Card>

      <div className="space-y-2">
        {current.map((level, index) => (
          <Card key={level.id} className="grid gap-2 sm:grid-cols-6">
            <div className="sm:col-span-6 flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold">레벨 {level.levelNumber}</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const copy = { ...level, id: createId('lvl') }
                    const next = [...current]
                    next.splice(index + 1, 0, copy)
                    commit(next)
                  }}
                >
                  복제
                </Button>
                <Button
                  size="sm"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...current]
                    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                    commit(next)
                  }}
                >
                  위로
                </Button>
                <Button
                  size="sm"
                  disabled={index === current.length - 1}
                  onClick={() => {
                    const next = [...current]
                    ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
                    commit(next)
                  }}
                >
                  아래로
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => commit(current.filter((_, i) => i !== index))}
                >
                  삭제
                </Button>
              </div>
            </div>
            <div>
              <Label>시간(분)</Label>
              <Input
                type="number"
                value={level.isBreak ? level.breakMinutes ?? level.durationMinutes : level.durationMinutes}
                onChange={(e) =>
                  updateLevel(
                    index,
                    level.isBreak
                      ? { breakMinutes: Number(e.target.value), durationMinutes: Number(e.target.value) }
                      : { durationMinutes: Number(e.target.value) },
                  )
                }
              />
            </div>
            <div>
              <Label>SB</Label>
              <Input
                type="number"
                value={level.smallBlind}
                disabled={level.isBreak}
                onChange={(e) => updateLevel(index, { smallBlind: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>BB</Label>
              <Input
                type="number"
                value={level.bigBlind}
                disabled={level.isBreak}
                onChange={(e) => updateLevel(index, { bigBlind: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>BB Ante</Label>
              <Input
                type="number"
                value={level.bigBlindAnte}
                disabled={level.isBreak}
                onChange={(e) => updateLevel(index, { bigBlindAnte: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Ante</Label>
              <Input
                type="number"
                value={level.ante}
                disabled={level.isBreak}
                onChange={(e) => updateLevel(index, { ante: Number(e.target.value) })}
              />
            </div>
            <div className="sm:col-span-6 flex flex-wrap gap-3 text-xs">
              {(
                [
                  ['isBreak', '브레이크'],
                  ['isRegistrationClose', '등록 마감'],
                  ['isRebuyEnd', '리바이 종료'],
                  ['isAddonAvailable', '애드온'],
                  ['isChipRace', '칩 레이스'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={Boolean(level[key])}
                    onChange={(e) => updateLevel(index, { [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            commit([
              ...current,
              {
                id: createId('lvl'),
                levelNumber: current.length + 1,
                durationMinutes: 15,
                smallBlind: 100,
                bigBlind: 200,
                bigBlindAnte: 0,
                ante: 0,
                isBreak: false,
                isRegistrationClose: false,
                isRebuyEnd: false,
                isAddonAvailable: false,
                isChipRace: false,
              },
            ])
          }
        >
          레벨 추가
        </Button>
        <Button
          onClick={() =>
            commit([
              ...current,
              {
                id: createId('lvl'),
                levelNumber: current.length + 1,
                durationMinutes: 10,
                breakMinutes: 10,
                smallBlind: 0,
                bigBlind: 0,
                bigBlindAnte: 0,
                ante: 0,
                isBreak: true,
                isRegistrationClose: false,
                isRebuyEnd: false,
                isAddonAvailable: false,
                isChipRace: false,
              },
            ])
          }
        >
          브레이크 삽입
        </Button>
      </div>
    </div>
  )
}
