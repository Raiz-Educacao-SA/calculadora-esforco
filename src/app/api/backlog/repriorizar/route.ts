import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, requireOperator } from '@/lib/auth'
import { logAudit } from '@/lib/services/audit'
import { rebalancePrioritization } from '@/lib/services/prioritization'

const INACTIVE_BACKLOG_STATUSES = ['CONCLUIDO', 'CANCELADO']

function cleanRequired(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOperator()
    const body: unknown = await request.json()
    const payload = body as Record<string, unknown>
    const orderedIds: unknown[] = Array.isArray(payload.orderedIds) ? payload.orderedIds : []
    const solicitantePriorizacao = cleanRequired(payload.solicitantePriorizacao)
    const justificativa = cleanRequired(payload.justificativa)
    const responsavelRepriorizacao = cleanRequired(payload.responsavelRepriorizacao)

    if (orderedIds.length < 2 || orderedIds.some((id) => typeof id !== 'string' || !id)) {
      return NextResponse.json(
        { error: 'orderedIds deve conter ao menos dois itens validos' },
        { status: 400 }
      )
    }

    if (!solicitantePriorizacao || !justificativa || !responsavelRepriorizacao) {
      return NextResponse.json(
        { error: 'Solicitante, justificativa e responsavel pela repriorizacao sao obrigatorios' },
        { status: 400 }
      )
    }

    const backlogItemIds = orderedIds as string[]
    const uniqueIds = Array.from(new Set(backlogItemIds))
    if (uniqueIds.length !== backlogItemIds.length) {
      return NextResponse.json({ error: 'A lista de itens contem duplicidades' }, { status: 400 })
    }

    const items = await prisma.backlogItem.findMany({
      where: { id: { in: backlogItemIds } },
      select: { id: true, status: true, posicaoManual: true },
    })

    if (items.length !== backlogItemIds.length) {
      return NextResponse.json({ error: 'Um ou mais itens do backlog nao foram encontrados' }, { status: 404 })
    }

    const inactive = items.find((item) => INACTIVE_BACKLOG_STATUSES.includes(item.status))
    if (inactive) {
      return NextResponse.json(
        { error: 'Itens concluidos ou cancelados nao podem ser repriorizados' },
        { status: 400 }
      )
    }

    const previousById = new Map(items.map((item) => [item.id, item.posicaoManual]))
    const positions = items
      .map((item) => item.posicaoManual)
      .filter((pos): pos is number => typeof pos === 'number')
      .sort((a, b) => a - b)

    if (positions.length !== backlogItemIds.length) {
      await rebalancePrioritization()
      return NextResponse.json(
        { error: 'Ranking inicializado. Tente arrastar novamente.' },
        { status: 409 }
      )
    }

    const changes = backlogItemIds
      .map((id, index) => ({
        id,
        previousPosition: previousById.get(id) ?? null,
        nextPosition: positions[index],
      }))
      .filter((change) => change.previousPosition !== change.nextPosition)

    if (changes.length === 0) {
      return NextResponse.json({ message: 'Ordem sem alteracoes' })
    }

    await prisma.$transaction(async (tx) => {
      for (const change of changes) {
        await tx.backlogItem.update({
          where: { id: change.id },
          data: { posicaoManual: change.nextPosition },
        })

        await tx.backlogReprioritizacao.create({
          data: {
            backlogItemId: change.id,
            posicaoAnterior: change.previousPosition,
            posicaoNova: change.nextPosition,
            solicitantePriorizacao,
            justificativa,
            responsavelRepriorizacao,
          },
        })
      }
    })

    await rebalancePrioritization()

    await logAudit({
      entidade: 'BacklogItem',
      entidadeId: changes.map((change) => change.id).join(','),
      acao: 'REPRIORITIZE',
      dadosAnteriores: changes.map((change) => ({
        id: change.id,
        posicaoManual: change.previousPosition,
      })),
      dadosNovos: {
        solicitantePriorizacao,
        justificativa,
        responsavelRepriorizacao,
        alteracoes: changes.map((change) => ({
          id: change.id,
          posicaoManual: change.nextPosition,
        })),
      },
      usuario: session.email,
    })

    return NextResponse.json({ message: 'Backlog repriorizado com sucesso', changes })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/backlog/repriorizar]', error)
    return NextResponse.json({ error: 'Erro ao repriorizar backlog' }, { status: 500 })
  }
}
