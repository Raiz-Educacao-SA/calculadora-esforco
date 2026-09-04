'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SourceBadge } from '@/components/ui/SourceBadge'
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge'

const GAIN_TYPE_LABELS: Record<string, string> = {
  REDUCAO_CUSTO: 'Redução de Custo',
  AUMENTO_RECEITA: 'Aumento de Receita',
  REDUCAO_HORAS: 'Redução de Horas',
}

const GAIN_TYPES = Object.keys(GAIN_TYPE_LABELS)
const BACKLOG_STATUSES = ['NAO_INICIADO', 'PRIORIZADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'] as const
type BacklogStatus = (typeof BACKLOG_STATUSES)[number]
type CriterioFonte = 'IA' | 'MANUAL'

interface AvailableCriterio {
  id: string
  nome: string
}

interface ComplexidadeOption {
  id: string
  nome: string
  esforcoHoras: number
}

interface ComponenteOption {
  id: string
  nome: string
}

interface AuditLog {
  id: string
  entidade: string
  entidadeId: string
  acao: string
  dadosAnteriores: string | null
  dadosNovos: string | null
  usuario: string | null
  createdAt: string
}

interface SolicitacaoCriterio {
  id: string
  criterioId: string
  complexidadeId: string
  componenteId?: string | null
  valorEsforco: number
  fonte: CriterioFonte
  confianca: number | null
  componente?: { nome: string } | null
  criterio?: { nome: string } | null
  complexidade?: { nome: string } | null
}

interface SolicitacaoDetail {
  id: string
  titulo: string
  descricao: string
  contexto?: string | null
  urgencia?: string | null
  createdAt: string
  esforcoTotal?: number | null
  zeevNumber?: string | null
  area?: { id: string; nome: string } | null
  criterios?: SolicitacaoCriterio[]
}

interface BacklogItemDetail {
  id: string
  solicitacaoId: string
  tipoGanho: string
  valorGanho: number
  unidadeGanho: string
  descricaoPremissa?: string | null
  ganhoNormalizado: number
  scorePriorizacao: number
  status: BacklogStatus
  posicao?: number | null
  solicitacao?: SolicitacaoDetail | null
}

