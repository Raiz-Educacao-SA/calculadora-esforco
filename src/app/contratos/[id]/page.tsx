'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface Fornecedor {
  id: string
  nome: string
}

interface ContratoDocumento {
  id: string
  nome: string
  tipo: string | null
  url: string | null
  observacao: string | null
  createdAt: string
}

interface Pagamento {
  id: string
  descricao: string
  valor: number
  dataVencimento: string
  dataPagamento: string | null
  status: string
}

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
  fornecedor: Fornecedor
  documentos: ContratoDocumento[]
  pagamentos: Pagamento[]
}

const TIPO_DOC_OPTIONS = [
  { value: 'NF', label: 'Nota Fiscal' },
  { value: 'ADITIVO', label: 'Aditivo' },
  { value: 'CERTIDAO', label: 'Certidão' },
  { value: 'CONTRATO_ORIGINAL', label: 'Contrato Original' },
  { value: 'OUTRO', label: 'Outro' },
]

const statusContratoConfig: Record<string, { label: string; className: string }> = {
  ATIVO: { label: 'Ativo', className: 'bg-green-100 text-green-700 ring-green-200 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-800' },
  ENCERRADO: { label: 'Encerrado', className: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600' },
  SUSPENSO: { label: 'Suspenso', className: 'bg-yellow-100 text-yellow-700 ring-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:ring-yellow-800' },
  RENOVACAO: { label: 'Em Renovação', className: 'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-800' },
}

const statusPagamentoConfig: Record<string, { label: string; className: string }> = {
  PAGO: { label: 'Pago', className: 'bg-green-100 text-green-700 ring-green-200 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-800' },
  PENDENTE: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-700 ring-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:ring-yellow-800' },
  ATRASADO: { label: 'Atrasado', className: 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-800' },
  CANCELADO: { label: 'Cancelado', className: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600' },
}

function StatusBadge({ status, config }: { status: string; config: Record<string, { label: string; className: string }> }) {
  const cfg = config[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function TipoBadge({ tipo }: { tipo: string | null }) {
  if (!tipo) return <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
  const label = TIPO_DOC_OPTIONS.find((t) => t.value === tipo)?.label ?? tipo
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:ring-indigo-800">
      {label}
    </span>
  )
}

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr))
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const EMPTY_DOC_FORM = { nome: '', tipo: '', url: '', observacao: '' }

export default function ContratoDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showDocForm, setShowDocForm] = useState(false)
  const [docForm, setDocForm] = useState(EMPTY_DOC_FORM)
  const [docFile, setDocFile] = useState<File | null>(null)
  const [submittingDoc, setSubmittingDoc] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 5000) }

  const fetchContrato = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/contratos/${id}`, { cache: 'no-store' })
      if (!res.ok) {
        const json = await res.json()
        showError(json.error ?? 'Erro ao carregar contrato.')
        return
      }
      const json = await res.json()
      setContrato(json)
    } catch {
      showError('Erro ao carregar contrato.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchContrato() }, [fetchContrato])

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docForm.nome.trim() && !docFile) { showError('Nome do documento ou arquivo é obrigatório.'); return }
    if (docFile && docFile.size > 3 * 1024 * 1024) { showError('O anexo deve ter no máximo 3 MB.'); return }
    setSubmittingDoc(true)
    try {
      const formData = new FormData()
      formData.append('nome', docForm.nome.trim())
      formData.append('tipo', docForm.tipo)
      formData.append('url', docForm.url)
      formData.append('observacao', docForm.observacao)
      if (docFile) formData.append('arquivo', docFile)

      const res = await fetch(`/api/contratos/${id}/documentos`, {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao adicionar anexo.'); return }
      setDocForm(EMPTY_DOC_FORM)
      setDocFile(null)
      setShowDocForm(false)
      await fetchContrato()
      showSuccess('Anexo adicionado com sucesso.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setSubmittingDoc(false)
    }
  }

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return
    setDeletingDocId(docId)
    try {
      const res = await fetch(`/api/contratos/${id}/documentos/${docId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao excluir anexo.'); return }
      await fetchContrato()
      showSuccess('Anexo excluído com sucesso.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setDeletingDocId(null)
    }
  }

  const inputClass = 'rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" label="Carregando contrato..." />
      </div>
    )
  }

  if (!contrato) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-500">
        <p className="text-sm">Contrato não encontrado.</p>
        <button onClick={() => router.push('/contratos')} className="mt-3 text-sm text-blue-600 hover:underline">
          Voltar para contratos
        </button>
      </div>
    )
  }

  const pagamentosRecentes = contrato.pagamentos.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/contratos')}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-1 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Contratos
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{contrato.titulo}</h1>
          {contrato.numero && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Nº {contrato.numero}</p>
          )}
        </div>
        <button
          onClick={() => router.push('/contratos')}
          className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Editar
        </button>
      </div>

      {/* Banners */}
      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-300">{success}</div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-300">{error}</div>
      )}

      {/* Seção 1: Dados do Contrato */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Dados do Contrato</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Fornecedor</p>
            <button
              onClick={() => router.push('/fornecedores')}
              className="mt-0.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {contrato.fornecedor.nome}
            </button>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Número do Contrato</p>
            <p className="mt-0.5 text-sm text-gray-900 dark:text-white">{contrato.numero ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</p>
            <div className="mt-0.5">
              <StatusBadge status={contrato.status} config={statusContratoConfig} />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Valor Total</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(contrato.valorTotal)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Periodicidade</p>
            <p className="mt-0.5 text-sm text-gray-900 dark:text-white">{contrato.periodicidade ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Data Início</p>
            <p className="mt-0.5 text-sm text-gray-900 dark:text-white">{formatDateBR(contrato.dataInicio)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Data Fim</p>
            <p className="mt-0.5 text-sm text-gray-900 dark:text-white">{formatDateBR(contrato.dataFim)}</p>
          </div>
          {contrato.descricao && (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Descrição</p>
              <p className="mt-0.5 text-sm text-gray-900 dark:text-white">{contrato.descricao}</p>
            </div>
          )}
          {contrato.observacao && (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Observação</p>
              <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{contrato.observacao}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Cadastrado em</p>
            <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
              {new Date(contrato.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Seção 2: Anexos */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Anexos do Contrato
            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">({contrato.documentos.length})</span>
          </h2>
          <button
            onClick={() => setShowDocForm(!showDocForm)}
            className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
          >
            {showDocForm ? 'Fechar' : 'Adicionar'}
          </button>
        </div>

        {showDocForm && (
          <form onSubmit={handleAddDoc} className="mb-5 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="doc-nome" className="text-xs font-medium text-gray-600 dark:text-gray-400">Nome</label>
                <input id="doc-nome" type="text" value={docForm.nome} onChange={(e) => setDocForm({ ...docForm, nome: e.target.value })} placeholder="Nome do anexo" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="doc-tipo" className="text-xs font-medium text-gray-600 dark:text-gray-400">Tipo</label>
                <select id="doc-tipo" value={docForm.tipo} onChange={(e) => setDocForm({ ...docForm, tipo: e.target.value })} className={inputClass}>
                  <option value="">Selecionar tipo</option>
                  {TIPO_DOC_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor="doc-arquivo" className="text-xs font-medium text-gray-600 dark:text-gray-400">Arquivo do anexo</label>
                <input
                  id="doc-arquivo"
                  type="file"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                  className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-teal-900/40 dark:file:text-teal-300`}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500">Limite de 3 MB. Para arquivos maiores, informe um link abaixo.</p>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor="doc-url" className="text-xs font-medium text-gray-600 dark:text-gray-400">Link do anexo</label>
                <input id="doc-url" type="url" value={docForm.url} onChange={(e) => setDocForm({ ...docForm, url: e.target.value })} placeholder="https://..." className={inputClass} />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor="doc-obs" className="text-xs font-medium text-gray-600 dark:text-gray-400">Observação</label>
                <input id="doc-obs" type="text" value={docForm.observacao} onChange={(e) => setDocForm({ ...docForm, observacao: e.target.value })} placeholder="Observação opcional" className={inputClass} />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={submittingDoc} className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                {submittingDoc ? 'Salvando...' : 'Adicionar anexo'}
              </button>
              <button type="button" onClick={() => { setShowDocForm(false); setDocForm(EMPTY_DOC_FORM); setDocFile(null) }} className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {contrato.documentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
            <p className="text-sm">Nenhum anexo cadastrado.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {contrato.documentos.map((doc) => (
              <li key={doc.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{doc.nome}</span>
                    <TipoBadge tipo={doc.tipo} />
                  </div>
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block">
                      Abrir anexo
                    </a>
                  )}
                  {doc.observacao && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{doc.observacao}</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(doc.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteDoc(doc.id)}
                  disabled={deletingDocId === doc.id}
                  className="shrink-0 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                >
                  {deletingDocId === doc.id ? '...' : 'Excluir'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Seção 3: Pagamentos */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Pagamentos
            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">({contrato.pagamentos.length})</span>
          </h2>
          <button
            onClick={() => router.push(`/pagamentos?contratoId=${contrato.id}`)}
            className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Ver todos os pagamentos
          </button>
        </div>

        {pagamentosRecentes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
            <p className="text-sm">Nenhum pagamento cadastrado.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {pagamentosRecentes.map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.descricao}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Vencimento: {formatDateBR(p.dataVencimento)}
                    {p.dataPagamento && ` • Pago: ${formatDateBR(p.dataPagamento)}`}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <StatusBadge status={p.status} config={statusPagamentoConfig} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {contrato.pagamentos.length > 5 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => router.push(`/pagamentos?contratoId=${contrato.id}`)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver todos os {contrato.pagamentos.length} pagamentos
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
