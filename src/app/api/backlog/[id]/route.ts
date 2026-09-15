import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator, AuthError } from '@/lib/auth'
import { SchedulingError, dateOnly, completionDate, dailyProjectCapacity, DEFAULT_ALLOCATION_CONFIG } from '@/lib/services/capacity'
import { schedulingTransaction, reprojectBacklog } from '@/lib/services/scheduling'
import type { Prisma } from '@/generated/prisma/client'
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
        responsavel: { select: { id: true, nome: true, estagiario: true } },
        alocacoes: true,
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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireOperator()
    const { id } = await params
    const body = await request.json()
    const { status, dataInicio, responsavelId, tipoGanho, valorGanho, descricaoPremissa } = body
    const changingGain = tipoGanho !== undefined || valorGanho !== undefined || descricaoPremissa !== undefined
    const updated = await schedulingTransaction(async (tx) => {
      const existing = await tx.backlogItem.findUnique({
        where: { id }, include: { solicitacao: true, alocacoes: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
      })
      if (!existing) throw new SchedulingError('Item de backlog não encontrado', 404)
      if (status !== undefined && !Object.values(BACKLOG_STATUS).includes(status)) throw new SchedulingError('Status inválido')
      if (responsavelId !== undefined && responsavelId !== null && typeof responsavelId !== 'string') throw new SchedulingError('Responsável inválido')
      const nextStatus = status ?? existing.status
      const nextStart = dataInicio !== undefined ? (dataInicio ? dateOnly(dataInicio, 'Data de início') : null) : existing.dataInicio
      const nextResponsible = responsavelId !== undefined ? responsavelId || null : existing.responsavelId ?? existing.alocacoes[0]?.funcionarioId ?? null
      const employee = nextResponsible ? await tx.funcionario.findUnique({ where: { id: nextResponsible } }) : null
      if (nextResponsible && !employee) throw new SchedulingError('Colaborador não encontrado', 404)
      if (responsavelId && !employee?.ativo) throw new SchedulingError('Selecione um colaborador ativo')
      if (nextStatus === 'EM_ANDAMENTO') {
        if (!nextStart) throw new SchedulingError('Informe a data de início para colocar a atividade em andamento')
        if (!employee?.ativo) throw new SchedulingError('Selecione um responsável ativo para colocar a atividade em andamento')
        if (!Number.isFinite(existing.solicitacao.esforcoTotal) || (existing.solicitacao.esforcoTotal ?? 0) <= 0) throw new SchedulingError('A atividade precisa ter esforço positivo para calcular a previsão')
        const config = await tx.alocacaoConfig.findFirst() ?? DEFAULT_ALLOCATION_CONFIG
        if (!(dailyProjectCapacity(employee, config) > 0)) throw new SchedulingError('Colaborador sem capacidade disponível para projetos')
      }
      const completed = completionDate(existing.status, nextStatus, existing.dataConclusao)
      if (completed && nextStart && dateOnly(nextStart) > completed) throw new SchedulingError('A conclusão não pode ser anterior à data de início')
      const updateData: Prisma.BacklogItemUncheckedUpdateInput = {
        status: nextStatus, dataInicio: nextStart, responsavelId: nextResponsible, dataConclusao: completed,
      }
      if (nextStatus !== 'EM_ANDAMENTO' && nextStatus !== 'CONCLUIDO') updateData.previsaoConclusao = null
      if (changingGain) {
        const nextTipoGanho = tipoGanho ?? existing.tipoGanho
        const nextValorGanho = valorGanho !== undefined ? Number(valorGanho) : existing.valorGanho
        if (!Object.values(GAIN_TYPES).includes(nextTipoGanho)) throw new SchedulingError('Tipo de ganho inválido')
        if (!Number.isFinite(nextValorGanho) || nextValorGanho < 0) throw new SchedulingError('Valor de ganho deve ser um número maior ou igual a zero')
        const gainType = nextTipoGanho as GainType
        const gainWeight = await tx.gainWeightConfig.findUnique({ where: { tipoGanho: nextTipoGanho } })
        const hourlyRate = await tx.hourlyRateConfig.findFirst()
        const normalized = normalizeGain(gainType, nextValorGanho,
          { [gainType]: gainWeight?.peso ?? DEFAULT_GAIN_WEIGHTS[gainType] ?? 1 }, hourlyRate?.valorHora ?? DEFAULT_VALOR_HORA)
        Object.assign(updateData, { tipoGanho: gainType, valorGanho: nextValorGanho, unidadeGanho: GAIN_UNITS[gainType],
          ganhoNormalizado: normalized, scorePriorizacao: calculatePrioritizationScore(normalized, existing.solicitacao.esforcoTotal ?? 0) })
        if (descricaoPremissa !== undefined) updateData.descricaoPremissa = descricaoPremissa?.trim() || null
      }
      if (!changingGain && status === undefined && dataInicio === undefined && responsavelId === undefined) throw new SchedulingError('Nenhum campo para atualizar')
      await tx.backlogItem.update({ where: { id }, data: updateData })
      if (nextResponsible !== existing.responsavelId || !['EM_ANDAMENTO', 'CONCLUIDO'].includes(nextStatus)) {
        await tx.alocacao.deleteMany({ where: { backlogItemId: id } })
      } else if (nextStatus === 'CONCLUIDO' && completed) {
        await tx.alocacao.updateMany({ where: { backlogItemId: id }, data: { dataFim: completed } })
      }
      await reprojectBacklog(tx, [existing.responsavelId, nextResponsible, ...existing.alocacoes.map((a) => a.funcionarioId)].filter((value): value is string => !!value))
      const result = await tx.backlogItem.findUnique({ where: { id }, include: { responsavel: true, alocacoes: true } })
      await tx.auditLog.create({ data: {
        entidade: 'BacklogItem', entidadeId: id, acao: 'UPDATE', usuario: session.email,
        dadosAnteriores: JSON.stringify(existing), dadosNovos: JSON.stringify(result),
      } })
      return result
    })
    if (changingGain || status !== undefined) await rebalancePrioritization()
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof AuthError || error instanceof SchedulingError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[PUT /api/backlog/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar item de backlog' }, { status: 500 })
  }
}
