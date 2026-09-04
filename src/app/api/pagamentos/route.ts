import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator, AuthError } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fornecedorId = searchParams.get('fornecedorId')
    const contratoId = searchParams.get('contratoId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (fornecedorId) where.fornecedorId = fornecedorId
    if (contratoId) where.contratoId = contratoId
    if (status) where.status = status

    const pagamentos = await prisma.pagamento.findMany({
      where,
      include: {
        fornecedor: { select: { id: true, nome: true } },
        contrato: { select: { id: true, titulo: true } },
      },
      orderBy: { dataVencimento: 'asc' },
    })

    return NextResponse.json(pagamentos)
  } catch (error) {
    console.error('[GET /api/pagamentos]', error)
    return NextResponse.json({ error: 'Erro ao listar pagamentos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOperator()

    const body = await request.json()
    const {
      fornecedorId,
      contratoId,
      descricao,
      valor,
      dataVencimento,
      dataPagamento,
      status,
      observacao,
    } = body

    if (!fornecedorId || typeof fornecedorId !== 'string') {
      return NextResponse.json({ error: 'Campo fornecedorId é obrigatório' }, { status: 400 })
    }

    if (!descricao || typeof descricao !== 'string' || descricao.trim() === '') {
      return NextResponse.json({ error: 'Campo descricao é obrigatório' }, { status: 400 })
    }

    if (valor == null) {
      return NextResponse.json({ error: 'Campo valor é obrigatório' }, { status: 400 })
    }

    if (!dataVencimento) {
      return NextResponse.json({ error: 'Campo dataVencimento é obrigatório' }, { status: 400 })
    }

    const fornecedor = await prisma.fornecedor.findUnique({ where: { id: fornecedorId } })
    if (!fornecedor) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 })
    }

    if (contratoId) {
      const contrato = await prisma.contrato.findFirst({
        where: { id: contratoId, fornecedorId },
      })
      if (!contrato) {
        return NextResponse.json(
          { error: 'Contrato não encontrado ou não pertence ao fornecedor informado' },
          { status: 404 }
        )
      }
    }

    const pagamento = await prisma.pagamento.create({
      data: {
        fornecedorId,
        contratoId: contratoId ?? null,
        descricao: descricao.trim(),
        valor: Number(valor),
        dataVencimento: new Date(dataVencimento),
        dataPagamento: dataPagamento ? new Date(dataPagamento) : null,
        status: status ?? 'PENDENTE',
        observacao: observacao ?? null,
      },
      include: {
        fornecedor: { select: { id: true, nome: true } },
        contrato: { select: { id: true, titulo: true } },
      },
    })

    return NextResponse.json(pagamento, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/pagamentos]', error)
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 })
  }
}