export default function BacklogDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [backlogItem, setBacklogItem] = useState<BacklogItemDetail | null>(null)
  const [solicitacao, setSolicitacao] = useState<SolicitacaoDetail | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [allBacklogCount, setAllBacklogCount] = useState(0)
  const [posicaoRanking, setPosicaoRanking] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [gainForm, setGainForm] = useState({
    tipoGanho: '',
    valorGanho: '',
    descricaoPremissa: '',
  })
  const [saving, setSaving] = useState(false)
  const [savingGain, setSavingGain] = useState(false)
  const [effortAction, setEffortAction] = useState<string | null>(null)
  const [availableCriterios, setAvailableCriterios] = useState<AvailableCriterio[]>([])
  const [componentes, setComponentes] = useState<ComponenteOption[]>([])
  const [manualComponenteId, setManualComponenteId] = useState('')
  const [manualCriterioId, setManualCriterioId] = useState('')
  const [manualComplexidadeId, setManualComplexidadeId] = useState('')
  const [manualComplexidades, setManualComplexidades] = useState<ComplexidadeOption[]>([])
  const [effortDirty, setEffortDirty] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isViewer, setIsViewer] = useState(false)

  const refreshRanking = useCallback(async () => {
    const allRes = await fetch('/api/backlog')
    if (!allRes.ok) return

    const all = await allRes.json()
    if (Array.isArray(all)) {
      const active = all.filter(
        (item: BacklogItemDetail) => item.status !== 'CONCLUIDO' && item.status !== 'CANCELADO'
      )
      setAllBacklogCount(active.length)
      const idx = active.findIndex((item: BacklogItemDetail) => item.id === id)
      setPosicaoRanking(idx !== -1 ? idx + 1 : null)
    }
  }, [id])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const biRes = await fetch(`/api/backlog/${id}`)
      if (!biRes.ok) { setLoading(false); return }
      const bi = await biRes.json()
      setBacklogItem(bi)
      setNewStatus(bi.status)
      setGainForm({
        tipoGanho: bi.tipoGanho ?? '',
        valorGanho: bi.valorGanho != null ? String(bi.valorGanho) : '',
        descricaoPremissa: bi.descricaoPremissa ?? '',
      })

      const [solRes, auditRes] = await Promise.all([
        fetch(`/api/solicitacoes/${bi.solicitacaoId}`),
        fetch(`/api/audit-logs?entidade=Solicitacao&entidadeId=${bi.solicitacaoId}`),
      ])

      if (solRes.ok) setSolicitacao(await solRes.json())
      if (auditRes.ok) setAuditLogs(await auditRes.json())
      await refreshRanking()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id, refreshRanking])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const areaId = solicitacao?.area?.id ?? backlogItem?.solicitacao?.area?.id
    if (!areaId) {
      setAvailableCriterios([])
      setComponentes([])
      return
    }

    const params = new URLSearchParams({ areaId, ativo: 'true' })
    if (manualComponenteId) params.set('componenteId', manualComponenteId)

    Promise.all([
      fetch(`/api/criterios?${params.toString()}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/componentes?areaId=${areaId}&ativo=true`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([criteriosJson, componentesJson]) => {
        setAvailableCriterios(Array.isArray(criteriosJson) ? criteriosJson : [])
        setComponentes(Array.isArray(componentesJson) ? componentesJson : [])
      })
      .catch(() => {
        setAvailableCriterios([])
        setComponentes([])
      })
  }, [solicitacao?.area?.id, backlogItem?.solicitacao?.area?.id, manualComponenteId])

  useEffect(() => {
    if (!manualCriterioId) {
      setManualComplexidades([])
      setManualComplexidadeId('')
      return
    }

    fetch(`/api/complexidades?criterioId=${manualCriterioId}&ativo=true`)
      .then((r) => (r.ok ? r.json() : []))
      .then((json) => {
        setManualComplexidades(Array.isArray(json) ? json : [])
        setManualComplexidadeId('')
      })
      .catch(() => {
        setManualComplexidades([])
        setManualComplexidadeId('')
      })
  }, [manualCriterioId])

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.role === 'VIEWER') setIsViewer(true) })
      .catch(() => {})
  }, [])

  const handleStatusUpdate = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/backlog/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const updated = await res.json()
        setBacklogItem(updated)
        await refreshRanking()
        setMessage({ type: 'success', text: 'Status atualizado com sucesso' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Erro ao atualizar' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleGainUpdate = async () => {
    setSavingGain(true)
    setMessage(null)
    try {
      const valorGanho = Number(gainForm.valorGanho)
      if (!Number.isFinite(valorGanho) || valorGanho < 0) {
        setMessage({ type: 'error', text: 'Informe um valor de ganho valido.' })
        return
      }

      const res = await fetch(`/api/backlog/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoGanho: gainForm.tipoGanho,
          valorGanho,
          descricaoPremissa: gainForm.descricaoPremissa,
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        setBacklogItem(updated)
        setGainForm({
          tipoGanho: updated.tipoGanho ?? '',
          valorGanho: updated.valorGanho != null ? String(updated.valorGanho) : '',
          descricaoPremissa: updated.descricaoPremissa ?? '',
        })
        await refreshRanking()
        setMessage({ type: 'success', text: 'Informacoes de ganho atualizadas e ranking recalculado.' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Erro ao atualizar ganhos' })
      }
    } finally {
      setSavingGain(false)
    }
  }

  const handleAnalyzeAgain = async () => {
    if (!backlogItem?.solicitacaoId) return
    setEffortAction('analisar')
    setMessage(null)
    try {
      const res = await fetch(`/api/solicitacoes/${backlogItem.solicitacaoId}/analisar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: json.error ?? 'Erro ao reestimar esforço com IA.' })
        return
      }
      await fetchData()
      setEffortDirty(false)
      setMessage({
        type: 'success',
        text: json.analise?.fallbackLocal
          ? 'Estimativa refeita com fallback local e ranking recalculado.'
          : 'Estimativa refeita com IA e ranking recalculado.',
      })
      setTimeout(() => setMessage(null), 4000)
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão ao reestimar esforço.' })
    } finally {
      setEffortAction(null)
    }
  }

  const handleRecalculateEffort = async () => {
    if (!backlogItem?.solicitacaoId) return
    setEffortAction('recalcular')
    setMessage(null)
    try {
      const res = await fetch(`/api/solicitacoes/${backlogItem.solicitacaoId}/recalcular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: json.error ?? 'Erro ao recalcular esforço.' })
        return
      }
      await fetchData()
      setEffortDirty(false)
      setMessage({ type: 'success', text: `Esforço atualizado para ${json.esforcoTotal ?? 0}h e ranking recalculado.` })
      setTimeout(() => setMessage(null), 4000)
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão ao recalcular esforço.' })
    } finally {
      setEffortAction(null)
    }
  }

  const handleAddManualCriterio = async () => {
    if (!backlogItem?.solicitacaoId || !manualCriterioId || !manualComplexidadeId) return
    setEffortAction('add-manual')
    setMessage(null)
    try {
      const res = await fetch(`/api/solicitacoes/${backlogItem.solicitacaoId}/criterios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criterioId: manualCriterioId,
          complexidadeId: manualComplexidadeId,
          componenteId: manualComponenteId || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: json.error ?? 'Erro ao adicionar critério.' })
        return
      }
      const nextCriterio: SolicitacaoCriterio = {
        id: json.id,
        criterioId: json.criterioId,
        complexidadeId: json.complexidadeId,
        componenteId: json.componenteId ?? null,
        valorEsforco: json.valorEsforco ?? 0,
        fonte: 'MANUAL',
        confianca: null,
        criterio: json.criterio,
        complexidade: json.complexidade,
        componente: json.componente,
      }

      setSolicitacao((prev) => {
        if (!prev) return prev
        const current = prev.criterios ?? []
        const next = current.some(
          (c) => c.criterioId === nextCriterio.criterioId && (c.componenteId ?? null) === (nextCriterio.componenteId ?? null)
        )
          ? current.map((c) =>
              c.criterioId === nextCriterio.criterioId && (c.componenteId ?? null) === (nextCriterio.componenteId ?? null)
                ? nextCriterio
                : c
            )
          : [...current, nextCriterio]
        return { ...prev, criterios: next }
      })
      setEffortDirty(true)
      setManualComponenteId('')
      setManualCriterioId('')
      setManualComplexidadeId('')
      setManualComplexidades([])
      setMessage({ type: 'success', text: 'Critério salvo. Recalcule o esforço quando concluir os ajustes.' })
      setTimeout(() => setMessage(null), 4000)
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão ao adicionar critério.' })
    } finally {
      setEffortAction(null)
    }
  }

  const handleRemoveCriterio = async (criterioId: string) => {
    if (!backlogItem?.solicitacaoId) return
    setEffortAction(`remove-${criterioId}`)
    setMessage(null)
    try {
      const res = await fetch(`/api/solicitacoes/${backlogItem.solicitacaoId}/criterios`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criterioId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: json.error ?? 'Erro ao remover critério.' })
        return
      }
      setSolicitacao((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          criterios: (prev.criterios ?? []).filter((c) => c.criterioId !== criterioId),
        }
      })
      setEffortDirty(true)
      setMessage({ type: 'success', text: 'Critério removido. Recalcule o esforço quando concluir os ajustes.' })
      setTimeout(() => setMessage(null), 4000)
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão ao remover critério.' })
    } finally {
      setEffortAction(null)
    }
  }

  const formatDate = (d: string) => {
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const formatNumber = (n: number) => {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(n)
  }

  const unitPreview = gainForm.tipoGanho === 'REDUCAO_HORAS' ? 'horas/mes' : 'R$'
  const gainChanged = backlogItem && (
    gainForm.tipoGanho !== backlogItem.tipoGanho ||
    Number(gainForm.valorGanho) !== backlogItem.valorGanho ||
    gainForm.descricaoPremissa !== (backlogItem.descricaoPremissa ?? '')
  )
  const posicao = posicaoRanking ?? '-'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (!backlogItem) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Item não encontrado</p>
        <button onClick={() => router.push('/backlog')} className="mt-4 text-teal-600 dark:text-teal-400 hover:underline">
          Voltar ao Backlog
        </button>
      </div>
    )
  }

  const sol = solicitacao || backlogItem.solicitacao
  const effortPreviewTotal = sol?.criterios?.reduce((sum, c) => sum + (c.valorEsforco ?? 0), 0) ?? sol?.esforcoTotal ?? 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/backlog')}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm flex items-center gap-1"
        >
          ← Voltar ao Backlog
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{sol?.titulo}</h1>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}

      {/* Info Geral */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informações Gerais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Área</p>
            <p className="font-medium dark:text-white">{sol?.area?.nome}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
            <StatusBadge status={backlogItem.status} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Urgência</p>
            <p className="font-medium dark:text-white">{sol?.urgencia || 'Não informada'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Criado em</p>
            <p className="font-medium dark:text-white">{sol?.createdAt ? formatDate(sol.createdAt) : '-'}</p>
          </div>
          {sol?.zeevNumber && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Número Zeev</p>
              <p className="font-medium dark:text-white">{sol.zeevNumber}</p>
            </div>
          )}
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">Descrição</p>
            <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{sol?.descricao}</p>
          </div>
          {sol?.contexto && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Contexto</p>
              <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{sol.contexto}</p>
            </div>
          )}
        </div>
      </div>

      {/* Memória de Cálculo */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Memória de Cálculo</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Atualize a estimativa sem excluir a demanda do backlog.
            </p>
            {effortDirty && (
              <p className="mt-2 inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                Alterações pendentes de recálculo
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAnalyzeAgain}
              disabled={isViewer || effortAction != null}
              className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
            >
              {effortAction === 'analisar' ? 'Reestimando...' : 'Reestimar com IA'}
            </button>
            <button
              type="button"
              onClick={handleRecalculateEffort}
              disabled={isViewer || effortAction != null}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                effortDirty
                  ? 'border-teal-600 bg-teal-600 text-white hover:bg-teal-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {effortAction === 'recalcular' ? 'Recalculando...' : 'Recalcular esforço'}
            </button>
          </div>
        </div>
        {sol?.criterios && sol.criterios.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Componente</th>
                  <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Critério</th>
                  <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Complexidade</th>
                  <th className="text-right p-3 font-medium text-gray-600 dark:text-gray-400">Esforço (h)</th>
                  <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Fonte</th>
                  <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Confiança</th>
                  <th className="text-right p-3 font-medium text-gray-600 dark:text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sol.criterios.map((c) => (
                  <tr
                    key={c.id}
                    className={c.fonte === 'IA' ? 'border-l-4 border-l-blue-400' : 'border-l-4 border-l-green-400'}
                  >
                    <td className="p-3 text-gray-700 dark:text-gray-300">
                      {c.componente?.nome ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                          {c.componente.nome}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-900 dark:text-white">{c.criterio?.nome}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{c.complexidade?.nome}</td>
                    <td className="p-3 text-right font-mono text-gray-900 dark:text-white">{c.valorEsforco}</td>
                    <td className="p-3 text-center"><SourceBadge source={c.fonte} /></td>
                    <td className="p-3 text-center">
                      {c.confianca != null ? <ConfidenceBadge confidence={c.confianca} /> : '-'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveCriterio(c.criterioId)}
                        disabled={isViewer || effortAction != null}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-900/30"
                      >
                        {effortAction === `remove-${c.criterioId}` ? 'Removendo...' : 'Remover'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-bold">
                <tr>
                  <td className="p-3 text-gray-900 dark:text-white" colSpan={3}>Total</td>
                  <td className="p-3 text-right font-mono text-gray-900 dark:text-white">
                    {effortPreviewTotal} h
                    {effortDirty && <span className="ml-1 text-xs font-normal text-yellow-600 dark:text-yellow-300">(prévia)</span>}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">Nenhum critério registrado</p>
        )}

        {!isViewer && (
          <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-700">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Adicionar ou atualizar critério manualmente
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label htmlFor="manual-componente" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Componente
                </label>
                <select
                  id="manual-componente"
                  value={manualComponenteId}
                  onChange={(e) => setManualComponenteId(e.target.value)}
                  disabled={effortAction != null}
                  className="block w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Sem componente</option>
                  {componentes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="manual-criterio" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Critério
                </label>
                <select
                  id="manual-criterio"
                  value={manualCriterioId}
                  onChange={(e) => setManualCriterioId(e.target.value)}
                  disabled={effortAction != null}
                  className="block w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Selecione</option>
                  {availableCriterios.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="manual-complexidade" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Complexidade
                </label>
                <select
                  id="manual-complexidade"
                  value={manualComplexidadeId}
                  onChange={(e) => setManualComplexidadeId(e.target.value)}
                  disabled={!manualCriterioId || manualComplexidades.length === 0 || effortAction != null}
                  className="block w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">
                    {!manualCriterioId
                      ? 'Selecione critério'
                      : manualComplexidades.length === 0
                      ? 'Sem complexidades'
                      : 'Selecione'}
                  </option>
                  {manualComplexidades.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} - {c.esforcoHoras}h</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddManualCriterio}
                  disabled={!manualCriterioId || !manualComplexidadeId || effortAction != null}
                  className="w-full rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {effortAction === 'add-manual' ? 'Salvando...' : 'Adicionar/atualizar'}
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Se o critério já existir para o mesmo componente, a complexidade será atualizada.
            </p>
          </div>
        )}
      </div>

      {/* Ganho Esperado + Score */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ganho Esperado</h2>
            {gainChanged && (
              <span className="rounded-full bg-yellow-100 dark:bg-yellow-900/40 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-300">
                Pendente
              </span>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="tipoGanho" className="block text-sm text-gray-500 dark:text-gray-400">Tipo de Ganho</label>
              <select
                id="tipoGanho"
                value={gainForm.tipoGanho}
                onChange={(e) => setGainForm((prev) => ({ ...prev, tipoGanho: e.target.value }))}
                disabled={isViewer || savingGain}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {GAIN_TYPES.map((type) => (
                  <option key={type} value={type}>{GAIN_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="valorGanho" className="block text-sm text-gray-500 dark:text-gray-400">Valor ({unitPreview})</label>
              <input
                id="valorGanho"
                type="number"
                min="0"
                step="0.01"
                value={gainForm.valorGanho}
                onChange={(e) => setGainForm((prev) => ({ ...prev, valorGanho: e.target.value }))}
                disabled={isViewer || savingGain}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ganho Normalizado</p>
              <p className="font-medium dark:text-white">{formatNumber(backlogItem.ganhoNormalizado)}</p>
            </div>
            <div>
              <label htmlFor="descricaoPremissa" className="block text-sm text-gray-500 dark:text-gray-400">Premissa</label>
              <textarea
                id="descricaoPremissa"
                value={gainForm.descricaoPremissa}
                onChange={(e) => setGainForm((prev) => ({ ...prev, descricaoPremissa: e.target.value }))}
                disabled={isViewer || savingGain}
                rows={3}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Descreva a premissa usada para estimar o ganho"
              />
            </div>
            <button
              onClick={handleGainUpdate}
              disabled={isViewer || savingGain || !gainChanged || !gainForm.tipoGanho || gainForm.valorGanho === ''}
              className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingGain ? 'Recalculando...' : 'Salvar ganhos e recalcular ranking'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center justify-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Score de Priorizacao</h2>
          <p className="text-5xl font-bold text-teal-600 dark:text-teal-400">{formatNumber(backlogItem.scorePriorizacao)}</p>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Posicao no Ranking</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {posicao === '-' ? 'Fora do ranking' : `#${posicao}`}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">de {allBacklogCount} demandas ativas</p>
          </div>
        </div>
      </div>

      {/* Alterar Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alterar Status</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            disabled={isViewer}
            className="flex-1 min-w-[160px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {BACKLOG_STATUSES.map(s => (
              <option key={s} value={s}>
                {s === 'NAO_INICIADO' ? 'Não Iniciado' :
                 s === 'PRIORIZADO' ? 'Priorizado' :
                 s === 'EM_ANDAMENTO' ? 'Em Andamento' :
                 s === 'CONCLUIDO' ? 'Concluído' : 'Cancelado'}
              </option>
            ))}
          </select>
          <button
            onClick={handleStatusUpdate}
            disabled={isViewer || saving || newStatus === backlogItem.status}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Histórico de Auditoria */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Histórico de Auditoria</h2>
        {auditLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Data/Hora</th>
                  <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Ação</th>
                  <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="p-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{formatDate(log.createdAt)}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        {log.acao}
                      </span>
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{log.usuario || 'sistema'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Nenhum registro de auditoria</p>
        )}
      </div>
    </div>
  )
}
