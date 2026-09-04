import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, ROLES, AuthError } from '@/lib/auth'

function parseDateOnlyToUTCNoon(value: string): Date {
  const [year, month, day] = value.split('T')[0].split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.role === ROLES.VIEWER) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const ferias = await prisma.ferias.findMany({
      include: {
        funcionario: {
          select: {
            id: true,
            nome: true,
            area: { select: { nome: true } },
          },
        },
      },
      orderBy: [{ dataInicio: 'asc' }, { funcionario: { nome: 'asc' } }],
    })

    return NextResponse.json(ferias)
  } catch (error) {
    console.error('[GET /api/ferias]', error)
    return NextResponse.json({ error: 'Erro ao listar férias' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.role === ROLES.VIEWER) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { funcionarioId, dataInicio, dataFim, observacao } = body

    if (!funcionarioId) {
      return NextResponse.json({ error: 'funcionarioId é obrigatório' }, { status: 400 })
    }
    if (!dataInicio || !dataFim) {
      return NextResponse.json({ error: 'Data início e data fim são obrigatórias' }, { status: 400 })
    }
    const inicio = parseDateOnlyToUTCNoon(dataInicio)
    const fim = parseDateOnlyToUTCNoon(dataFim)

    if (fim < inicio) {
      return NextResponse.json({ error: 'Data fim não pode ser anterior à data início' }, { status: 400 })
    }

    // OPERATOR can only create ferias for their own funcionario
    if (session.role === ROLES.OPERATOR) {
      const funcionario = await prisma.funcionario.findUnique({ where: { id: funcionarioId } })
      if (!funcionario || funcionario.userId !== session.userId) {
        return NextResponse.json({ error: 'Operador só pode registrar férias para o próprio colaborador' }, { status: 403 })
      }
    }

    const ferias = await prisma.ferias.create({
      data: {
        funcionarioId,
        dataInicio: inicio,
        dataFim: fim,
        observacao: observacao?.trim() || null,
      },
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

    return NextResponse.json(ferias, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/ferias]', error)
    return NextResponse.json({ error: 'Erro ao criar férias' }, { status: 500 })
  }
}
