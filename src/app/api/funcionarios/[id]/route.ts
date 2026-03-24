import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getSession, ROLES, AuthError } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const funcionario = await prisma.funcionario.findUnique({
      where: { id },
      include: { area: { select: { id: true, nome: true } } },
    })
    if (!funcionario) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }
    return NextResponse.json(funcionario)
  } catch (error) {
    console.error('[GET /api/funcionarios/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar funcionário' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    // Only ADMIN can update funcionarios; OPERATOR can only do so for their own via ferias flow
    if (session.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { nome, cargo, ativo, areaId, userId } = body

    if (nome !== undefined && !nome?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (nome !== undefined) data.nome = nome.trim()
    if (cargo !== undefined) data.cargo = cargo?.trim() || null
    if (ativo !== undefined) data.ativo = ativo
    if (areaId !== undefined) data.areaId = areaId || null
    if (userId !== undefined) data.userId = userId || null

    const funcionario = await prisma.funcionario.update({
      where: { id },
      data,
      include: {
        area: { select: { id: true, nome: true } },
        user: { select: { id: true, nome: true, email: true } },
      },
    })

    return NextResponse.json(funcionario)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PUT /api/funcionarios/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar funcionário' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params

    await prisma.funcionario.delete({ where: { id } })

    return NextResponse.json({ message: 'Funcionário excluído com sucesso' })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/funcionarios/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir funcionário' }, { status: 500 })
  }
}
