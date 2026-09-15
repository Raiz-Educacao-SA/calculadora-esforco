import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, AuthError } from '@/lib/auth'
import { logAudit } from '@/lib/services/audit'
import { reprojectBacklog, schedulingTransaction } from '@/lib/services/scheduling'
import { HORAS_DIARIAS_ESTAGIARIO, SchedulingError } from '@/lib/services/capacity'

const DEFAULT_PERCENTUAL_ALOCACAO = 80.0
const DEFAULT_HORAS_DIARIAS = 8.0

export async function GET() {
  try {
    const config = await prisma.alocacaoConfig.findFirst()
    return NextResponse.json({
      horasDiariasEstagiario: HORAS_DIARIAS_ESTAGIARIO,
      percentualAlocacao: config?.percentualAlocacao ?? DEFAULT_PERCENTUAL_ALOCACAO,
      horasDiarias: config?.horasDiarias ?? DEFAULT_HORAS_DIARIAS,
    })
  } catch (error) {
    console.error('[GET /api/parametrizacao/alocacao-config]', error)
    return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { percentualAlocacao, horasDiarias } = body

    if (
      percentualAlocacao === undefined ||
      percentualAlocacao === null ||
      typeof percentualAlocacao !== 'number' ||
      !Number.isFinite(percentualAlocacao) ||
      percentualAlocacao <= 0 ||
      percentualAlocacao > 100
    ) {
      return NextResponse.json(
        { error: 'percentualAlocacao deve ser um número entre 1 e 100' },
        { status: 400 }
      )
    }

    if (
      horasDiarias === undefined ||
      horasDiarias === null ||
      typeof horasDiarias !== 'number' ||
      !Number.isFinite(horasDiarias) ||
      horasDiarias > 24 ||
      horasDiarias <= 0
    ) {
      return NextResponse.json(
        { error: 'horasDiarias deve ser um número positivo' },
        { status: 400 }
      )
    }

    const { config, existing } = await schedulingTransaction(async (tx) => {
      const existing = await tx.alocacaoConfig.findFirst()
      const config = existing
        ? await tx.alocacaoConfig.update({ where: { id: existing.id }, data: { percentualAlocacao, horasDiarias } })
        : await tx.alocacaoConfig.create({ data: { percentualAlocacao, horasDiarias } })
      await reprojectBacklog(tx)
      return { config, existing }
    })

    await logAudit({
      entidade: 'AlocacaoConfig',
      entidadeId: config.id,
      acao: existing ? 'UPDATE' : 'CREATE',
      dadosAnteriores: existing
        ? { percentualAlocacao: existing.percentualAlocacao, horasDiarias: existing.horasDiarias }
        : undefined,
      dadosNovos: { percentualAlocacao: config.percentualAlocacao, horasDiarias: config.horasDiarias },
      usuario: session.email,
    })

    return NextResponse.json({
      horasDiariasEstagiario: HORAS_DIARIAS_ESTAGIARIO,
      percentualAlocacao: config.percentualAlocacao,
      horasDiarias: config.horasDiarias,
    })
  } catch (error) {
    if (error instanceof AuthError || error instanceof SchedulingError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PUT /api/parametrizacao/alocacao-config]', error)
    return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 })
  }
}
