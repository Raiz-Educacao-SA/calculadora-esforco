import type { Prisma } from '@/generated/prisma/client'
import { dateOnly, dailyProjectCapacity, DEFAULT_ALLOCATION_CONFIG, SchedulingError } from './capacity'
import { reprojectBacklog, type SchedulingTransaction } from './scheduling'

export async function saveAllocation(tx: SchedulingTransaction, body: Record<string, unknown>, id?: string) {
  const previous = id ? await tx.alocacao.findUnique({ where: { id }, include: { backlogItem: true } }) : null
  if (id && !previous) throw new SchedulingError('Alocação não encontrada', 404)
  const funcionarioId = body.funcionarioId !== undefined ? body.funcionarioId : previous?.funcionarioId
  const backlogItemId = body.backlogItemId !== undefined ? body.backlogItemId || null : previous?.backlogItemId ?? null
  if (typeof funcionarioId !== 'string' || !funcionarioId) throw new SchedulingError('Selecione um colaborador')
  if (backlogItemId !== null && typeof backlogItemId !== 'string') throw new SchedulingError('Atividade inválida')
  const employee = await tx.funcionario.findUnique({ where: { id: funcionarioId } })
  if (!employee?.ativo) throw new SchedulingError('Selecione um colaborador ativo')
  const backlog = backlogItemId ? await tx.backlogItem.findUnique({ where: { id: backlogItemId } }) : null
  if (backlogItemId && !backlog) throw new SchedulingError('Atividade não encontrada', 404)
  if (backlog && ['CONCLUIDO', 'CANCELADO'].includes(backlog.status)) throw new SchedulingError('Não é possível alocar uma atividade concluída ou cancelada')
  if (previous?.backlogItem?.status === 'EM_ANDAMENTO' && backlogItemId !== previous.backlogItemId) {
    throw new SchedulingError('Altere o responsável ou status da atividade em andamento pelo backlog antes de desvincular a alocação')
  }
  const titulo = body.titulo !== undefined ? body.titulo : previous?.titulo
  if (typeof titulo !== 'string' || !titulo.trim()) throw new SchedulingError('Título é obrigatório')
  const inicioValue = body.dataInicio ?? previous?.dataInicio
  const fimValue = body.dataFim ?? previous?.dataFim ?? inicioValue
  if (!(typeof inicioValue === 'string' || inicioValue instanceof Date) || !(typeof fimValue === 'string' || fimValue instanceof Date)) throw new SchedulingError('Data início e data fim são obrigatórias')
  const dataInicio = dateOnly(inicioValue, 'Data de início')
  const dataFim = backlog?.status === 'EM_ANDAMENTO' ? dataInicio : dateOnly(fimValue, 'Data de fim')
  if (dataFim < dataInicio) throw new SchedulingError('Data fim não pode ser anterior à data início')
  const hoursValue = body.horasDiarias !== undefined ? body.horasDiarias : previous?.horasDiarias ?? null
  const horasDiarias = hoursValue === null ? null : Number(hoursValue)
  const config = await tx.alocacaoConfig.findFirst() ?? DEFAULT_ALLOCATION_CONFIG
  const capacity = dailyProjectCapacity(employee, config)
  if (!Number.isFinite(capacity) || capacity <= 0) throw new SchedulingError('Colaborador sem capacidade disponível para projetos')
  if (horasDiarias !== null && (!Number.isFinite(horasDiarias) || horasDiarias <= 0 || horasDiarias > capacity)) {
    throw new SchedulingError(`Horas diárias devem ser positivas e não ultrapassar a capacidade de ${Number(capacity.toFixed(2))} h/dia deste colaborador`)
  }
  if (backlog?.status !== 'EM_ANDAMENTO') {
    const reservations = await tx.alocacao.findMany({
      where: { funcionarioId, dataInicio: { lte: new Date(dataFim.getTime() + 86_399_999) }, dataFim: { gte: dataInicio },
        ...(id ? { id: { not: id } } : {}),
        ...(backlogItemId ? { OR: [{ backlogItemId: null }, { backlogItemId: { not: backlogItemId } }] } : {}),
      },
      include: { backlogItem: { select: { status: true, responsavelId: true } } },
    })
    const vacations = await tx.ferias.findMany({ where: { funcionarioId, dataInicio: { lte: new Date(dataFim.getTime() + 86_399_999) }, dataFim: { gte: dataInicio } } })
    const fixed = reservations.filter((reservation) => {
      const item = reservation.backlogItem
      return !item || (!['CONCLUIDO', 'CANCELADO'].includes(item.status) && (item.status !== 'EM_ANDAMENTO' || item.responsavelId !== funcionarioId))
    })
    if (dataFim.getTime() - dataInicio.getTime() > 36_600 * 86_400_000) throw new SchedulingError('Período de alocação deve ser menor que 100 anos')
    for (let day = dataInicio.getTime(); day <= dataFim.getTime(); day += 86_400_000) {
      if ([0, 6].includes(new Date(day).getUTCDay())) continue
      if (vacations.some((vacation) => dateOnly(vacation.dataInicio).getTime() <= day && dateOnly(vacation.dataFim).getTime() >= day)) {
        throw new SchedulingError(`Colaborador em férias em ${new Date(day).toISOString().slice(0, 10)}`)
      }
      const reserved = fixed.reduce((sum, reservation) => sum + (
        dateOnly(reservation.dataInicio).getTime() <= day && dateOnly(reservation.dataFim).getTime() >= day ? reservation.horasDiarias ?? capacity : 0
      ), 0)
      if (reserved + (horasDiarias ?? capacity) > capacity + 1e-8) throw new SchedulingError(`Alocação excede a capacidade disponível em ${new Date(day).toISOString().slice(0, 10)}`)
    }
  }
  if (backlog?.status === 'EM_ANDAMENTO') {
    const request = await tx.solicitacao.findUnique({ where: { id: backlog.solicitacaoId } })
    if (!request?.esforcoTotal || request.esforcoTotal <= 0) throw new SchedulingError('A atividade precisa ter esforço positivo para calcular a previsão')
  }
  const data: Prisma.AlocacaoUncheckedCreateInput = {
    funcionarioId, backlogItemId, titulo: titulo.trim(), dataInicio, dataFim, horasDiarias,
    areaSolicitante: body.areaSolicitante !== undefined ? String(body.areaSolicitante ?? '').trim() || null : previous?.areaSolicitante,
    cor: body.cor !== undefined ? String(body.cor ?? '').trim() || null : previous?.cor,
  }
  // The backlog has one responsible collaborator; reuse its existing booking.
  const linked = !id && backlogItemId ? await tx.alocacao.findFirst({ where: { backlogItemId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }) : null
  const targetId = id ?? linked?.id
  const saved = targetId ? await tx.alocacao.update({ where: { id: targetId }, data }) : await tx.alocacao.create({ data })
  if (backlogItemId) {
    await tx.alocacao.deleteMany({ where: { backlogItemId, id: { not: saved.id } } })
    await tx.backlogItem.update({ where: { id: backlogItemId }, data: {
      responsavelId: funcionarioId, dataInicio,
      ...(backlog?.status !== 'EM_ANDAMENTO' ? { previsaoConclusao: dataFim } : {}),
    } })
  }
  if (previous?.backlogItemId && previous.backlogItemId !== backlogItemId) {
    await tx.backlogItem.update({ where: { id: previous.backlogItemId }, data: { responsavelId: null, previsaoConclusao: null } })
  }
  await reprojectBacklog(tx, [funcionarioId, previous?.funcionarioId, linked?.funcionarioId, backlog?.responsavelId].filter((value): value is string => !!value))
  return tx.alocacao.findUnique({ where: { id: saved.id }, include: {
    funcionario: { select: { id: true, nome: true, cargo: true, estagiario: true } },
    backlogItem: { select: { status: true, dataInicio: true, previsaoConclusao: true, dataConclusao: true } },
  } })
}
