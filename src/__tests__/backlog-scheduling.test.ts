import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PUT } from '@/app/api/backlog/[id]/route'
import { saveAllocation } from '@/lib/services/allocation'
import { reprojectBacklog, schedulingTransaction, type SchedulingTransaction } from '@/lib/services/scheduling'
import { dateOnly } from '@/lib/services/capacity'

jest.mock('@/lib/prisma', () => ({ prisma: { $transaction: jest.fn() } }))
jest.mock('@/lib/auth', () => ({ requireOperator: jest.fn(async () => ({ email: 'operator@example.test' })), AuthError: class extends Error {} }))
jest.mock('@/lib/services/prioritization', () => ({
  rebalancePrioritization: jest.fn(), normalizeGain: jest.fn(() => 100), calculatePrioritizationScore: jest.fn(() => 1),
}))

type Employee = { id: string; nome: string; ativo: boolean; estagiario: boolean }
type Activity = {
  id: string; solicitacaoId: string; responsavelId: string | null; status: string; dataInicio: Date | null; previsaoConclusao: Date | null; dataConclusao: Date | null;
  tipoGanho: string; valorGanho: number; solicitacao: { titulo: string; esforcoTotal: number; areaSolicitante: null };
}
type Booking = { id: string; funcionarioId: string; backlogItemId: string | null; titulo: string; dataInicio: Date; dataFim: Date; horasDiarias: number | null }
type Vacation = { funcionarioId: string; dataInicio: Date; dataFim: Date }
let state: { employees: Employee[]; activities: Activity[]; bookings: Booking[]; vacations: Vacation[]; config: { horasDiarias: number; percentualAlocacao: number } }
let tx: SchedulingTransaction
let failAudit = false
const clone = <T>(value: T): T => {
  if (value instanceof Date) return new Date(value.getTime()) as T
  if (Array.isArray(value)) return value.map(clone) as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) as T
  return value
}

function activity(id: string, overrides: Partial<Activity> = {}): Activity {
  return { id, solicitacaoId: `s-${id}`, responsavelId: 'intern', status: 'NAO_INICIADO', dataInicio: null, previsaoConclusao: null, dataConclusao: null,
    tipoGanho: 'REDUCAO_CUSTO', valorGanho: 100, solicitacao: { titulo: id, esforcoTotal: 12, areaSolicitante: null }, ...overrides }
}

/** A transactional in-memory adapter exercises the real API and scheduling services.
 * Rollbacks restore all records, so a failed save cannot leave partial bookings.
 */
function adapter() {
  const linked = (a: Booking) => ({ ...clone(a), backlogItem: clone(state.activities.find((b) => b.id === a.backlogItemId) ?? null) })
  const matches = (a: Booking, where: { id?: string | { not: string }; backlogItemId?: string | { in: string[] }; funcionarioId?: string }) => {
    if (where.id && (typeof where.id === 'string' ? a.id !== where.id : a.id === where.id.not)) return false
    if (where.funcionarioId && a.funcionarioId !== where.funcionarioId) return false
    if (where.backlogItemId && (typeof where.backlogItemId === 'string' ? a.backlogItemId !== where.backlogItemId : !where.backlogItemId.in.includes(a.backlogItemId!))) return false
    return true
  }
  return {
    backlogItem: {
      findUnique: jest.fn(async ({ where }) => {
        const record = state.activities.find((a) => a.id === where.id || a.solicitacaoId === where.solicitacaoId)
        return record ? { ...clone(record), alocacoes: state.bookings.filter((a) => a.backlogItemId === record.id).map(clone), responsavel: clone(state.employees.find((e) => e.id === record.responsavelId)) } : null
      }),
      update: jest.fn(async ({ where, data }) => {
        const record = state.activities.find((a) => a.id === where.id)!
        Object.assign(record, clone(data)); return clone(record)
      }),
    },
    funcionario: {
      findUnique: jest.fn(async ({ where }) => clone(state.employees.find((e) => e.id === where.id) ?? null)),
      findMany: jest.fn(async ({ where }) => state.employees.filter((e) => !where.id || where.id.in.includes(e.id)).map((e) => ({
        ...clone(e), ferias: state.vacations.filter((v) => v.funcionarioId === e.id).map(clone),
        atividades: state.activities.filter((a) => a.responsavelId === e.id && ['EM_ANDAMENTO', 'CONCLUIDO'].includes(a.status)).map((a) => ({
          ...clone(a), alocacoes: state.bookings.filter((b) => b.backlogItemId === a.id).map(clone),
        })),
        alocacoes: state.bookings.filter((a) => a.funcionarioId === e.id).map(linked),
      }))),
    },
    alocacao: {
      findFirst: jest.fn(async ({ where }) => clone(state.bookings.find((a) => matches(a, where)) ?? null)),
      findUnique: jest.fn(async ({ where }) => {
        const record = state.bookings.find((a) => a.id === where.id)
        return record ? linked(record) : null
      }),
      findMany: jest.fn(async ({ where }) => state.bookings.filter((a) => matches(a, where) && (!where.OR || a.backlogItemId !== where.OR[1].backlogItemId.not)).map(linked)),
      create: jest.fn(async ({ data }) => { const record = { ...clone(data), id: `booking-${state.bookings.length + 1}` }; state.bookings.push(record); return clone(record) }),
      update: jest.fn(async ({ where, data }) => { const record = state.bookings.find((a) => a.id === where.id)!; Object.assign(record, clone(data)); return clone(record) }),
      updateMany: jest.fn(async ({ where, data }) => { for (const record of state.bookings.filter((a) => matches(a, where))) Object.assign(record, clone(data)); return { count: 1 } }),
      deleteMany: jest.fn(async ({ where }) => { state.bookings = state.bookings.filter((a) => !matches(a, where)); return { count: 1 } }),
    },
    ferias: { findMany: jest.fn(async ({ where }) => clone(state.vacations.filter((v) => v.funcionarioId === where.funcionarioId))) },
    solicitacao: { findUnique: jest.fn(async ({ where }) => clone(state.activities.find((a) => a.solicitacaoId === where.id)?.solicitacao)) },
    alocacaoConfig: { findFirst: jest.fn(async () => clone(state.config)) },
    auditLog: { create: jest.fn(async () => { if (failAudit) throw new Error('Injected storage failure'); return {} }) },
  } as unknown as SchedulingTransaction
}

