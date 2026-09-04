import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator, AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    await requireOperator()

    const { id, docId } = await params

    const documento = await prisma.contratoDocumento.findFirst({
      where: { id: docId, contratoId: id },
    })

    if (!documento) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    }

    await prisma.contratoDocumento.delete({ where: { id: docId } })

    return NextResponse.json({ message: 'Documento removido com sucesso' })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/contratos/[id]/documentos/[docId]]', error)
    return NextResponse.json({ error: 'Erro ao remover documento' }, { status: 500 })
  }
}
