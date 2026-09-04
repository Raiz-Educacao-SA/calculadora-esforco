import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/services/audit'
import { BACKLOG_STATUS } from '@/lib/config/status'
import { DEFAULT_GAIN_WEIGHTS, DEFAULT_VALOR_HORA, GAIN_TYPES, GAIN_UNITS, type GainType } from '@/lib/config/gain-weights'
import { calculatePrioritizationScore, normalizeGain, rebalancePrioritization } from '@/lib/services/prioritization'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const item = await prisma.backlogItem.findUnique({
      where: { id },
      include: {
        solicitacao: {
          include: {
            area: true,
            criterios: {
              include: {
                criterio: true,
                complexidade: true,
              },
            },
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item de backlog não encontrado' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('[GET /api/backlog/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar item de backlog' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.backlogItem.findUnique({
      where: { id },
      include: {
        solicitacao: { select: { titulo: true, areaSolicitante: true, esforcoTotal: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Item de backlog não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const {
      status,
      dataInicio,
      previsaoConclusao,
      responsavelId,
      tipoGanho,
      valorGanho,
      descricaoPremissa,
    } = body

    const updateData: Record<string, unknown> = {}
    const changingGain =
      tipoGanho !== undefined ||
      valorGanho !== undefined ||
      descricaoPremissa !== undefined

    if (status) {
      const validStatuses = Object.values(BACKLOG_STATUS)
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Status inválido', valid: validStatuses },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    if (dataInicio !== undefined) {
      updateData.dataInicio = dataInicio ? new Date(dataInicio) : null
    }

    if (previsaoConclusao !== undefined) {
      updateData.previsaoConclusao = previsaoConclusao ? new Date(previsaoConclusao) : null
    }

    if (changingGain) {
      const nextTipoGanho = tipoGanho ?? existing.tipoGanho
      const nextValorGanho = valorGanho !== undefined ? Number(valorGanho) : existing.valorGanho

      if (!Object.values(GAIN_TYPES).includes(nextTipoGanho)) {
        return NextResponse.json(
          { error: 'Tipo de ganho invalido', valid: Object.values(GAIN_TYPES) },
          { status: 400 }
        )
      }
      const validTipoGanho = nextTipoGanho as GainType

      if (!Number.isFinite(nextValorGanho) || nextValorGanho < 0) {
        return NextResponse.json(
          { error: 'Valor de ganho deve ser um numero maior ou igual a zero' },
          { status: 400 }
        )
      }

      const gainWeightConfig = await prisma.gainWeightConfig.findUnique({
        where: { tipoGanho: nextTipoGanho },
      })
      const hourlyRateConfig = await prisma.hourlyRateConfig.findFirst()
      const gainWeight = gainWeightConfig?.peso ?? DEFAULT_GAIN_WEIGHTS[validTipoGanho] ?? 1.0
      const valorHora = hourlyRateConfig?.valorHora ?? DEFAULT_VALOR_HORA
      const ganhoNormalizado = normalizeGain(
        validTipoGanho,
        nextValorGanho,
        { [validTipoGanho]: gainWeight },
        valorHora
      )
      const scorePriorizacao = calculatePrioritizationScore(
        ganhoNormalizado,
        existing.solicitacao?.esforcoTotal ?? 0
      )

      updateData.tipoGanho = validTipoGanho
      updateData.valorGanho = nextValorGanho
      updateData.unidadeGanho = GAIN_UNITS[validTipoGanho]
      updateData.ganhoNormalizado = ganhoNormalizado
      updateData.scorePriorizacao = scorePriorizacao

      if (descricaoPremissa !== undefined) {
        updateData.descricaoPremissa = descricaoPremissa?.trim() || null
      }
    }

    // responsavelId: '' means clear, a valid id means assign
    const changingResponsavel = responsavelId !== undefined

    if (Object.keys(updateData).length === 0 && !changingResponsavel) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const updated = Object.keys(updateData).length > 0
      ? await prisma.backlogItem.update({ where: { id }, data: updateData })
      : existing

    if (Object.keys(updateData).length > 0) {
      await logAudit({
        entidade: 'BacklogItem',
        entidadeId: id,
        acao: 'UPDATE',
        dadosAnteriores: {
          status: existing.status,
          dataInicio: existing.dataInicio,
          previsaoConclusao: existing.previsaoConclusao,
          tipoGanho: existing.tipoGanho,
          valorGanho: existing.valorGanho,
          unidadeGanho: existing.unidadeGanho,
          descricaoPremissa: existing.descricaoPremissa,
          ganhoNormalizado: existing.ganhoNormalizado,
          scorePriorizacao: existing.scorePriorizacao,
        },
        dadosNovos: updateData,
      })
    }

    // Handle auto-allocation when responsavelId changes
    if (changingResponsavel) {
      // Determine the effective dates for the allocation
      const efectivaInicio = updateData.dataInicio !== undefined
        ? (updateData.dataInicio as Date | null)
        : existing.dataInicio
      const efectivaFim = updateData.previsaoConclusao !== undefined
        ? (updateData.previsaoConclusao as Date | null)
        : existing.previsaoConclusao

      // Remove all existing allocations for this backlog item
      await prisma.alocacao.deleteMany({ where: { backlogItemId: id } })

      if (responsavelId && efectivaInicio && efectivaFim) {
        // Validate funcionario exists
        const funcionario = await prisma.funcionario.findUnique({ where: { id: responsavelId } })
        if (!funcionario) {
          return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 })
        }

        const titulo = existing.solicitacao?.titulo ?? 'Demanda do Backlog'
        const areaSolicitante = existing.solicitacao?.areaSolicitante ?? null

        await prisma.alocacao.create({
          data: {
            funcionarioId: responsavelId,
            backlogItemId: id,
            titulo,
            dataInicio: efectivaInicio,
            dataFim: efectivaFim,
            areaSolicitante,
          },
        })

        await logAudit({
          entidade: 'Alocacao',
          entidadeId: id,
          acao: 'AUTO_CREATE',
          dadosNovos: { funcionarioId: responsavelId, backlogItemId: id, dataInicio: efectivaInicio, dataFim: efectivaFim },
        })
      }
      // If responsavelId is set but dates are missing, no allocation is created;
      // the user should set dates so the allocation can be generated.
    } else if (Object.keys(updateData).length > 0) {
      // Dates changed without responsavel change — sync existing allocations linked to this backlog item
      const syncData: Record<string, Date> = {}
      if (updateData.dataInicio instanceof Date) syncData.dataInicio = updateData.dataInicio
      if (updateData.previsaoConclusao instanceof Date) syncData.previsaoConclusao = updateData.previsaoConclusao as Date

      if (Object.keys(syncData).length > 0) {
        const alocacoesUpdate: Record<string, Date> = {}
        if (syncData.dataInicio) alocacoesUpdate.dataInicio = syncData.dataInicio
        if (syncData.previsaoConclusao) alocacoesUpdate.dataFim = syncData.previsaoConclusao
        if (Object.keys(alocacoesUpdate).length > 0) {
          await prisma.alocacao.updateMany({
            where: { backlogItemId: id },
            data: alocacoesUpdate,
          })
        }
      }
    }

    if (changingGain || (status && ['EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'].includes(status))) {
      await rebalancePrioritization()
      const rebalanced = await prisma.backlogItem.findUnique({ where: { id } })
      return NextResponse.json(rebalanced)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/backlog/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar item de backlog' }, { status: 500 })
  }
}
