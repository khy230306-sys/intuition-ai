import { putCampusBlob, deleteCampusBlob } from './blobStore'
import { campusId, nowIso } from './id'
import { extractMaterialText } from './media/extractText'
import { loadCampusStore, updateCampusStore } from './storage'
import type { Material, MaterialKind } from './types'

function detectKind(file: File): MaterialKind {
  const name = file.name.toLowerCase()
  const type = (file.type || '').toLowerCase()
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (type.startsWith('text/plain') || name.endsWith('.txt')) return 'txt'
  if (
    type === 'text/markdown' ||
    name.endsWith('.md') ||
    name.endsWith('.markdown')
  )
    return 'markdown'
  if (
    type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  )
    return 'docx'
  return 'other'
}

export function supportedMaterialKinds(): MaterialKind[] {
  return ['pdf', 'txt', 'markdown', 'docx']
}

export function isSupportedMaterial(file: File): boolean {
  return supportedMaterialKinds().includes(detectKind(file))
}

export async function addMaterial(courseId: string, file: File): Promise<Material> {
  const kind = detectKind(file)
  const now = nowIso()
  const blobKey = campusId('blob')
  const material: Material = {
    id: campusId('mat'),
    courseId,
    name: file.name.slice(0, 180),
    kind,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    blobKey,
    textExtract: '',
    extractStatus: kind === 'other' ? 'unsupported' : 'pending',
    analysisJson: '',
    analysisStatus: 'idle',
    createdAt: now,
    updatedAt: now,
  }

  if (kind !== 'other') {
    await putCampusBlob(blobKey, file)
  }

  updateCampusStore((s) => {
    s.materials.unshift(material)
  })

  if (kind !== 'other') {
    try {
      const text = await extractMaterialText(file, kind)
      updateCampusStore((s) => {
        const idx = s.materials.findIndex((m) => m.id === material.id)
        if (idx < 0) return
        s.materials[idx] = {
          ...s.materials[idx],
          textExtract: text.slice(0, 200_000),
          extractStatus: text.trim() ? 'ready' : 'failed',
          updatedAt: nowIso(),
        }
      })
    } catch {
      updateCampusStore((s) => {
        const idx = s.materials.findIndex((m) => m.id === material.id)
        if (idx < 0) return
        s.materials[idx] = {
          ...s.materials[idx],
          extractStatus: 'failed',
          updatedAt: nowIso(),
        }
      })
    }
  }

  return loadCampusStore().materials.find((m) => m.id === material.id)!
}

export async function deleteMaterial(id: string): Promise<boolean> {
  const mat = loadCampusStore().materials.find((m) => m.id === id)
  if (!mat) return false
  try {
    if (mat.blobKey) await deleteCampusBlob(mat.blobKey)
  } catch {
    /* ignore blob delete errors */
  }
  updateCampusStore((s) => {
    s.materials = s.materials.filter((m) => m.id !== id)
  })
  return true
}

export function materialsForCourse(courseId: string): Material[] {
  return loadCampusStore().materials.filter((m) => m.courseId === courseId)
}
