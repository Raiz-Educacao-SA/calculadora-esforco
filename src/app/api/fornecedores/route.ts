import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator, AuthError } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ativo = searchParams.get('ativo')

    const where: Record<string, unknown> = {}
    if (ativo === 'false') where.ativo = false
    else where.ativo = true

    const fornecedores = await prisma.fornecedor.findMany({
      where,
      orderBy: { nome: 'asc' },
    })

    return NextResponse.json(fornecedores)
  } catch (error) {
    console.error('[GET /api/fornecedores]', error)
    return NextResponse.json({ error: 'Erro ao listar fornecedores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOperator()

    const body = await request.json()
    const { nome, cnpj, email, telefone, site, categoria, contato, observacao } = body

    if (!nome || typeof nome !== 'string' || nome.trim() === '') {
      return NextResponse.json({ error: 'Campo nome é obrigatório' }, { status: 400 })
    }

    if (cnpj) {
      const existing = await prisma.fornecedor.findFirst({ where: { cnpj } })
      if (existing) {
        return NextResponse.json({ error: 'CNPJ já cadastrado' }, { status: 400 })
      }
    }

    const fornecedor = await prisma.fornecedor.create({
      data: {
        nome: nome.trim(),
        cnpj: cnpj ?? null,
        email: email ?? null,
        telefone: telefone ?? null,
        site: site ?? null,
        categoria: categoria ?? null,
        contato: contato ?? null,
        observacao: observacao ?? null,
        ativo: true,
      },
    })

    return NextResponse.json(fornecedor, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/fornecedores]', error)
    return NextResponse.json({ error: 'Erro ao criar fornecedor' }, { status: 500 })
  }
}
