'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface Pagamento {
  id: string
  descricao: string
  valor: number
  dataVencimento: string
  dataPagamento: string | null
  status: string
  observacao: string | null
  createdAt: string
  fornecedor: { id: string; nome: string }
  contrato: { id: string; titulo: string } | null
}

interface Fornecedor {
  id: string
  nome: string
}

interface Contrato {
  id: string
  titulo: string
}

const STATUS_OPTIONS = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'PAGO', label: 'Pago' },
  { value: 'ATRASADO', label: 'Atrasado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

const statusConfig: Record<string, { label: string; className: string }> = {
  PAGO: { label: 'Pago', className: 'bg-green-100 text-green-700 ring-green-200 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-800' },
  PENDENTE: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-700 ring-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:ring-yellow-800' },
  ATRASADO: { label: 'Atrasado', className: 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-800' },
  CANCELADO: { label: 'Cancelado', className: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cfg.className}`}>
      {cfg.label}
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

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const isOverdue = (p: Pagamento) =>
  p.status === 'PENDENTE' && new Date(p.dataVencimento) < new Date()

const EMPTY_FORM = {
  fornecedorId: '',
  contratoId: '',
  descricao: '',
  valor: '',
  dataVencimento: '',
  dataPagamento: '',
  status: 'PENDENTE',
  observacao: '',
}

function PagamentosPageInner() {
  const searchParams = useSearchParams()

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [filterFornecedor, setFilterFornecedor] = useState('')
  const [filterContrato, setFilterContrato] = useState(searchParams.get('contratoId') ?? '')
  const [filterStatus, setFilterStatus] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formContratos, setFormContratos] = useState<Contrato[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Pagamento | null>(null)
  const [saving, setSaving] = useState(false)
  const [markingPagoId, setMarkingPagoId] = useState<string | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 5000) }

  const fetchPagamentos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterFornecedor) params.set('fornecedorId', filterFornecedor)
      if (filterContrato) params.set('contratoId', filterContrato)
      if (filterStatus) params.set('status', filterStatus)
      const query = params.toString()
      const res = await fetch(`/api/pagamentos${query ? `?${query}` : ''}`, { cache: 'no-store' })
      const json = await res.json()
      setPagamentos(Array.isArray(json) ? json : [])
    } catch {
      showError('Erro ao carregar pagamentos.')
    } finally {
      setLoading(false)
    }
  }, [filterFornecedor, filterContrato, filterStatus])

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

  // Ao selecionar fornecedor no filtro, carrega contratos daquele fornecedor
  useEffect(() => {
    if (!filterFornecedor) {
      setContratos([])
      return
    }
    async function fetchContratosFilter() {
      try {
        const res = await fetch(`/api/contratos?fornecedorId=${filterFornecedor}`)
        const json = await res.json()
        setContratos(Array.isArray(json) ? json : [])
      } catch { /* not critical */ }
    }
    fetchContratosFilter()
  }, [filterFornecedor])

  // Ao selecionar fornecedor no formulário, carrega contratos para o select do form
  useEffect(() => {
    if (!formData.fornecedorId) {
      setFormContratos([])
      setFormData((prev) => ({ ...prev, contratoId: '' }))
      return
    }
    async function fetchFormContratos() {
      try {
        const res = await fetch(`/api/contratos?fornecedorId=${formData.fornecedorId}`)
        const json = await res.json()
        setFormContratos(Array.isArray(json) ? json : [])
      } catch { /* not critical */ }
    }
    fetchFormContratos()
  }, [formData.fornecedorId])

  useEffect(() => { fetchPagamentos() }, [fetchPagamentos])

  // KPIs
  const totalAPagar = pagamentos
    .filter((p) => ['PENDENTE', 'ATRASADO'].includes(p.status))
    .reduce((s, p) => s + p.valor, 0)

  const mesAtual = new Date().getMonth()
  const anoAtual = new Date().getFullYear()
  const totalPagoMes = pagamentos
    .filter((p) =>
      p.status === 'PAGO' &&
      p.dataPagamento != null &&
      new Date(p.dataPagamento).getMonth() === mesAtual &&
      new Date(p.dataPagamento).getFullYear() === anoAtual
    )
    .reduce((s, p) => s + p.valor, 0)

  const qtdAtrasados = pagamentos.filter((p) => p.status === 'ATRASADO').length

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.descricao.trim()) { showError('Descrição é obrigatória.'); return }
    if (!formData.fornecedorId) { showError('Fornecedor é obrigatório.'); return }
    if (!formData.valor) { showError('Valor é obrigatório.'); return }
    if (!formData.dataVencimento) { showError('Data de vencimento é obrigatória.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fornecedorId: formData.fornecedorId,
          contratoId: formData.contratoId || null,
          descricao: formData.descricao.trim(),
          valor: parseFloat(formData.valor),
          dataVencimento: formData.dataVencimento,
          dataPagamento: formData.dataPagamento || null,
          status: formData.status,
          observacao: formData.observacao || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao criar pagamento.'); return }
      setFormData(EMPTY_FORM)
      setShowForm(false)
      await fetchPagamentos()
      showSuccess('Pagamento criado com sucesso.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setSubmitting(false)
    }
  }

  const startEditing = (p: Pagamento) => {
    setEditingId(p.id)
    setEditData({ ...p })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditData(null)
  }

  const handleSave = async () => {
    if (!editData || !editingId) return
    if (!editData.descricao.trim()) { showError('Descrição é obrigatória.'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/pagamentos/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: editData.descricao.trim(),
          valor: editData.valor,
          dataVencimento: editData.dataVencimento,
          dataPagamento: editData.dataPagamento || null,
          status: editData.status,
          observacao: editData.observacao || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao salvar.'); return }
      setEditingId(null)
      setEditData(null)
      await fetchPagamentos()
      showSuccess('Pagamento atualizado com sucesso.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkPago = async (id: string) => {
    setMarkingPagoId(id)
    try {
      const res = await fetch(`/api/pagamentos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAGO', dataPagamento: new Date().toISOString() }),
      })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao marcar como pago.'); return }
      await fetchPagamentos()
      showSuccess('Pagamento marcado como pago.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setMarkingPagoId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/pagamentos/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao excluir.'); return }
      setDeleteConfirm(null)
      await fetchPagamentos()
      showSuccess('Pagamento excluído com sucesso.')
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Pagamentos</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestão de pagamentos a fornecedores.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); if (showForm) setFormData(EMPTY_FORM) }}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          {showForm ? 'Fechar' : 'Novo Pagamento'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-xs font-medium text-red-700 dark:text-red-400">A Pagar</p>
          <p className="mt-1 text-xl font-bold text-red-900 dark:text-red-200">{formatCurrency(totalAPagar)}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Pendente + Atrasado</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-xs font-medium text-green-700 dark:text-green-400">Pago no Mês</p>
          <p className="mt-1 text-xl font-bold text-green-900 dark:text-green-200">{formatCurrency(totalPagoMes)}</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Mês atual</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Atrasados</p>
          <p className="mt-1 text-xl font-bold text-yellow-900 dark:text-yellow-200">{qtdAtrasados}</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">pagamentos em atraso</p>
        </div>
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
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Novo Pagamento</h2>
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
                <label htmlFor="contratoId" className="text-xs font-medium text-gray-600 dark:text-gray-400">Contrato</label>
                <select id="contratoId" value={formData.contratoId} onChange={(e) => setFormData({ ...formData, contratoId: e.target.value })} disabled={!formData.fornecedorId} className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}>
                  <option value="">Selecionar contrato</option>
                  {formContratos.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="descricao" className="text-xs font-medium text-gray-600 dark:text-gray-400">Descrição <span className="text-red-500">*</span></label>
                <input id="descricao" type="text" required value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Descrição do pagamento" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="valor" className="text-xs font-medium text-gray-600 dark:text-gray-400">Valor <span className="text-red-500">*</span></label>
                <input id="valor" type="number" step="0.01" min="0" required value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} placeholder="0,00" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="dataVencimento" className="text-xs font-medium text-gray-600 dark:text-gray-400">Data Vencimento <span className="text-red-500">*</span></label>
                <input id="dataVencimento" type="date" required value={formData.dataVencimento} onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="dataPagamento" className="text-xs font-medium text-gray-600 dark:text-gray-400">Data Pagamento</label>
                <input id="dataPagamento" type="date" value={formData.dataPagamento} onChange={(e) => setFormData({ ...formData, dataPagamento: e.target.value })} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="status" className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
                <select id="status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={inputClass}>
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor="observacao" className="text-xs font-medium text-gray-600 dark:text-gray-400">Observação</label>
                <input id="observacao" type="text" value={formData.observacao} onChange={(e) => setFormData({ ...formData, observacao: e.target.value })} placeholder="Observações adicionais" className={inputClass} />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-fornecedor" className="text-xs font-medium text-gray-600 dark:text-gray-400">Fornecedor</label>
            <select id="filter-fornecedor" value={filterFornecedor} onChange={(e) => { setFilterFornecedor(e.target.value); setFilterContrato('') }} className={inputClass}>
              <option value="">Todos os fornecedores</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-contrato" className="text-xs font-medium text-gray-600 dark:text-gray-400">Contrato</label>
            <select id="filter-contrato" value={filterContrato} onChange={(e) => setFilterContrato(e.target.value)} disabled={!filterFornecedor && contratos.length === 0 && !filterContrato} className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}>
              <option value="">Todos os contratos</option>
              {contratos.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-status" className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
            <select id="filter-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputClass}>
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {(filterFornecedor || filterContrato || filterStatus) && (
            <div className="flex items-end">
              <button onClick={() => { setFilterFornecedor(''); setFilterContrato(''); setFilterStatus('') }} className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
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
            <LoadingSpinner size="md" label="Carregando pagamentos..." />
          </div>
        ) : pagamentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-sm">Nenhum pagamento encontrado.</p>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <ul className="divide-y divide-gray-100 dark:divide-gray-700 md:hidden">
              {pagamentos.map((p) => {
                const isEditing = editingId === p.id
                const overdue = isOverdue(p)
                return (
                  <li key={p.id} className={`p-4 space-y-3${overdue ? ' bg-red-50 dark:bg-red-900/20' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {isEditing && editData ? (
                          <input value={editData.descricao} onChange={(e) => setEditData({ ...editData, descricao: e.target.value })} className={inlineInputClass} />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.descricao}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.fornecedor.nome}</p>
                        {p.contrato && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{p.contrato.titulo}</p>
                        )}
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <div><span className="font-medium text-gray-500 dark:text-gray-500">Valor:</span> <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(p.valor)}</span></div>
                      <div><span className="font-medium text-gray-500 dark:text-gray-500">Vencimento:</span> {formatDateBR(p.dataVencimento)}</div>
                      <div><span className="font-medium text-gray-500 dark:text-gray-500">Pagamento:</span> {formatDateBR(p.dataPagamento)}</div>
                    </div>
                    {isEditing && editData ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Valor</label>
                            <input type="number" step="0.01" min="0" value={editData.valor} onChange={(e) => setEditData({ ...editData, valor: parseFloat(e.target.value) || 0 })} className={inlineInputClass} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
                            <select value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className={inlineInputClass}>
                              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Vencimento</label>
                            <input type="date" value={toInputDate(editData.dataVencimento)} onChange={(e) => setEditData({ ...editData, dataVencimento: e.target.value })} className={inlineInputClass} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data Pagamento</label>
                            <input type="date" value={toInputDate(editData.dataPagamento)} onChange={(e) => setEditData({ ...editData, dataPagamento: e.target.value || null })} className={inlineInputClass} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSave} disabled={saving} className="flex-1 rounded py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50">{saving ? '...' : 'Salvar'}</button>
                          <button onClick={cancelEditing} className="flex-1 rounded py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => startEditing(p)} className="flex-1 rounded py-1.5 text-sm font-medium text-blue-600 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30">Editar</button>
                        {p.status !== 'PAGO' && p.status !== 'CANCELADO' && (
                          <button onClick={() => handleMarkPago(p.id)} disabled={markingPagoId === p.id} className="flex-1 rounded py-1.5 text-sm font-medium text-green-600 border border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/30 disabled:opacity-50">
                            {markingPagoId === p.id ? '...' : 'Marcar Pago'}
                          </button>
                        )}
                        <button onClick={() => setDeleteConfirm(p.id)} className="flex-1 rounded py-1.5 text-sm font-medium text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30">Excluir</button>
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
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Contrato</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Descrição</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Valor</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Vencimento</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Pagamento</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {pagamentos.map((p) => {
                    const isEditing = editingId === p.id
                    const overdue = isOverdue(p)
                    return (
                      <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700${overdue ? ' bg-red-50 dark:bg-red-900/20' : ''}`}>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-[140px]">
                          <span className="truncate block" title={p.fornecedor.nome}>{p.fornecedor.nome}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-[140px]">
                          <span className="truncate block" title={p.contrato?.titulo}>{p.contrato?.titulo ?? '—'}</span>
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white max-w-[180px]">
                          {isEditing && editData ? (
                            <input value={editData.descricao} onChange={(e) => setEditData({ ...editData, descricao: e.target.value })} className={inlineInputClass} />
                          ) : (
                            <span className="truncate block" title={p.descricao}>{p.descricao}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          {isEditing && editData ? (
                            <input type="number" step="0.01" min="0" value={editData.valor} onChange={(e) => setEditData({ ...editData, valor: parseFloat(e.target.value) || 0 })} className={inlineInputClass} />
                          ) : (
                            formatCurrency(p.valor)
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {isEditing && editData ? (
                            <input type="date" value={toInputDate(editData.dataVencimento)} onChange={(e) => setEditData({ ...editData, dataVencimento: e.target.value })} className={inlineInputClass} />
                          ) : (
                            formatDateBR(p.dataVencimento)
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {isEditing && editData ? (
                            <input type="date" value={toInputDate(editData.dataPagamento)} onChange={(e) => setEditData({ ...editData, dataPagamento: e.target.value || null })} className={inlineInputClass} />
                          ) : (
                            formatDateBR(p.dataPagamento)
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {isEditing && editData ? (
                            <select value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className={inlineInputClass}>
                              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          ) : (
                            <StatusBadge status={p.status} />
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
                              <button onClick={() => startEditing(p)} className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                                Editar
                              </button>
                              {p.status !== 'PAGO' && p.status !== 'CANCELADO' && (
                                <button onClick={() => handleMarkPago(p.id)} disabled={markingPagoId === p.id} className="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 disabled:opacity-50">
                                  {markingPagoId === p.id ? '...' : 'Marcar Pago'}
                                </button>
                              )}
                              <button onClick={() => setDeleteConfirm(p.id)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
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
                Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.
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

export default function PagamentosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><LoadingSpinner size="md" label="Carregando pagamentos..." /></div>}>
      <PagamentosPageInner />
    </Suspense>
  )
}
