import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator, AuthError } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const pagamento = await prisma.pagamento.findUnique({
      where: { id },
      include: {
        fornecedor: { select: { id: true, nome: true } },
        contrato: { select: { id: true, titulo: true } },
      },
    })

    if (!pagamento) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }

    return NextResponse.json(pagamento)
  } catch (error) {
    console.error('[GET /api/pagamentos/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar pagamento' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOperator()

    const { id } = await params

    const existing = await prisma.pagamento.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const {
      descricao,
      valor,
      dataVencimento,
      dataPagamento,
      status,
      observacao,
      contratoId,
    } = body

    const updateData: Record<string, unknown> = {}

    if (descricao !== undefined) updateData.descricao = descricao ?? null
    if (valor !== undefined) updateData.valor = valor != null ? Number(valor) : null
    if (dataVencimento !== undefined) updateData.dataVencimento = dataVencimento ? new Date(dataVencimento) : null
    if (contratoId !== undefined) updateData.contratoId = contratoId ?? null
    if (observacao !== undefined) updateData.observacao = observacao ?? null
    if (status !== undefined) updateData.status = status

    // dataPagamento handling:
    // - explicit null in body → clear the field
    // - valid string → convert to Date
    // - status === 'PAGO' and dataPagamento not provided → auto-set to now
    if ('dataPagamento' in body) {
      updateData.dataPagamento = dataPagamento ? new Date(dataPagamento) : null
    } else if (status === 'PAGO') {
      updateData.dataPagamento = new Date()
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const updated = await prisma.pagamento.update({ where: { id }, data: updateData })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PUT /api/pagamentos/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar pagamento' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOperator()

    const { id } = await params

    const existing = await prisma.pagamento.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }

    await prisma.pagamento.delete({ where: { id } })

    return NextResponse.json({ message: 'Pagamento excluído com sucesso' })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/pagamentos/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir pagamento' }, { status: 500 })
  }
}