const put = (body: object, id = 'a') => PUT(new NextRequest('http://localhost/api/backlog/a', { method: 'PUT', body: JSON.stringify(body) }), { params: Promise.resolve({ id }) })
const forecast = (id = 'a') => state.activities.find((a) => a.id === id)?.previsaoConclusao?.toISOString().slice(0, 10)

beforeEach(() => {
  state = { employees: [
    { id: 'intern', nome: 'Estagiário', ativo: true, estagiario: true },
    { id: 'full', nome: 'Profissional', ativo: true, estagiario: false },
  ], activities: [activity('a')], bookings: [], vacations: [], config: { horasDiarias: 8, percentualAlocacao: 50 } }
  failAudit = false
  tx = adapter()
  jest.mocked(prisma.$transaction).mockImplementation((async (operation: (client: SchedulingTransaction) => Promise<unknown>) => {
    const before = clone(state)
    try { return await operation(tx) } catch (error) { state = before; throw error }
  }) as typeof prisma.$transaction)
})

describe('transições do backlog e sincronização transacional', () => {
  it('exige início e responsável válidos antes de alterar status ou alocações', async () => {
    expect((await put({ status: 'EM_ANDAMENTO' })).status).toBe(400)
    expect((await put({ status: 'EM_ANDAMENTO', dataInicio: '2026-09-14', responsavelId: 'missing' })).status).toBe(404)
    expect(state.activities[0].status).toBe('NAO_INICIADO')
    expect(state.bookings).toHaveLength(0)
  })

  it('persiste responsável antes do início e calcula a previsão ignorando uma data manual enviada pelo cliente', async () => {
    expect((await put({ responsavelId: 'full' })).status).toBe(200)
    expect(state.activities[0].responsavelId).toBe('full')
    expect(state.bookings).toHaveLength(0)
    expect((await put({ status: 'EM_ANDAMENTO', dataInicio: '2026-09-14', previsaoConclusao: '2099-01-01' })).status).toBe(200)
    expect(forecast()).toBe('2026-09-16')
    expect(state.bookings[0].dataFim).toEqual(dateOnly('2026-09-16'))
  })

  it('recalcula as duas tarefas ao iniciar demanda paralela e não duplica alocação em novo salvamento', async () => {
    await put({ status: 'EM_ANDAMENTO', dataInicio: '2026-09-14' })
    expect(forecast()).toBe('2026-09-17')
    state.activities.push(activity('b'))
    await put({ status: 'EM_ANDAMENTO', dataInicio: '2026-09-14' }, 'b')
    expect(forecast()).toBe('2026-09-23')
    expect(forecast('b')).toBe('2026-09-23')
    await put({ status: 'EM_ANDAMENTO' })
    expect(state.bookings).toHaveLength(2)
    expect(forecast()).toBe('2026-09-23')
  })

  it('recalcula ambas as equipes ao trocar responsável e sincroniza a data de início sem criar conflito com a própria alocação', async () => {
    state.activities.push(activity('b'))
    await put({ status: 'EM_ANDAMENTO', dataInicio: '2026-09-14' })
    await put({ status: 'EM_ANDAMENTO', dataInicio: '2026-09-14' }, 'b')
    await put({ responsavelId: 'full', dataInicio: '2026-09-15' })
    expect(forecast()).toBe('2026-09-17')
    expect(forecast('b')).toBe('2026-09-17')
    const booking = state.bookings.find((a) => a.backlogItemId === 'a')!
    expect(booking.funcionarioId).toBe('full')
    expect(booking.dataInicio).toEqual(dateOnly('2026-09-15'))
  })

  it('grava conclusão uma vez, atualiza fim real e limpa data ao reabrir', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-16T01:00:00Z'))
    try {
      await put({ status: 'EM_ANDAMENTO', dataInicio: '2026-09-14' })
      expect((await put({ status: 'CONCLUIDO' })).status).toBe(200)
      expect(state.activities[0].dataConclusao).toEqual(dateOnly('2026-09-15'))
      expect(state.bookings[0].dataFim).toEqual(dateOnly('2026-09-15'))
      jest.setSystemTime(new Date('2026-09-20T15:00:00Z'))
      await put({ status: 'CONCLUIDO' })
      expect(state.activities[0].dataConclusao).toEqual(dateOnly('2026-09-15'))
      await put({ status: 'EM_ANDAMENTO', dataInicio: '2026-09-21' })
      expect(state.activities[0].dataConclusao).toBeNull()
      expect(forecast()).toBe('2026-09-24')
    } finally { jest.useRealTimers() }
  })

  it('reverte status, datas e reserva caso o armazenamento falhe após o cálculo', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {})
    failAudit = true
    try {
      expect((await put({ status: 'EM_ANDAMENTO', dataInicio: '2026-09-14' })).status).toBe(500)
      expect(state.activities[0].status).toBe('NAO_INICIADO')
      expect(state.activities[0].previsaoConclusao).toBeNull()
      expect(state.bookings).toHaveLength(0)
    } finally { log.mockRestore() }
  })

  it('recalcula por férias e novas configurações e conserva dados de atividades legadas incompletas', async () => {
    await put({ status: 'EM_ANDAMENTO', dataInicio: '2026-09-14' })
    state.config.percentualAlocacao = 100
    state.vacations.push({ funcionarioId: 'intern', dataInicio: dateOnly('2026-09-15'), dataFim: dateOnly('2026-09-16') })
    await reprojectBacklog(tx, ['intern'])
    expect(forecast()).toBe('2026-09-17')
    state.activities[0].dataInicio = null
    await reprojectBacklog(tx, ['intern'])
    expect(forecast()).toBeUndefined()
    expect(state.bookings).toHaveLength(1)
  })
})

