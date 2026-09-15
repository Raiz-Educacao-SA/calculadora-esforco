import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'
import { dailyProjectCapacity, DEFAULT_ALLOCATION_CONFIG, projectCompletionDates } from './capacity'

export type SchedulingTransaction = Prisma.TransactionClient

/** Serializable retries keep simultaneous edits from overbooking one resource. */
export async function schedulingTransaction<T>(operation: (tx: SchedulingTransaction) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 30_000 })
    } catch (error) {
      if (attempt < 2 && typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034') continue
      throw error
    }
  }
}

export async function reprojectBacklog(tx: SchedulingTransaction, funcionarioIds?: string[]): Promise<void> {
  if (funcionarioIds && !funcionarioIds.length) return
  const config = await tx.alocacaoConfig.findFirst() ?? DEFAULT_ALLOCATION_CONFIG
  const employees = await tx.funcionario.findMany({
    where: funcionarioIds ? { id: { in: [...new Set(funcionarioIds)] } } : {},
    include: {
      ferias: true,
      atividades: {
        where: { status: { in: ['EM_ANDAMENTO', 'CONCLUIDO'] } },
        include: { solicitacao: true, alocacoes: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
      },
      alocacoes: { include: { backlogItem: { select: { status: true, responsavelId: true } } } },
    },
  })
  for (const employee of employees) {
    const active = employee.atividades.filter((item) => item.status === 'EM_ANDAMENTO')
    const capacity = dailyProjectCapacity(employee, config)
    const valid = active.filter((item) => item.dataInicio && (item.solicitacao.esforcoTotal ?? 0) > 0 && capacity > 0)
    // Legacy activities may lack scheduling inputs. Never retain a misleading forecast.
    for (const item of active.filter((item) => !valid.includes(item))) {
      await tx.backlogItem.update({ where: { id: item.id }, data: { previsaoConclusao: null } })
    }
    const dates = projectCompletionDates({
      capacidade: capacity,
      tarefas: valid.map((item) => ({
        id: item.id, dataInicio: item.dataInicio!, esforco: item.solicitacao.esforcoTotal!,
        horasDiarias: item.alocacoes.find((a) => a.funcionarioId === employee.id)?.horasDiarias,
      })),
      ferias: employee.ferias,
      reservas: employee.alocacoes.filter((allocation) => {
        const item = allocation.backlogItem
        if (!item) return true
        if (item.status === 'CONCLUIDO' || item.status === 'CANCELADO') return false
        return item.status !== 'EM_ANDAMENTO' || item.responsavelId !== employee.id
      }),
      concluidas: employee.atividades.filter((item) => item.status === 'CONCLUIDO' && item.dataInicio && item.dataConclusao)
        .map((item) => ({
          id: item.id, dataInicio: item.dataInicio!, dataFim: item.dataConclusao!,
          horasDiarias: item.alocacoes.find((a) => a.funcionarioId === employee.id)?.horasDiarias,
        })),
    })
    for (const item of valid) {
      const forecast = dates.get(item.id)!
      await tx.backlogItem.update({ where: { id: item.id }, data: { previsaoConclusao: forecast } })
      const allocation = item.alocacoes.find((a) => a.funcionarioId === employee.id)
      if (allocation) {
        await tx.alocacao.updateMany({
          where: { backlogItemId: item.id, funcionarioId: employee.id },
          data: { dataInicio: item.dataInicio!, dataFim: forecast },
        })
      } else {
        await tx.alocacao.create({ data: {
          backlogItemId: item.id, funcionarioId: employee.id,
          titulo: item.solicitacao.titulo, areaSolicitante: item.solicitacao.areaSolicitante,
          dataInicio: item.dataInicio!, dataFim: forecast, horasDiarias: null,
        } })
      }
    }
  }
}
