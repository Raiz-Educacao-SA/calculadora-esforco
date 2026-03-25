'use client'

import { useState, useEffect, useCallback } from 'react'

interface Area {
  nome: string
}

interface FuncionarioBasico {
  id: string
  nome: string
  area: Area | null
  userId?: string | null
}

interface Ferias {
  id: string
  funcionarioId: string
  dataInicio: string
  dataFim: string
  observacao: string | null
  funcionario: FuncionarioBasico
}

interface Session {
  userId: string
  nome: string
  email: string
  role: string
}

interface FormData {
  funcionarioId: string
  dataInicio: string
  dataFim: string
  observacao: string
}

const emptyForm: FormData = {
  funcionarioId: '',
  dataInicio: '',
  dataFim: '',
  observacao: '',
}

function calcDuracao(dataInicio: string, dataFim: string): number {
  const d1 = new Date(dataInicio)
  const d2 = new Date(dataFim)
  const diff = d2.getTime() - d1.getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24)) + 1
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

// --- Timeline helpers ---
const WEEKS_WINDOW = 12

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

function formatWeekLabel(start: Date): string {
  return start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatPeriodLabel(start: Date, end: Date): string {
  const startLabel = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const endLabel = end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${startLabel} – ${endLabel}`
}

function overlapsWeek(ferias: Ferias, weekStart: Date, weekEnd: Date): boolean {
  const inicio = new Date(ferias.dataInicio)
  const fim = new Date(ferias.dataFim)
  inicio.setHours(12)
  fim.setHours(12)
  return inicio <= weekEnd && fim >= weekStart
}

export default function FeriasPage() {
  const [ferias, setFerias] = useState<Ferias[]>([])
  const [funcionarios, setFuncionarios] = useState<FuncionarioBasico[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [meuFuncionario, setMeuFuncionario] = useState<FuncionarioBasico | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Ferias | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  // View mode
  const [viewMode, setViewMode] = useState<'lista' | 'timeline'>('lista')

  // Filtro por área
  const [filterArea, setFilterArea] = useState('')

  // Timeline navigation
  const [windowStart, setWindowStart] = useState<Date>(() => startOfWeek(new Date()))
  const weeks = Array.from({ length: WEEKS_WINDOW }, (_, i) => addWeeks(windowStart, i))
  const periodEnd = addWeeks(weeks[WEEKS_WINDOW - 1], 1)

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const showError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(''), 5000)
  }

  const fetchFerias = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ferias')
      if (!res.ok) {
        const json = await res.json()
        showError(json.error ?? 'Erro ao carregar férias.')
        return
      }
      const json = await res.json()
      setFerias(Array.isArray(json) ? json : [])
    } catch {
      showError('Erro ao carregar férias.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data: Session | null) => {
        if (!data) return
        setSession(data)

        const resFuncs = await fetch('/api/funcionarios')
        const todos: (FuncionarioBasico & { userId?: string | null; ativo?: boolean })[] = resFuncs.ok ? await resFuncs.json() : []
        const ativos = todos.filter((f) => f.ativo !== false)
        setFuncionarios(ativos)

        if (data.role === 'OPERATOR') {
          const meu = ativos.find((f) => f.userId === data.userId) ?? null
          setMeuFuncionario(meu)
        }
      })
      .catch(() => {})

    fetchFerias()
  }, [fetchFerias])

  const canEditFerias = (f: Ferias): boolean => {
    if (!session) return false
    if (session.role === 'ADMIN') return true
    if (session.role === 'OPERATOR') {
      return meuFuncionario?.id === f.funcionarioId
    }
    return false
  }

  const openCreate = () => {
    setEditItem(null)
    const defaultFuncId = session?.role === 'OPERATOR' ? (meuFuncionario?.id ?? '') : ''
    setForm({ ...emptyForm, funcionarioId: defaultFuncId })
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (f: Ferias) => {
    setEditItem(f)
    setForm({
      funcionarioId: f.funcionarioId,
      dataInicio: f.dataInicio.slice(0, 10),
      dataFim: f.dataFim.slice(0, 10),
      observacao: f.observacao ?? '',
    })
    setFormError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditItem(null)
    setForm(emptyForm)
    setFormError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.funcionarioId) {
      setFormError('Selecione um colaborador.')
      return
    }
    if (!form.dataInicio || !form.dataFim) {
      setFormError('Data início e data fim são obrigatórias.')
      return
    }
    if (new Date(form.dataFim) < new Date(form.dataInicio)) {
      setFormError('Data fim não pode ser anterior à data início.')
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      const url = editItem ? `/api/ferias/${editItem.id}` : '/api/ferias'
      const method = editItem ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funcionarioId: form.funcionarioId,
          dataInicio: form.dataInicio,
          dataFim: form.dataFim,
          observacao: form.observacao.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setFormError(json.error ?? 'Erro ao salvar.')
        return
      }
      closeForm()
      await fetchFerias()
      showSuccess(editItem ? 'Férias atualizadas com sucesso.' : 'Férias registradas com sucesso.')
    } catch {
      setFormError('Erro de conexão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/ferias/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        showError(json.error ?? 'Erro ao excluir.')
        return
      }
      setDeleteConfirm(null)
      await fetchFerias()
      showSuccess('Férias excluídas com sucesso.')
    } catch {
      showError('Erro de conexão.')
    }
  }

  const goToTimeline = (f: Ferias) => {
    const inicio = new Date(f.dataInicio)
    inicio.setHours(12)
    setWindowStart(startOfWeek(inicio))
    setViewMode('timeline')
  }

  const isAdmin = session?.role === 'ADMIN'
  const isOperator = session?.role === 'OPERATOR'
  const canRegister = isAdmin || (isOperator && !!meuFuncionario)

  // Áreas únicas para o filtro
  const areasUnicas = Array.from(
    new Set(funcionarios.map((f) => f.area?.nome).filter(Boolean))
  ).sort((a, b) => (a as string).localeCompare(b as string, 'pt-BR')) as string[]

  // Lista de férias filtrada por área
  const feriasFiltradas = filterArea
    ? ferias.filter((f) => f.funcionario.area?.nome === filterArea)
    : ferias

  // Timeline: funcionários ordenados por nome, filtrados por área
  const funcionariosOrdenados = [...funcionarios]
    .filter((f) => !filterArea || f.area?.nome === filterArea)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  // Contagem de funcionários com férias no período da timeline
  const funcionariosComFeriasNoPeriodo = funcionariosOrdenados.filter((func) =>
    ferias.some((f) => {
      if (f.funcionarioId !== func.id) return false
      const weekEnd = new Date(periodEnd)
      weekEnd.setHours(23, 59, 59, 999)
      return overlapsWeek(f, windowStart, weekEnd)
    })
  ).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Férias</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gerencie os períodos de férias dos membros do time.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* View toggle */}
          <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              onClick={() => setViewMode('lista')}
              className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'lista' ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'timeline' ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              Timeline
            </button>
          </div>

          {(isAdmin || isOperator) && (
            <button
              onClick={openCreate}
              disabled={isOperator && !meuFuncionario}
              className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Registrar Férias
            </button>
          )}
        </div>
      </div>

      {isOperator && !meuFuncionario && !loading && (
        <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-3 text-sm text-yellow-800 dark:text-yellow-300">
          Seu perfil não está vinculado a um colaborador. Solicite ao administrador.
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-300">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Filtros */}
      {areasUnicas.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Todas as áreas</option>
            {areasUnicas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {filterArea && (
            <button
              onClick={() => setFilterArea('')}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Limpar filtro
            </button>
          )}
        </div>
      )}

      {/* ---- VISTA: LISTA ---- */}
      {viewMode === 'lista' && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
              <svg className="mr-2 h-4 w-4 animate-spin text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Carregando...
            </div>
          ) : feriasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="mb-3 h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">{filterArea ? 'Nenhuma férias encontrada para esta área.' : 'Nenhum período de férias registrado.'}</p>
              {canRegister && !filterArea && (
                <button onClick={openCreate} className="mt-3 text-sm text-teal-600 hover:underline">
                  Registrar primeiro período
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <ul className="divide-y divide-gray-100 dark:divide-gray-700 sm:hidden">
                {feriasFiltradas.map((f) => (
                  <li key={f.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{f.funcionario.nome}</p>
                        {f.funcionario.area && (
                          <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">{f.funcionario.area.nome}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatDate(f.dataInicio)} – {formatDate(f.dataFim)}
                          <span className="ml-1 text-gray-400">({calcDuracao(f.dataInicio, f.dataFim)} dias)</span>
                        </p>
                        {f.observacao && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{f.observacao}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => goToTimeline(f)} className="flex-1 rounded py-1.5 text-sm font-medium text-teal-600 border border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-900/30">Ver na timeline</button>
                      {canEditFerias(f) && (
                        <>
                          <button onClick={() => openEdit(f)} className="flex-1 rounded py-1.5 text-sm font-medium text-blue-600 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30">Editar</button>
                          <button onClick={() => setDeleteConfirm(f.id)} className="flex-1 rounded py-1.5 text-sm font-medium text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30">Excluir</button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <table className="hidden sm:table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Colaborador</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Área Técnica</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Período</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Duração</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Observação</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {feriasFiltradas.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{f.funcionario.nome}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{f.funcionario.area?.nome ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(f.dataInicio)} – {formatDate(f.dataFim)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {calcDuracao(f.dataInicio, f.dataFim)} dias
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {f.observacao ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button onClick={() => goToTimeline(f)} className="rounded px-2 py-1 text-xs font-medium text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30">Ver na timeline</button>
                          {canEditFerias(f) && (
                            <>
                              <button onClick={() => openEdit(f)} className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30">Editar</button>
                              <button onClick={() => setDeleteConfirm(f.id)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">Excluir</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* ---- VISTA: TIMELINE ---- */}
      {viewMode === 'timeline' && (
        <div className="space-y-4">
          {/* Period navigation */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 shadow-sm">
            <button
              onClick={() => setWindowStart((d) => addWeeks(d, -WEEKS_WINDOW))}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
              aria-label="Período anterior"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {formatPeriodLabel(weeks[0], periodEnd)}
              </span>
              <button
                onClick={() => setWindowStart(startOfWeek(new Date()))}
                className="rounded border border-gray-300 dark:border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Hoje
              </button>
            </div>
            <button
              onClick={() => setWindowStart((d) => addWeeks(d, WEEKS_WINDOW))}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
              aria-label="Próximo período"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Timeline table */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
                <svg className="mr-2 h-4 w-4 animate-spin text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Carregando...
              </div>
            ) : funcionariosOrdenados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <svg className="mb-3 h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm">Nenhum colaborador ativo cadastrado.</p>
              </div>
            ) : (
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700/50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 min-w-[180px]">
                      Colaborador
                    </th>
                    {weeks.map((w, i) => (
                      <th
                        key={i}
                        className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[80px] border-l border-gray-100 dark:border-gray-700"
                      >
                        {formatWeekLabel(w)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {funcionariosOrdenados.map((func) => {
                    const feriasDoFunc = ferias.filter((f) => f.funcionarioId === func.id)
                    return (
                      <tr key={func.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                        <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-4 py-3 border-r border-gray-100 dark:border-gray-700">
                          <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{func.nome}</p>
                          {func.area && (
                            <p className="text-xs text-teal-600 dark:text-teal-400">{func.area.nome}</p>
                          )}
                        </td>
                        {weeks.map((w, i) => {
                          const weekEnd = new Date(w)
                          weekEnd.setDate(weekEnd.getDate() + 6)
                          weekEnd.setHours(23, 59, 59, 999)
                          const feriasNaSemana = feriasDoFunc.filter((f) => overlapsWeek(f, w, weekEnd))

                          return (
                            <td
                              key={i}
                              className="px-1 py-2 border-l border-gray-100 dark:border-gray-700 align-top"
                              style={{ minWidth: '80px' }}
                            >
                              {feriasNaSemana.length > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                  {feriasNaSemana.map((f) => {
                                    const duracao = calcDuracao(f.dataInicio, f.dataFim)
                                    return (
                                      <div
                                        key={f.id}
                                        className="mx-0.5 rounded px-1.5 py-1 text-xs font-medium text-white bg-amber-500 dark:bg-amber-600 cursor-default"
                                        title={`${formatDate(f.dataInicio)} – ${formatDate(f.dataFim)}${f.observacao ? ` | ${f.observacao}` : ''}`}
                                      >
                                        <span className="block truncate leading-tight">Férias</span>
                                        <span className="block text-xs opacity-80 leading-tight">{duracao}d</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="w-full h-10 rounded bg-gray-50 dark:bg-gray-700/30" />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary */}
          {!loading && funcionariosOrdenados.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {funcionariosComFeriasNoPeriodo === 0
                ? 'Nenhum colaborador com férias neste período.'
                : `${funcionariosComFeriasNoPeriodo} colaborador${funcionariosComFeriasNoPeriodo > 1 ? 'es' : ''} com férias neste período.`}
            </p>
          )}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editItem ? 'Editar Férias' : 'Registrar Férias'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-4 px-6 py-4">
                {formError && (
                  <div className="rounded bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 text-sm text-red-700 dark:text-red-300">
                    {formError}
                  </div>
                )}
                <div>
                  <label htmlFor="funcionarioId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Colaborador <span className="text-red-500">*</span>
                  </label>
                  {isAdmin ? (
                    <select
                      id="funcionarioId"
                      value={form.funcionarioId}
                      onChange={(e) => setForm((prev) => ({ ...prev, funcionarioId: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">Selecione...</option>
                      {funcionarios.map((f) => (
                        <option key={f.id} value={f.id}>{f.nome}{f.area ? ` — ${f.area.nome}` : ''}</option>
                      ))}
                    </select>
                  ) : meuFuncionario ? (
                    <input
                      type="text"
                      value={meuFuncionario.nome}
                      disabled
                      className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-not-allowed"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">Nenhum colaborador vinculado.</p>
                  )}
                </div>
                <div>
                  <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data Início <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="dataInicio"
                    type="date"
                    value={form.dataInicio}
                    onChange={(e) => setForm((prev) => ({ ...prev, dataInicio: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data Fim <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="dataFim"
                    type="date"
                    value={form.dataFim}
                    onChange={(e) => setForm((prev) => ({ ...prev, dataFim: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                {form.dataInicio && form.dataFim && new Date(form.dataFim) >= new Date(form.dataInicio) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Duração: {calcDuracao(form.dataInicio, form.dataFim)} dias corridos
                  </p>
                )}
                <div>
                  <label htmlFor="observacao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Observação
                  </label>
                  <textarea
                    id="observacao"
                    value={form.observacao}
                    onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Informações adicionais (opcional)"
                    maxLength={500}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {submitting && (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {editItem ? 'Salvar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Confirmar exclusão</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja excluir este período de férias?
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
