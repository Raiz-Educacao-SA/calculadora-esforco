import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator, AuthError } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const contrato = await prisma.contrato.findUnique({
      where: { id },
      include: {
        fornecedor: true,
        documentos: true,
        pagamentos: {
          take: 5,
          orderBy: { dataVencimento: 'asc' },
          include: {
            fornecedor: { select: { nome: true } },
          },
        },
      },
    })

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    return NextResponse.json(contrato)
  } catch (error) {
    console.error('[GET /api/contratos/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar contrato' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOperator()

    const { id } = await params

    const existing = await prisma.contrato.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const {
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

    const updateData: Record<string, unknown> = {}

    if (numero !== undefined) updateData.numero = numero ?? null
    if (titulo !== undefined) {
      if (typeof titulo !== 'string' || titulo.trim() === '') {
        return NextResponse.json({ error: 'Campo titulo não pode ser vazio' }, { status: 400 })
      }
      updateData.titulo = titulo.trim()
    }
    if (descricao !== undefined) updateData.descricao = descricao ?? null
    if (valorTotal !== undefined) updateData.valorTotal = valorTotal != null ? Number(valorTotal) : null
    if (periodicidade !== undefined) updateData.periodicidade = periodicidade ?? null
    if (dataInicio !== undefined) updateData.dataInicio = dataInicio ? new Date(dataInicio) : null
    if (dataFim !== undefined) updateData.dataFim = dataFim ? new Date(dataFim) : null
    if (status !== undefined) updateData.status = status
    if (observacao !== undefined) updateData.observacao = observacao ?? null

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const updated = await prisma.contrato.update({
      where: { id },
      data: updateData,
      include: {
        fornecedor: { select: { id: true, nome: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PUT /api/contratos/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar contrato' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOperator()

    const { id } = await params

    const existing = await prisma.contrato.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    await prisma.contrato.delete({ where: { id } })

    return NextResponse.json({ message: 'Contrato excluído com sucesso' })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/contratos/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir contrato' }, { status: 500 })
  }
}
