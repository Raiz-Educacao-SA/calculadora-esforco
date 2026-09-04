'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface Contrato {
  id: string
  titulo: string
  numero: string | null
  descricao: string | null
  valorTotal: number | null
  periodicidade: string | null
  dataInicio: string | null
  dataFim: string | null
  status: string
  observacao: string | null
  createdAt: string
  fornecedor: { id: string; nome: string }
}

interface Fornecedor {
  id: string
  nome: string
}

const STATUS_OPTIONS = [
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'ENCERRADO', label: 'Encerrado' },
  { value: 'SUSPENSO', label: 'Suspenso' },
  { value: 'RENOVACAO', label: 'Em Renovação' },
]

const PERIODICIDADE_OPTIONS = [
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'SEMESTRAL', label: 'Semestral' },
  { value: 'ANUAL', label: 'Anual' },
  { value: 'UNICO', label: 'Único' },
]

const statusConfig: Record<string, { label: string; className: string }> = {
  ATIVO: { label: 'Ativo', className: 'bg-green-100 text-green-700 ring-green-200 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-800' },
  ENCERRADO: { label: 'Encerrado', className: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600' },
  SUSPENSO: { label: 'Suspenso', className: 'bg-yellow-100 text-yellow-700 ring-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:ring-yellow-800' },
  RENOVACAO: { label: 'Em Renovação', className: 'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-800' },
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.className}`}>
      {config.label}
    </span>
  )
}

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr))
}

function toInputDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().split('T')[0]
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const isExpired = (c: Contrato) =>
  c.dataFim != null && new Date(c.dataFim) < new Date() && c.status === 'ATIVO'

const EMPTY_FORM = {
  fornecedorId: '',
  titulo: '',
  numero: '',
  descricao: '',
  valorTotal: '',
  periodicidade: '',
  dataInicio: '',
  dataFim: '',
  status: 'ATIVO',
  observacao: '',
}

function ContratosPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [contratos, setContratos] = useState<Contrato[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [filterFornecedor, setFilterFornecedor] = useState(searchParams.get('fornecedorId') ?? '')
  const [filterStatus, setFilterStatus] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ ...EMPTY_FORM, fornecedorId: searchParams.get('fornecedorId') ?? '' })
  const [submitting, setSubmitting] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Contrato | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 5000) }

  const fetchContratos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterFornecedor) params.set('fornecedorId', filterFornecedor)
      if (filterStatus) params.set('status', filterStatus)
      const query = params.toString()
      const res = await fetch(`/api/contratos${query ? `?${query}` : ''}`, { cache: 'no-store' })
      const json = await res.json()
      setContratos(Array.isArray(json) ? json : [])
    } catch {
      showError('Erro ao carregar contratos.')
    } finally {
      setLoading(false)
    }
  }, [filterFornecedor, filterStatus])

  useEffect(() => {
    async function fetchFornecedores() {
      try {
        const res = await fetch('/api/fornecedores')
        const json = await res.json()
        setFornecedores(Array.isArray(json) ? json : [])
      } catch { /* not critical */ }
    }
    fetchFornecedores()
  }, [])

  useEffect(() => { fetchContratos() }, [fetchContratos])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.titulo.trim()) { showError('Título é obrigatório.'); return }
    if (!formData.fornecedorId) { showError('Fornecedor é obrigatório.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fornecedorId: formData.fornecedorId,
          titulo: formData.titulo.trim(),
          numero: formData.numero || null,
          descricao: formData.descricao || null,
          valorTotal: formData.valorTotal ? parseFloat(formData.valorTotal) : null,
          periodicidade: formData.periodicidade || null,
          dataInicio: formData.dataInicio || null,
          dataFim: formData.dataFim || null,
          status: formData.status,
          observacao: formData.observacao || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao criar contrato.'); return }
      setFormData(EMPTY_FORM)
      setShowForm(false)
      await fetchContratos()
      showSuccess('Contrato criado com sucesso.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setSubmitting(false)
    }
  }

  const startEditing = (c: Contrato) => {
    setEditingId(c.id)
    setEditData({ ...c })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditData(null)
  }

  const handleSave = async () => {
    if (!editData || !editingId) return
    if (!editData.titulo.trim()) { showError('Título é obrigatório.'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/contratos/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fornecedorId: editData.fornecedor.id,
          titulo: editData.titulo.trim(),
          numero: editData.numero || null,
          descricao: editData.descricao || null,
          valorTotal: editData.valorTotal,
          periodicidade: editData.periodicidade || null,
          dataInicio: editData.dataInicio || null,
          dataFim: editData.dataFim || null,
          status: editData.status,
          observacao: editData.observacao || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao salvar.'); return }
      setEditingId(null)
      setEditData(null)
      await fetchContratos()
      showSuccess('Contrato atualizado com sucesso.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/contratos/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao excluir.'); return }
      setDeleteConfirm(null)
      await fetchContratos()
      showSuccess('Contrato excluído com sucesso.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setDeleting(false)
    }
  }

  const inputClass = 'rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500'
  const inlineInputClass = 'rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500 w-full'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Contratos</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestão de contratos com fornecedores.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); if (showForm) setFormData(EMPTY_FORM) }}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          {showForm ? 'Fechar' : 'Novo Contrato'}
        </button>
      </div>

      {/* Banners */}
      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-300">{success}</div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-300">{error}</div>
      )}

      {/* Formulário de criação */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Novo Contrato</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="fornecedorId" className="text-xs font-medium text-gray-600 dark:text-gray-400">Fornecedor <span className="text-red-500">*</span></label>
                <select id="fornecedorId" required value={formData.fornecedorId} onChange={(e) => setFormData({ ...formData, fornecedorId: e.target.value })} className={inputClass}>
                  <option value="">Selecionar fornecedor</option>
                  {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="titulo" className="text-xs font-medium text-gray-600 dark:text-gray-400">Título <span className="text-red-500">*</span></label>
                <input id="titulo" type="text" required value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} placeholder="Título do contrato" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="numero" className="text-xs font-medium text-gray-600 dark:text-gray-400">Número</label>
                <input id="numero" type="text" value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} placeholder="Nº do contrato" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="valorTotal" className="text-xs font-medium text-gray-600 dark:text-gray-400">Valor Total</label>
                <input id="valorTotal" type="number" step="0.01" min="0" value={formData.valorTotal} onChange={(e) => setFormData({ ...formData, valorTotal: e.target.value })} placeholder="0,00" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="periodicidade" className="text-xs font-medium text-gray-600 dark:text-gray-400">Periodicidade</label>
                <select id="periodicidade" value={formData.periodicidade} onChange={(e) => setFormData({ ...formData, periodicidade: e.target.value })} className={inputClass}>
                  <option value="">Selecionar</option>
                  {PERIODICIDADE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="status" className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
                <select id="status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={inputClass}>
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="dataInicio" className="text-xs font-medium text-gray-600 dark:text-gray-400">Data Início</label>
                <input id="dataInicio" type="date" value={formData.dataInicio} onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="dataFim" className="text-xs font-medium text-gray-600 dark:text-gray-400">Data Fim</label>
                <input id="dataFim" type="date" value={formData.dataFim} onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                <label htmlFor="descricao" className="text-xs font-medium text-gray-600 dark:text-gray-400">Descrição</label>
                <input id="descricao" type="text" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Breve descrição" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
                <label htmlFor="observacao" className="text-xs font-medium text-gray-600 dark:text-gray-400">Observação</label>
                <textarea id="observacao" rows={2} value={formData.observacao} onChange={(e) => setFormData({ ...formData, observacao: e.target.value })} placeholder="Observações adicionais" className={`${inputClass} resize-none`} />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={submitting} className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                {submitting ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setFormData(EMPTY_FORM) }} className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-fornecedor" className="text-xs font-medium text-gray-600 dark:text-gray-400">Fornecedor</label>
            <select id="filter-fornecedor" value={filterFornecedor} onChange={(e) => setFilterFornecedor(e.target.value)} className={inputClass}>
              <option value="">Todos os fornecedores</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-status" className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
            <select id="filter-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputClass}>
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {(filterFornecedor || filterStatus) && (
            <div className="flex items-end">
              <button onClick={() => { setFilterFornecedor(''); setFilterStatus('') }} className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="md" label="Carregando contratos..." />
          </div>
        ) : contratos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-sm">Nenhum contrato encontrado.</p>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <ul className="divide-y divide-gray-100 dark:divide-gray-700 md:hidden">
              {contratos.map((c) => {
                const isEditing = editingId === c.id
                const expired = isExpired(c)
                return (
                  <li key={c.id} className={`p-4 space-y-3${expired ? ' bg-red-50 dark:bg-red-900/20' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {isEditing && editData ? (
                          <input value={editData.titulo} onChange={(e) => setEditData({ ...editData, titulo: e.target.value })} className={inlineInputClass} />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.titulo}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.fornecedor.nome}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <div><span className="font-medium text-gray-500 dark:text-gray-500">Número:</span> {c.numero ?? '—'}</div>
                      <div><span className="font-medium text-gray-500 dark:text-gray-500">Valor:</span> {formatCurrency(c.valorTotal)}</div>
                      <div><span className="font-medium text-gray-500 dark:text-gray-500">Início:</span> {formatDateBR(c.dataInicio)}</div>
                      <div><span className="font-medium text-gray-500 dark:text-gray-500">Fim:</span> {formatDateBR(c.dataFim)}</div>
                      <div><span className="font-medium text-gray-500 dark:text-gray-500">Periodicidade:</span> {c.periodicidade ?? '—'}</div>
                    </div>
                    {isEditing && editData ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Número</label>
                            <input value={editData.numero ?? ''} onChange={(e) => setEditData({ ...editData, numero: e.target.value || null })} className={inlineInputClass} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Valor Total</label>
                            <input type="number" step="0.01" min="0" value={editData.valorTotal ?? ''} onChange={(e) => setEditData({ ...editData, valorTotal: e.target.value ? parseFloat(e.target.value) : null })} className={inlineInputClass} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data Início</label>
                            <input type="date" value={toInputDate(editData.dataInicio)} onChange={(e) => setEditData({ ...editData, dataInicio: e.target.value || null })} className={inlineInputClass} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data Fim</label>
                            <input type="date" value={toInputDate(editData.dataFim)} onChange={(e) => setEditData({ ...editData, dataFim: e.target.value || null })} className={inlineInputClass} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Periodicidade</label>
                            <select value={editData.periodicidade ?? ''} onChange={(e) => setEditData({ ...editData, periodicidade: e.target.value || null })} className={inlineInputClass}>
                              <option value="">—</option>
                              {PERIODICIDADE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
                            <select value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className={inlineInputClass}>
                              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSave} disabled={saving} className="flex-1 rounded py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50">{saving ? '...' : 'Salvar'}</button>
                          <button onClick={cancelEditing} className="flex-1 rounded py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => startEditing(c)} className="flex-1 rounded py-1.5 text-sm font-medium text-blue-600 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30">Editar</button>
                        <button onClick={() => router.push(`/contratos/${c.id}`)} className="flex-1 rounded py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">Detalhes</button>
                        <button onClick={() => setDeleteConfirm(c.id)} className="flex-1 rounded py-1.5 text-sm font-medium text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30">Excluir</button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            {/* Desktop: tabela */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Fornecedor</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Nº</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Título</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Valor</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Periodicidade</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Início</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Fim</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {contratos.map((c) => {
                    const isEditing = editingId === c.id
                    const expired = isExpired(c)
                    return (
                      <tr key={c.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700${expired ? ' bg-red-50 dark:bg-red-900/20' : ''}`}>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-[140px]">
                          <span className="truncate block" title={c.fornecedor.nome}>{c.fornecedor.nome}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {isEditing && editData ? (
                            <input value={editData.numero ?? ''} onChange={(e) => setEditData({ ...editData, numero: e.target.value || null })} className={inlineInputClass} />
                          ) : (
                            c.numero ?? '—'
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white max-w-[180px]">
                          {isEditing && editData ? (
                            <input value={editData.titulo} onChange={(e) => setEditData({ ...editData, titulo: e.target.value })} className={inlineInputClass} />
                          ) : (
                            <span className="truncate block" title={c.titulo}>{c.titulo}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {isEditing && editData ? (
                            <input type="number" step="0.01" min="0" value={editData.valorTotal ?? ''} onChange={(e) => setEditData({ ...editData, valorTotal: e.target.value ? parseFloat(e.target.value) : null })} className={inlineInputClass} />
                          ) : (
                            formatCurrency(c.valorTotal)
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {isEditing && editData ? (
                            <select value={editData.periodicidade ?? ''} onChange={(e) => setEditData({ ...editData, periodicidade: e.target.value || null })} className={inlineInputClass}>
                              <option value="">—</option>
                              {PERIODICIDADE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                          ) : (
                            PERIODICIDADE_OPTIONS.find((p) => p.value === c.periodicidade)?.label ?? c.periodicidade ?? '—'
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {isEditing && editData ? (
                            <input type="date" value={toInputDate(editData.dataInicio)} onChange={(e) => setEditData({ ...editData, dataInicio: e.target.value || null })} className={inlineInputClass} />
                          ) : (
                            formatDateBR(c.dataInicio)
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {isEditing && editData ? (
                            <input type="date" value={toInputDate(editData.dataFim)} onChange={(e) => setEditData({ ...editData, dataFim: e.target.value || null })} className={inlineInputClass} />
                          ) : (
                            formatDateBR(c.dataFim)
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {isEditing && editData ? (
                            <select value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className={inlineInputClass}>
                              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          ) : (
                            <StatusBadge status={c.status} />
                          )}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1">
                              <button onClick={handleSave} disabled={saving} className="rounded px-2 py-1 text-xs font-medium text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 disabled:opacity-50">
                                {saving ? '...' : 'Salvar'}
                              </button>
                              <button onClick={cancelEditing} className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button onClick={() => startEditing(c)} className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                                Editar
                              </button>
                              <button onClick={() => router.push(`/contratos/${c.id}`)} className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                                Detalhes
                              </button>
                              <button onClick={() => setDeleteConfirm(c.id)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
                                Excluir
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Confirmar exclusão</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting} className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ContratosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><LoadingSpinner size="md" label="Carregando contratos..." /></div>}>
      <ContratosPageInner />
    </Suspense>
  )
}
