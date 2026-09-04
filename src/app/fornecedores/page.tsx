'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface Fornecedor {
  id: string
  nome: string
  cnpj: string | null
  email: string | null
  telefone: string | null
  categoria: string | null
  contato: string | null
  observacao: string | null
  ativo: boolean
  createdAt: string
}

const CATEGORIA_OPTIONS = [
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'SERVICO', label: 'Serviço' },
  { value: 'CONSULTORIA', label: 'Consultoria' },
  { value: 'HARDWARE', label: 'Hardware' },
  { value: 'OUTRO', label: 'Outro' },
]

const categoriaConfig: Record<string, { label: string; className: string }> = {
  SOFTWARE: { label: 'Software', className: 'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-800' },
  SERVICO: { label: 'Serviço', className: 'bg-green-100 text-green-700 ring-green-200 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-800' },
  CONSULTORIA: { label: 'Consultoria', className: 'bg-purple-100 text-purple-700 ring-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:ring-purple-800' },
  HARDWARE: { label: 'Hardware', className: 'bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:ring-orange-800' },
  OUTRO: { label: 'Outro', className: 'bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600' },
}

function CategoriaBadge({ categoria }: { categoria: string | null }) {
  if (!categoria) return <span className="text-gray-400 dark:text-gray-500">—</span>
  const config = categoriaConfig[categoria] ?? categoriaConfig.OUTRO
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.className}`}>
      {config.label}
    </span>
  )
}

function StatusAtivoBadge({ ativo }: { ativo: boolean }) {
  return ativo ? (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset bg-green-100 text-green-700 ring-green-200 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-800">
      Ativo
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:ring-gray-600">
      Inativo
    </span>
  )
}

const EMPTY_FORM = {
  nome: '',
  cnpj: '',
  email: '',
  telefone: '',
  categoria: '',
  contato: '',
  observacao: '',
}

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [filterNome, setFilterNome] = useState('')
  const [filterAtivo, setFilterAtivo] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Fornecedor | null>(null)
  const [saving, setSaving] = useState(false)

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 5000) }

  const fetchFornecedores = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/fornecedores', { cache: 'no-store' })
      const json = await res.json()
      setFornecedores(Array.isArray(json) ? json : [])
    } catch {
      showError('Erro ao carregar fornecedores.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFornecedores() }, [fetchFornecedores])

  const filteredFornecedores = fornecedores.filter((f) => {
    if (filterNome && !f.nome.toLowerCase().includes(filterNome.toLowerCase())) return false
    if (filterAtivo === 'true' && !f.ativo) return false
    if (filterAtivo === 'false' && f.ativo) return false
    return true
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome.trim()) { showError('Nome é obrigatório.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/fornecedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.nome.trim(),
          cnpj: formData.cnpj || null,
          email: formData.email || null,
          telefone: formData.telefone || null,
          categoria: formData.categoria || null,
          contato: formData.contato || null,
          observacao: formData.observacao || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao criar fornecedor.'); return }
      setFormData(EMPTY_FORM)
      setShowForm(false)
      await fetchFornecedores()
      showSuccess('Fornecedor criado com sucesso.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setSubmitting(false)
    }
  }

  const startEditing = (f: Fornecedor) => {
    setEditingId(f.id)
    setEditData({ ...f })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditData(null)
  }

  const handleSave = async () => {
    if (!editData || !editingId) return
    if (!editData.nome.trim()) { showError('Nome é obrigatório.'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/fornecedores/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: editData.nome.trim(),
          cnpj: editData.cnpj || null,
          email: editData.email || null,
          telefone: editData.telefone || null,
          categoria: editData.categoria || null,
          contato: editData.contato || null,
          observacao: editData.observacao || null,
          ativo: editData.ativo,
        }),
      })
      const json = await res.json()
      if (!res.ok) { showError(json.error ?? 'Erro ao salvar.'); return }
      setEditingId(null)
      setEditData(null)
      await fetchFornecedores()
      showSuccess('Fornecedor atualizado com sucesso.')
    } catch {
      showError('Erro de conexão.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500'
  const inlineInputClass = 'rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500 w-full'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Fornecedores</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestão de fornecedores e parceiros.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); if (showForm) setFormData(EMPTY_FORM) }}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          {showForm ? 'Fechar' : 'Novo Fornecedor'}
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
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Novo Fornecedor</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="nome" className="text-xs font-medium text-gray-600 dark:text-gray-400">Nome <span className="text-red-500">*</span></label>
                <input id="nome" type="text" required value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Nome do fornecedor" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="cnpj" className="text-xs font-medium text-gray-600 dark:text-gray-400">CNPJ</label>
                <input id="cnpj" type="text" value={formData.cnpj} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} placeholder="00.000.000/0000-00" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="categoria" className="text-xs font-medium text-gray-600 dark:text-gray-400">Categoria</label>
                <select id="categoria" value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} className={inputClass}>
                  <option value="">Selecionar categoria</option>
                  {CATEGORIA_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-xs font-medium text-gray-600 dark:text-gray-400">Email</label>
                <input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="contato@empresa.com" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="telefone" className="text-xs font-medium text-gray-600 dark:text-gray-400">Telefone</label>
                <input id="telefone" type="text" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} placeholder="(11) 99999-9999" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="contato" className="text-xs font-medium text-gray-600 dark:text-gray-400">Contato Principal</label>
                <input id="contato" type="text" value={formData.contato} onChange={(e) => setFormData({ ...formData, contato: e.target.value })} placeholder="Nome do contato" className={inputClass} />
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
            <label htmlFor="filter-nome" className="text-xs font-medium text-gray-600 dark:text-gray-400">Nome</label>
            <input id="filter-nome" type="text" value={filterNome} onChange={(e) => setFilterNome(e.target.value)} placeholder="Buscar por nome" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-ativo" className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
            <select id="filter-ativo" value={filterAtivo} onChange={(e) => setFilterAtivo(e.target.value)} className={inputClass}>
              <option value="">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </div>
          {(filterNome || filterAtivo) && (
            <div className="flex items-end">
              <button onClick={() => { setFilterNome(''); setFilterAtivo('') }} className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
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
            <LoadingSpinner size="md" label="Carregando fornecedores..." />
          </div>
        ) : filteredFornecedores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-sm">Nenhum fornecedor encontrado.</p>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <ul className="divide-y divide-gray-100 dark:divide-gray-700 md:hidden">
              {filteredFornecedores.map((f) => {
                const isEditing = editingId === f.id
                return (
                  <li key={f.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {isEditing && editData ? (
                          <input value={editData.nome} onChange={(e) => setEditData({ ...editData, nome: e.target.value })} className={inlineInputClass} />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{f.nome}</p>
                        )}
                      </div>
                      <StatusAtivoBadge ativo={f.ativo} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium text-gray-500 dark:text-gray-500">Categoria:</span>{' '}
                        {isEditing && editData ? (
                          <select value={editData.categoria ?? ''} onChange={(e) => setEditData({ ...editData, categoria: e.target.value || null })} className={inlineInputClass}>
                            <option value="">—</option>
                            {CATEGORIA_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        ) : (
                          <CategoriaBadge categoria={f.categoria} />
                        )}
                      </div>
                      <div><span className="font-medium text-gray-500 dark:text-gray-500">Contato:</span> {f.contato ?? '—'}</div>
                      <div className="col-span-2"><span className="font-medium text-gray-500 dark:text-gray-500">Email:</span> {f.email ?? '—'}</div>
                      <div><span className="font-medium text-gray-500 dark:text-gray-500">Telefone:</span> {f.telefone ?? '—'}</div>
                      <div><span className="font-medium text-gray-500 dark:text-gray-500">CNPJ:</span> {f.cnpj ?? '—'}</div>
                    </div>
                    {isEditing && editData ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Email</label>
                            <input type="email" value={editData.email ?? ''} onChange={(e) => setEditData({ ...editData, email: e.target.value || null })} className={inlineInputClass} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Telefone</label>
                            <input type="text" value={editData.telefone ?? ''} onChange={(e) => setEditData({ ...editData, telefone: e.target.value || null })} className={inlineInputClass} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">CNPJ</label>
                            <input type="text" value={editData.cnpj ?? ''} onChange={(e) => setEditData({ ...editData, cnpj: e.target.value || null })} className={inlineInputClass} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Contato</label>
                            <input type="text" value={editData.contato ?? ''} onChange={(e) => setEditData({ ...editData, contato: e.target.value || null })} className={inlineInputClass} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
                          <select value={editData.ativo ? 'true' : 'false'} onChange={(e) => setEditData({ ...editData, ativo: e.target.value === 'true' })} className={inlineInputClass}>
                            <option value="true">Ativo</option>
                            <option value="false">Inativo</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSave} disabled={saving} className="flex-1 rounded py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50">{saving ? '...' : 'Salvar'}</button>
                          <button onClick={cancelEditing} className="flex-1 rounded py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => startEditing(f)} className="flex-1 rounded py-1.5 text-sm font-medium text-blue-600 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30">Editar</button>
                        <Link href={`/contratos?fornecedorId=${f.id}`} className="flex-1 rounded py-1.5 text-sm font-medium text-center text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          Ver Contratos
                        </Link>
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
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Nome</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">CNPJ</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Categoria</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Contato</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Email</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Telefone</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {filteredFornecedores.map((f) => {
                    const isEditing = editingId === f.id
                    return (
                      <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white max-w-[180px]">
                          {isEditing && editData ? (
                            <input value={editData.nome} onChange={(e) => setEditData({ ...editData, nome: e.target.value })} className={inlineInputClass} />
                          ) : (
                            <span className="truncate block" title={f.nome}>{f.nome}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {isEditing && editData ? (
                            <input value={editData.cnpj ?? ''} onChange={(e) => setEditData({ ...editData, cnpj: e.target.value || null })} className={inlineInputClass} placeholder="00.000.000/0000-00" />
                          ) : (
                            f.cnpj ?? '—'
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {isEditing && editData ? (
                            <select value={editData.categoria ?? ''} onChange={(e) => setEditData({ ...editData, categoria: e.target.value || null })} className={inlineInputClass}>
                              <option value="">—</option>
                              {CATEGORIA_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                          ) : (
                            <CategoriaBadge categoria={f.categoria} />
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-[120px]">
                          {isEditing && editData ? (
                            <input value={editData.contato ?? ''} onChange={(e) => setEditData({ ...editData, contato: e.target.value || null })} className={inlineInputClass} />
                          ) : (
                            <span className="truncate block" title={f.contato ?? undefined}>{f.contato ?? '—'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-[160px]">
                          {isEditing && editData ? (
                            <input type="email" value={editData.email ?? ''} onChange={(e) => setEditData({ ...editData, email: e.target.value || null })} className={inlineInputClass} />
                          ) : (
                            <span className="truncate block" title={f.email ?? undefined}>{f.email ?? '—'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {isEditing && editData ? (
                            <input value={editData.telefone ?? ''} onChange={(e) => setEditData({ ...editData, telefone: e.target.value || null })} className={inlineInputClass} />
                          ) : (
                            f.telefone ?? '—'
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {isEditing && editData ? (
                            <select value={editData.ativo ? 'true' : 'false'} onChange={(e) => setEditData({ ...editData, ativo: e.target.value === 'true' })} className={inlineInputClass}>
                              <option value="true">Ativo</option>
                              <option value="false">Inativo</option>
                            </select>
                          ) : (
                            <StatusAtivoBadge ativo={f.ativo} />
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
                              <button onClick={() => startEditing(f)} className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                                Editar
                              </button>
                              <Link href={`/contratos?fornecedorId=${f.id}`} className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                                Ver Contratos
                              </Link>
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
    </div>
  )
}
