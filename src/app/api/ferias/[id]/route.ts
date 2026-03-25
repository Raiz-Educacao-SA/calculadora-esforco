import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, ROLES, AuthError } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.role === ROLES.VIEWER) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.ferias.findUnique({
      where: { id },
      include: { funcionario: { select: { userId: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Férias não encontradas' }, { status: 404 })
    }

    // OPERATOR can only edit ferias for their own funcionario
    if (session.role === ROLES.OPERATOR) {
      if (existing.funcionario.userId !== session.userId) {
        return NextResponse.json({ error: 'Operador só pode editar férias do próprio colaborador' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { dataInicio, dataFim, observacao } = body

    if (dataInicio && dataFim && new Date(dataFim) < new Date(dataInicio)) {
      return NextResponse.json({ error: 'Data fim não pode ser anterior à data início' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (dataInicio !== undefined) data.dataInicio = new Date(dataInicio)
    if (dataFim !== undefined) data.dataFim = new Date(dataFim)
    if (observacao !== undefined) data.observacao = observacao?.trim() || null

    const ferias = await prisma.ferias.update({
      where: { id },
      data,
      include: {
        funcionario: {
          select: {
            id: true,
            nome: true,
            area: { select: { nome: true } },
          },
        },
      },
    })

    return NextResponse.json(ferias)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PUT /api/ferias/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar férias' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.role === ROLES.VIEWER) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.ferias.findUnique({
      where: { id },
      include: { funcionario: { select: { userId: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Férias não encontradas' }, { status: 404 })
    }

    // OPERATOR can only delete ferias for their own funcionario
    if (session.role === ROLES.OPERATOR) {
      if (existing.funcionario.userId !== session.userId) {
        return NextResponse.json({ error: 'Operador só pode excluir férias do próprio colaborador' }, { status: 403 })
      }
    }

    await prisma.ferias.delete({ where: { id } })

    return NextResponse.json({ message: 'Férias excluídas com sucesso' })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/ferias/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir férias' }, { status: 500 })
  }
}
