import type { LottoDraw } from '../../domain/types'
import { MAX_N } from '../../domain/types'
import { drawsBefore } from '../../data/provider'

export interface NetworkEdge {
  a: number
  b: number
  weight: number
}

export interface NetworkGraph {
  nodes: number[]
  edges: NetworkEdge[]
  neighborsOf(n: number, topK: number): { number: number; weight: number }[]
}

export function buildNetworkGraph(
  draws: LottoDraw[],
  asOfDrawNumber?: number,
): NetworkGraph {
  const used = drawsBefore(draws, asOfDrawNumber)
  const adj = new Map<number, Map<number, number>>()
  for (let n = 1; n <= MAX_N; n++) adj.set(n, new Map())

  for (const d of used) {
    const nums = d.numbers
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const a = nums[i]!
        const b = nums[j]!
        const rowA = adj.get(a)!
        const rowB = adj.get(b)!
        rowA.set(b, (rowA.get(b) ?? 0) + 1)
        rowB.set(a, (rowB.get(a) ?? 0) + 1)
      }
    }
  }

  const edges: NetworkEdge[] = []
  for (let a = 1; a <= MAX_N; a++) {
    const row = adj.get(a)!
    for (const [b, w] of row) {
      if (a < b) edges.push({ a, b, weight: w })
    }
  }
  edges.sort((x, y) => y.weight - x.weight)

  return {
    nodes: Array.from({ length: MAX_N }, (_, i) => i + 1),
    edges,
    neighborsOf(n: number, topK: number) {
      const row = adj.get(n)
      if (!row) return []
      return [...row.entries()]
        .map(([number, weight]) => ({ number, weight }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, topK)
    },
  }
}

/** SVG relation map for mobile — selected number + top neighbors. */
export function renderRelationSvg(
  graph: NetworkGraph,
  selected: number,
  topK: number,
  width = 320,
  height = 280,
): string {
  const neighbors = graph.neighborsOf(selected, topK)
  const cx = width / 2
  const cy = height / 2
  const R = Math.min(width, height) * 0.38
  const maxW = Math.max(...neighbors.map((n) => n.weight), 1)

  const nodes = neighbors.map((n, i) => {
    const ang = (Math.PI * 2 * i) / Math.max(neighbors.length, 1) - Math.PI / 2
    return {
      n: n.number,
      w: n.weight,
      x: cx + Math.cos(ang) * R,
      y: cy + Math.sin(ang) * R,
    }
  })

  const lines = nodes
    .map((node) => {
      const stroke = 1 + (node.w / maxW) * 4
      return `<line x1="${cx}" y1="${cy}" x2="${node.x}" y2="${node.y}" stroke="rgba(242,193,78,${0.25 + (node.w / maxW) * 0.55})" stroke-width="${stroke}" />`
    })
    .join('')

  const circles = nodes
    .map(
      (node) =>
        `<g><circle cx="${node.x}" cy="${node.y}" r="16" fill="#0f3d38" stroke="#f2c14e" stroke-width="1.5"/><text x="${node.x}" y="${node.y + 4}" text-anchor="middle" fill="#f7f3e8" font-size="11" font-weight="700">${node.n}</text></g>`,
    )
    .join('')

  return `<svg class="v3-relation-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${selected}번 관계 지도">
    ${lines}
    <circle cx="${cx}" cy="${cy}" r="22" fill="#f2c14e"/>
    <text x="${cx}" y="${cy + 5}" text-anchor="middle" fill="#0b2e2a" font-size="14" font-weight="800">${selected}</text>
    ${circles}
  </svg>`
}
