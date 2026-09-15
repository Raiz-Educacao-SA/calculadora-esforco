import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator, AuthError } from '@/lib/auth'
import { SchedulingError } from '@/lib/services/capacity'
import { schedulingTransaction } from '@/lib/services/scheduling'
import { saveAllocation } from '@/lib/services/allocation'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const funcionarioId = searchParams.get('funcionarioId')

    const where: Record<string, unknown> = {}

    if (funcionarioId) where.funcionarioId = funcionarioId

    if (dataInicio || dataFim) {
      if (dataFim) where.dataInicio = { lte: new Date(`${dataFim.slice(0, 10)}T23:59:59.999Z`) }
      if (dataInicio) where.dataFim = { gte: new Date(`${dataInicio.slice(0, 10)}T00:00:00.000Z`) }
    }

    const alocacoes = await prisma.alocacao.findMany({
      where,
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
      orderBy: [{ dataInicio: 'asc' }, { funcionario: { nome: 'asc' } }],
    })

    return NextResponse.json(alocacoes)
  } catch (error) {
    console.error('[GET /api/alocacoes]', error)
    return NextResponse.json({ error: 'Erro ao listar alocações' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOperator()
    const body = await request.json()
    const alocacao = await schedulingTransaction((tx) => saveAllocation(tx, body))

    return NextResponse.json(alocacao, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError || error instanceof SchedulingError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/alocacoes]', error)
    return NextResponse.json({ error: 'Erro ao criar alocação' }, { status: 500 })
  }
}
