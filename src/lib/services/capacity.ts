/** Business dates are stored as UTC calendar dates, never server-local dates. */
export const HORAS_DIARIAS_ESTAGIARIO = 6
export const DEFAULT_ALLOCATION_CONFIG = { horasDiarias: 8, percentualAlocacao: 80 }
const DAY = 86_400_000
const EPSILON = 1e-8

export class SchedulingError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export function dateOnly(value: string | Date, label = 'Data'): Date {
  if (value instanceof Date && !Number.isFinite(value.getTime())) throw new SchedulingError(`${label} inválida`)
  const source = value instanceof Date ? value.toISOString() : value
  if (typeof source !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(source)) {
    throw new SchedulingError(`${label} inválida`)
  }
  const key = source.slice(0, 10)
  const result = new Date(`${key}T00:00:00.000Z`)
  if (!Number.isFinite(result.getTime()) || result.toISOString().slice(0, 10) !== key) {
    throw new SchedulingError(`${label} inválida`)
  }
  return result
}

export function businessToday(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find((p) => p.type === type)!.value
  return dateOnly(`${part('year')}-${part('month')}-${part('day')}`)
}

export function completionDate(previousStatus: string, nextStatus: string, previous: Date | null, now = new Date()): Date | null {
  if (nextStatus !== 'CONCLUIDO') return null
  return previousStatus === 'CONCLUIDO' ? previous : businessToday(now)
}

export function dailyProjectCapacity(
  funcionario: { estagiario?: boolean; ativo?: boolean },
  config: { horasDiarias: number; percentualAlocacao: number } = DEFAULT_ALLOCATION_CONFIG,
): number {
  if (funcionario.ativo === false) return 0
  return (funcionario.estagiario ? HORAS_DIARIAS_ESTAGIARIO : config.horasDiarias) * config.percentualAlocacao / 100
}

export interface DateRange { dataInicio: string | Date; dataFim: string | Date }
export interface CapacityReservation extends DateRange { horasDiarias: number | null }
export interface ScheduledTask {
  id: string
  dataInicio: string | Date
  esforco: number
  horasDiarias?: number | null
}
export interface CompletedTask extends DateRange { id: string; horasDiarias?: number | null }

/** Equal sharing of remaining capacity, capped by per-activity daily hours.
 * Finished tasks release unused hours within the same day. Fixed reservations
 * are deducted first. Completed activities consume only their historic days.
 */
export function projectCompletionDates({ capacidade, tarefas, reservas = [], ferias = [], concluidas = [] }: {
  capacidade: number
  tarefas: ScheduledTask[]
  reservas?: CapacityReservation[]
  ferias?: DateRange[]
  concluidas?: CompletedTask[]
}): Map<string, Date> {
  const dates = new Map<string, Date>()
  if (!tarefas.length) return dates
  if (!Number.isFinite(capacidade) || capacidade <= 0) throw new SchedulingError('Colaborador sem capacidade disponível para projetos')
  const tasks = tarefas.map((task) => {
    if (!Number.isFinite(task.esforco) || task.esforco <= 0) throw new SchedulingError('Informe um esforço positivo para projetar a previsão')
    if (task.horasDiarias != null && (!Number.isFinite(task.horasDiarias) || task.horasDiarias <= 0)) {
      throw new SchedulingError('Horas diárias da alocação devem ser positivas')
    }
    return { ...task, inicio: dateOnly(task.dataInicio).getTime(), restante: task.esforco }
  })
  const ranges = (items: DateRange[]) => items.map((item) => {
    const inicio = dateOnly(item.dataInicio).getTime()
    const fim = dateOnly(item.dataFim).getTime()
    if (fim < inicio) throw new SchedulingError('Data fim não pode ser anterior à data início')
    return { inicio, fim }
  })
  const vacations = ranges(ferias)
  const bookings = reservas.map((r) => ({ ...ranges([r])[0], horas: r.horasDiarias ?? capacidade }))
  const history = concluidas.map((r) => ({ ...ranges([r])[0], horas: r.horasDiarias ?? capacidade }))
  if ([...bookings, ...history].some((r) => !Number.isFinite(r.horas) || r.horas <= 0)) throw new SchedulingError('Horas diárias da alocação devem ser positivas')
  const start = Math.min(...tasks.map((t) => t.inicio))
  // Bounded to prevent a malformed/near-zero capacity from hanging a request.
  for (let day = start, count = 0; dates.size < tasks.length && count < 36_600; day += DAY, count++) {
    const weekday = new Date(day).getUTCDay()
    if (weekday === 0 || weekday === 6 || vacations.some((v) => v.inicio <= day && v.fim >= day)) continue
    let available = Math.max(0, capacidade - bookings.reduce((total, b) => total + (b.inicio <= day && b.fim >= day ? b.horas : 0), 0))
    const candidates = tasks.filter((t) => t.inicio <= day && t.restante > EPSILON).map((task) => ({
      task, limit: Math.min(task.horasDiarias ?? capacidade, task.restante), used: 0,
    }))
    const past = history.filter((h) => h.inicio <= day && h.fim >= day).map((h) => ({ task: null, limit: h.horas, used: 0 }))
    const all: Array<{ task: typeof tasks[number] | null; limit: number; used: number }> = [...candidates, ...past]
    let pending = all.filter((c) => c.limit > EPSILON)
    while (available > EPSILON && pending.length) {
      const share = available / pending.length
      let consumed = 0
      for (const entry of pending) {
        const hours = Math.min(share, entry.limit - entry.used)
        entry.used += hours
        consumed += hours
      }
      available -= consumed
      pending = pending.filter((c) => c.limit - c.used > EPSILON)
    }
    for (const entry of all) {
      if (!entry.task) continue
      entry.task.restante -= entry.used
      if (entry.task.restante <= EPSILON) dates.set(entry.task.id, new Date(day))
    }
  }
  if (dates.size !== tasks.length) throw new SchedulingError('Não foi possível projetar a conclusão em até 100 anos. Revise esforço e capacidade disponível.')
  return dates
}
