import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator, AuthError } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id },
      include: {
        contratos: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { pagamentos: true },
        },
      },
    })

    if (!fornecedor) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 })
    }

    return NextResponse.json(fornecedor)
  } catch (error) {
    console.error('[GET /api/fornecedores/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar fornecedor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOperator()

    const { id } = await params

    const existing = await prisma.fornecedor.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { nome, cnpj, email, telefone, site, categoria, contato, observacao, ativo } = body

    const updateData: Record<string, unknown> = {}

    if (nome !== undefined) {
      if (typeof nome !== 'string' || nome.trim() === '') {
        return NextResponse.json({ error: 'Campo nome não pode ser vazio' }, { status: 400 })
      }
      updateData.nome = nome.trim()
    }

    if (cnpj !== undefined) {
      if (cnpj && cnpj !== existing.cnpj) {
        const duplicate = await prisma.fornecedor.findFirst({
          where: { cnpj, id: { not: id } },
        })
        if (duplicate) {
          return NextResponse.json({ error: 'CNPJ já cadastrado em outro fornecedor' }, { status: 400 })
        }
      }
      updateData.cnpj = cnpj ?? null
    }

    if (email !== undefined) updateData.email = email ?? null
    if (telefone !== undefined) updateData.telefone = telefone ?? null
    if (site !== undefined) updateData.site = site ?? null
    if (categoria !== undefined) updateData.categoria = categoria ?? null
    if (contato !== undefined) updateData.contato = contato ?? null
    if (observacao !== undefined) updateData.observacao = observacao ?? null
    if (ativo !== undefined) updateData.ativo = Boolean(ativo)

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const updated = await prisma.fornecedor.update({ where: { id }, data: updateData })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PUT /api/fornecedores/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar fornecedor' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOperator()

    const { id } = await params

    const existing = await prisma.fornecedor.findUnique({
      where: { id },
      include: { _count: { select: { contratos: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 })
    }

    if (existing._count.contratos > 0) {
      const updated = await prisma.fornecedor.update({
        where: { id },
        data: { ativo: false },
      })
      return NextResponse.json(updated)
    }

    await prisma.fornecedor.delete({ where: { id } })

    return NextResponse.json({ message: 'Fornecedor excluído com sucesso' })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/fornecedores/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir fornecedor' }, { status: 500 })
  }
}
