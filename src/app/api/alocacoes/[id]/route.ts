import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator, AuthError } from '@/lib/auth'
import { SchedulingError } from '@/lib/services/capacity'
import { reprojectBacklog, schedulingTransaction } from '@/lib/services/scheduling'
import { saveAllocation } from '@/lib/services/allocation'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const alocacao = await prisma.alocacao.findUnique({
      where: { id },
      include: {
        funcionario: { select: { id: true, nome: true, cargo: true, estagiario: true } },
        backlogItem: {
          select: {
            id: true, status: true, dataInicio: true, previsaoConclusao: true, dataConclusao: true,
            solicitacao: {
              select: {
                titulo: true,
                areaSolicitante: true,
                area: { select: { nome: true } },
              },
            },
          },
        },
      },
    })
    if (!alocacao) {
      return NextResponse.json({ error: 'Alocação não encontrada' }, { status: 404 })
    }
    return NextResponse.json(alocacao)
  } catch (error) {
    console.error('[GET /api/alocacoes/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar alocação' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireOperator()
    const { id } = await params
    const body = await request.json()
    const alocacao = await schedulingTransaction((tx) => saveAllocation(tx, body, id))

    return NextResponse.json(alocacao)
  } catch (error) {
    if (error instanceof AuthError || error instanceof SchedulingError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PUT /api/alocacoes/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar alocação' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireOperator()
    const { id } = await params

    await schedulingTransaction(async (tx) => {
      const existing = await tx.alocacao.findUnique({ where: { id }, include: { backlogItem: true } })
      if (!existing) throw new SchedulingError('Alocação não encontrada', 404)
      if (existing.backlogItem?.status === 'EM_ANDAMENTO') throw new SchedulingError('Altere o responsável ou status da atividade em andamento pelo backlog antes de excluir a alocação')
      await tx.alocacao.delete({ where: { id } })
      if (existing.backlogItemId && existing.backlogItem?.status !== 'CONCLUIDO') {
        await tx.backlogItem.update({ where: { id: existing.backlogItemId }, data: { responsavelId: null, previsaoConclusao: null } })
      }
      await reprojectBacklog(tx, [existing.funcionarioId])
    })

    return NextResponse.json({ message: 'Alocação excluída com sucesso' })
  } catch (error) {
    if (error instanceof AuthError || error instanceof SchedulingError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/alocacoes/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir alocação' }, { status: 500 })
  }
}
