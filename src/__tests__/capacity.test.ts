import { businessToday, completionDate, dailyProjectCapacity, dateOnly, projectCompletionDates, SchedulingError } from '@/lib/services/capacity'

const task = (id: string, esforco: number, dataInicio = '2026-09-14', horasDiarias?: number) => ({ id, esforco, dataInicio, horasDiarias })
const day = (dates: Map<string, Date>, id = 'a') => dates.get(id)?.toISOString().slice(0, 10)

describe('capacidade individual e previsão por calendário', () => {
  it('aplica a alocação à jornada de seis horas do estagiário e à jornada parametrizada do profissional', () => {
    const config = { horasDiarias: 8, percentualAlocacao: 50 }
    expect(dailyProjectCapacity({ estagiario: true }, config)).toBe(3)
    expect(dailyProjectCapacity({ estagiario: false }, config)).toBe(4)
    expect(dailyProjectCapacity({ estagiario: true, ativo: false }, config)).toBe(0)
    expect(day(projectCompletionDates({ capacidade: 3, tarefas: [task('a', 12)] }))).toBe('2026-09-17')
    expect(day(projectCompletionDates({ capacidade: 4, tarefas: [task('a', 12)] }))).toBe('2026-09-16')
  })

  it('conta o início, ignora sábados e domingos e usa o próximo dia útil quando o início cai no fim de semana', () => {
    expect(day(projectCompletionDates({ capacidade: 6, tarefas: [task('a', 12, '2026-09-18')] }))).toBe('2026-09-21')
    expect(day(projectCompletionDates({ capacidade: 6, tarefas: [task('a', 6, '2026-09-19')] }))).toBe('2026-09-21')
  })

  it('ignora férias inclusivas mesmo quando foram armazenadas ao meio-dia', () => {
    const dates = projectCompletionDates({ capacidade: 6, tarefas: [task('a', 12, '2026-09-18')], ferias: [
      { dataInicio: new Date('2026-09-21T12:00:00Z'), dataFim: new Date('2026-09-22T12:00:00Z') },
    ] })
    expect(day(dates)).toBe('2026-09-23')
  })

  it('divide capacidade entre tarefas paralelas e redistribui a sobra da tarefa concluída no mesmo dia', () => {
    const dates = projectCompletionDates({ capacidade: 6, tarefas: [task('a', 2), task('b', 10)] })
    expect(day(dates)).toBe('2026-09-14')
    expect(day(dates, 'b')).toBe('2026-09-15')
  })

  it('é independente da ordem de criação e só divide capacidade depois do início da demanda paralela', () => {
    const tarefas = [task('a', 18), task('b', 6, '2026-09-15')]
    const first = projectCompletionDates({ capacidade: 6, tarefas })
    const second = projectCompletionDates({ capacidade: 6, tarefas: [...tarefas].reverse() })
    expect(day(first)).toBe('2026-09-17')
    expect(day(first, 'b')).toBe('2026-09-16')
    expect([...first].sort()).toEqual([...second].sort())
  })

  it('respeita reservas avulsas com horas fixas e o limite diário da tarefa vinculada', () => {
    const dates = projectCompletionDates({ capacidade: 6, tarefas: [task('a', 6, '2026-09-14', 2), task('b', 6)], reservas: [
      { dataInicio: '2026-09-14', dataFim: '2026-09-15', horasDiarias: 2 },
    ] })
    expect(day(dates)).toBe('2026-09-16')
    expect(day(dates, 'b')).toBe('2026-09-16')
  })

  it('uma reserva sem horas utiliza a capacidade total apenas no período reservado', () => {
    expect(day(projectCompletionDates({ capacidade: 3, tarefas: [task('a', 3)], reservas: [
      { dataInicio: '2026-09-14', dataFim: '2026-09-16', horasDiarias: null },
    ] }))).toBe('2026-09-17')
  })

  it('considera a conclusão real de tarefas anteriores sem reaplicar seu esforço ou consumir capacidade futura', () => {
    expect(day(projectCompletionDates({ capacidade: 6, tarefas: [task('a', 12)], concluidas: [
      { id: 'past', dataInicio: '2026-09-14', dataFim: '2026-09-14' },
    ] }))).toBe('2026-09-16')
    expect(day(projectCompletionDates({ capacidade: 6, tarefas: [task('a', 6, '2026-09-15')], concluidas: [
      { id: 'past', dataInicio: '2026-09-14', dataFim: '2026-09-14' },
    ] }))).toBe('2026-09-15')
  })

  it('não acrescenta um dia por erro de precisão decimal', () => {
    expect(day(projectCompletionDates({ capacidade: 4.8, tarefas: [task('a', 48)] }))).toBe('2026-09-25')
  })

  it.each([0, -1, NaN, Infinity])('recusa capacidade inválida %s', (capacidade) => {
    expect(() => projectCompletionDates({ capacidade, tarefas: [task('a', 6)] })).toThrow(SchedulingError)
  })

  it.each([0, -1, NaN, Infinity])('recusa esforço inválido %s', (esforco) => {
    expect(() => projectCompletionDates({ capacidade: 6, tarefas: [task('a', esforco)] })).toThrow(SchedulingError)
  })

  it('falha explicitamente se a capacidade não permite previsão dentro do limite', () => {
    expect(() => projectCompletionDates({ capacidade: 0.00001, tarefas: [task('a', 100)] })).toThrow('100 anos')
  })
})

describe('datas civis e conclusão', () => {
  it.each(['2026-02-30', '2026-13-01', '15/09/2026', '', new Date(NaN)])('recusa data inválida %s', (value) => {
    expect(() => dateOnly(value)).toThrow(SchedulingError)
  })

  it('registra a data de São Paulo mesmo após meia-noite UTC', () => {
    expect(businessToday(new Date('2026-09-16T01:00:00Z')).toISOString()).toBe('2026-09-15T00:00:00.000Z')
  })

  it('preenche apenas na transição, preserva salvamentos posteriores e limpa na reabertura', () => {
    const now = new Date('2026-09-15T15:00:00Z')
    const completed = completionDate('EM_ANDAMENTO', 'CONCLUIDO', null, now)
    expect(completed).toEqual(dateOnly('2026-09-15'))
    expect(completionDate('CONCLUIDO', 'CONCLUIDO', completed, new Date('2026-09-20'))).toBe(completed)
    expect(completionDate('CONCLUIDO', 'EM_ANDAMENTO', completed, now)).toBeNull()
    expect(completionDate('CONCLUIDO', 'CONCLUIDO', null, now)).toBeNull()
  })
})
