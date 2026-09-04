import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator, AuthError } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fornecedorId = searchParams.get('fornecedorId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (fornecedorId) where.fornecedorId = fornecedorId
    if (status) where.status = status

    const contratos = await prisma.contrato.findMany({
      where,
      include: {
        fornecedor: { select: { id: true, nome: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(contratos)
  } catch (error) {
    console.error('[GET /api/contratos]', error)
    return NextResponse.json({ error: 'Erro ao listar contratos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOperator()

    const body = await request.json()
    const {
      fornecedorId,
      numero,
      titulo,
      descricao,
      valorTotal,
      periodicidade,
      dataInicio,
      dataFim,
      status,
      observacao,
    } = body

    if (!fornecedorId || typeof fornecedorId !== 'string') {
      return NextResponse.json({ error: 'Campo fornecedorId é obrigatório' }, { status: 400 })
    }

    if (!titulo || typeof titulo !== 'string' || titulo.trim() === '') {
      return NextResponse.json({ error: 'Campo titulo é obrigatório' }, { status: 400 })
    }

    const fornecedor = await prisma.fornecedor.findUnique({ where: { id: fornecedorId } })
    if (!fornecedor) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 })
    }

    const contrato = await prisma.contrato.create({
      data: {
        fornecedorId,
        numero: numero ?? null,
        titulo: titulo.trim(),
        descricao: descricao ?? null,
        valorTotal: valorTotal != null ? Number(valorTotal) : null,
        periodicidade: periodicidade ?? null,
        dataInicio: dataInicio ? new Date(dataInicio) : null,
        dataFim: dataFim ? new Date(dataFim) : null,
        status: status ?? 'ATIVO',
        observacao: observacao ?? null,
      },
      include: {
        fornecedor: { select: { id: true, nome: true } },
      },
    })

    return NextResponse.json(contrato, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/contratos]', error)
    return NextResponse.json({ error: 'Erro ao criar contrato' }, { status: 500 })
  }
}