describe('reservas e capacidade de alocações', () => {
  const reservation = (overrides: object = {}) => ({ funcionarioId: 'intern', titulo: 'Reserva', dataInicio: '2026-09-14', dataFim: '2026-09-15', horasDiarias: 2, ...overrides })

  it('recusa horas acima da jornada do estagiário ou soma acima da capacidade diária', async () => {
    await expect(saveAllocation(tx, reservation({ horasDiarias: 4 }))).rejects.toThrow('3 h/dia')
    await saveAllocation(tx, reservation())
    await expect(saveAllocation(tx, reservation())).rejects.toThrow('excede a capacidade')
    expect(state.bookings).toHaveLength(1)
  })

  it('desconta reservas fixas de tarefas em andamento e libera capacidade ao editar a própria reserva', async () => {
    await put({ status: 'EM_ANDAMENTO', dataInicio: '2026-09-14' })
    const booking = await saveAllocation(tx, reservation())
    expect(forecast()).toBe('2026-09-21')
    await saveAllocation(tx, { horasDiarias: 1 }, booking!.id)
    expect(forecast()).toBe('2026-09-18')
  })

  it('não duplica a alocação e atualiza previsões de ambos colaboradores ao transferir via POST de alocação', async () => {
    state.activities.push(activity('b'))
    await put({ status: 'EM_ANDAMENTO', dataInicio: '2026-09-14' })
    await put({ status: 'EM_ANDAMENTO', dataInicio: '2026-09-14' }, 'b')
    await saveAllocation(tx, reservation({ backlogItemId: 'a', funcionarioId: 'full', horasDiarias: null, dataFim: '2099-01-01' }))
    expect(state.bookings).toHaveLength(2)
    expect(forecast()).toBe('2026-09-16')
    expect(forecast('b')).toBe('2026-09-17')
  })

  it('recusa reservas em férias e intervalos invertidos sem alterar dados', async () => {
    state.vacations.push({ funcionarioId: 'intern', dataInicio: dateOnly('2026-09-14'), dataFim: dateOnly('2026-09-15') })
    await expect(saveAllocation(tx, reservation())).rejects.toThrow('férias')
    await expect(saveAllocation(tx, reservation({ dataFim: '2026-09-13' }))).rejects.toThrow('anterior')
    expect(state.bookings).toHaveLength(0)
  })
})

it('repete uma transação abortada por concorrência serializável', async () => {
  jest.mocked(prisma.$transaction).mockRejectedValueOnce({ code: 'P2034' })
  const operation = jest.fn(async () => 'ok')
  await expect(schedulingTransaction(operation)).resolves.toBe('ok')
  expect(operation).toHaveBeenCalledTimes(1)
})
