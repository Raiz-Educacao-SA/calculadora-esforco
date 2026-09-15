import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, AuthError } from '@/lib/auth'

export async function GET() {
  try {
    const funcionarios = await prisma.funcionario.findMany({
      orderBy: { nome: 'asc' },
      include: {
        area: { select: { id: true, nome: true } },
      },
    })
    return NextResponse.json(funcionarios)
  } catch (error) {
    console.error('[GET /api/funcionarios]', error)
    return NextResponse.json({ error: 'Erro ao listar colaboradores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { nome, cargo, areaId, estagiario = false } = body

    if (typeof estagiario !== 'boolean') return NextResponse.json({ error: 'estagiario deve ser verdadeiro ou falso' }, { status: 400 })

    if (!nome?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const funcionario = await prisma.funcionario.create({
      data: {
        nome: nome.trim(),
        estagiario,
        cargo: cargo?.trim() || null,
        areaId: areaId || null,
      },
      include: {
        area: { select: { id: true, nome: true } },
      },
    })

    return NextResponse.json(funcionario, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/funcionarios]', error)
    return NextResponse.json({ error: 'Erro ao criar colaborador' }, { status: 500 })
  }
}
