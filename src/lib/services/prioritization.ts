import { HOUR_BASED_GAIN_TYPES } from '@/lib/config/gain-weights'

const MAX_PRIORIZADO = 5
const INACTIVE_BACKLOG_STATUSES = ['CONCLUIDO', 'CANCELADO']

export async function rebalancePrioritization(): Promise<number> {
  const { prisma } = await import('@/lib/prisma')
  const items = await prisma.backlogItem.findMany({
    where: { status: { notIn: INACTIVE_BACKLOG_STATUSES } },
    orderBy: [
      { posicaoManual: { sort: 'asc', nulls: 'last' } },
      { scorePriorizacao: 'desc' },
      { createdAt: 'asc' },
    ],
    select: { id: true, status: true, posicaoManual: true },
  })

  const updates: Array<{ id: string; newStatus?: string; posicaoManual: number }> = []

  items.forEach((item, index) => {
    const expectedStatus = index < MAX_PRIORIZADO ? 'PRIORIZADO' : 'NAO_INICIADO'
    const expectedPosition = index + 1
    const shouldAutoUpdateStatus = item.status === 'PRIORIZADO' || item.status === 'NAO_INICIADO'
    const nextStatus = shouldAutoUpdateStatus ? expectedStatus : undefined

    if ((nextStatus && item.status !== nextStatus) || item.posicaoManual !== expectedPosition) {
      updates.push({ id: item.id, newStatus: nextStatus, posicaoManual: expectedPosition })
    }
  })

  if (updates.length > 0) {
    await Promise.all(
      updates.map(({ id, newStatus, posicaoManual }) =>
        prisma.backlogItem.update({
          where: { id },
          data: {
            ...(newStatus ? { status: newStatus } : {}),
            posicaoManual,
          },
        })
      )
    )
  }

  return updates.length
}

export async function recalculateBacklogItemForSolicitacao(
  solicitacaoId: string,
  esforcoTotal: number
): Promise<void> {
  const { prisma } = await import('@/lib/prisma')
  const { DEFAULT_GAIN_WEIGHTS, DEFAULT_VALOR_HORA } = await import('@/lib/config/gain-weights')

  const backlogItem = await prisma.backlogItem.findUnique({
    where: { solicitacaoId },
    select: {
      id: true,
      tipoGanho: true,
      valorGanho: true,
    },
  })

  if (!backlogItem) return

  const [gainWeightConfig, hourlyRateConfig] = await Promise.all([
    prisma.gainWeightConfig.findUnique({ where: { tipoGanho: backlogItem.tipoGanho } }),
    prisma.hourlyRateConfig.findFirst(),
  ])

  const weight =
    gainWeightConfig?.peso ??
    DEFAULT_GAIN_WEIGHTS[backlogItem.tipoGanho as keyof typeof DEFAULT_GAIN_WEIGHTS] ??
    1.0
  const valorHora = hourlyRateConfig?.valorHora ?? DEFAULT_VALOR_HORA
  const ganhoNormalizado = normalizeGain(
    backlogItem.tipoGanho,
    backlogItem.valorGanho,
    { [backlogItem.tipoGanho]: weight },
    valorHora
  )
  const scorePriorizacao = calculatePrioritizationScore(ganhoNormalizado, esforcoTotal)

  await prisma.backlogItem.update({
    where: { id: backlogItem.id },
    data: { ganhoNormalizado, scorePriorizacao },
  })

  await rebalancePrioritization()
}

export interface BacklogItemForRanking {
  id: string
  tipoGanho: string
  valorGanho: number
  esforcoTotal: number
  posicaoManual?: number | null
  ganhoNormalizado?: number
  scorePriorizacao?: number
}

export interface RankedItem extends BacklogItemForRanking {
  ganhoNormalizado: number
  scorePriorizacao: number
  posicao: number
}

export function normalizeGain(
  tipoGanho: string,
  valorGanho: number,
  weights: Record<string, number>,
  valorHora = 150.0
): number {
  const peso = weights[tipoGanho] ?? 1.0
  const valorFinanceiro = HOUR_BASED_GAIN_TYPES.has(tipoGanho)
    ? valorGanho * valorHora
    : valorGanho
  return valorFinanceiro * peso
}

export function calculatePrioritizationScore(
  ganhoNormalizado: number,
  esforcoTotal: number
): number {
  if (esforcoTotal === 0) return 0
  return ganhoNormalizado / esforcoTotal
}

export function rankBacklog(
  items: BacklogItemForRanking[],
  weights: Record<string, number>,
  valorHora = 150.0
): RankedItem[] {
  const scored = items.map((item) => {
    const ganhoNormalizado = normalizeGain(item.tipoGanho, item.valorGanho, weights, valorHora)
    const scorePriorizacao = calculatePrioritizationScore(ganhoNormalizado, item.esforcoTotal)
    return { ...item, ganhoNormalizado, scorePriorizacao }
  })

  return scored
    .sort((a, b) => {
      if (a.posicaoManual != null && b.posicaoManual != null) {
        return a.posicaoManual - b.posicaoManual
      }
      if (a.posicaoManual != null) return -1
      if (b.posicaoManual != null) return 1
      return b.scorePriorizacao - a.scorePriorizacao
    })
    .map((item, index) => ({ ...item, posicao: item.posicaoManual ?? index + 1 }))
}
