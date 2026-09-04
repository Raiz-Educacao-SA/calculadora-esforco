import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator, AuthError } from '@/lib/auth'

export const runtime = 'nodejs'

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024

async function parseAttachment(file: File) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Arquivo excede o limite de 3 MB')
  }

  const bytes = await file.arrayBuffer()
  return {
    arquivoNome: file.name,
    arquivoTipo: file.type || 'application/octet-stream',
    arquivoBytes: file.size,
    arquivoBase64: Buffer.from(bytes).toString('base64'),
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const contrato = await prisma.contrato.findUnique({ where: { id } })
    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    const documentos = await prisma.contratoDocumento.findMany({
      where: { contratoId: id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(documentos)
  } catch (error) {
    console.error('[GET /api/contratos/[id]/documentos]', error)
    return NextResponse.json({ error: 'Erro ao listar documentos' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOperator()

    const { id } = await params

    const contrato = await prisma.contrato.findUnique({ where: { id } })
    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    const contentType = request.headers.get('content-type') ?? ''
    let nome: unknown
    let tipo: unknown
    let url: unknown
    let observacao: unknown
    let arquivoData: Awaited<ReturnType<typeof parseAttachment>> | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const arquivo = formData.get('arquivo')

      nome = formData.get('nome')
      tipo = formData.get('tipo')
      url = formData.get('url')
      observacao = formData.get('observacao')

      if (arquivo instanceof File && arquivo.size > 0) {
        arquivoData = await parseAttachment(arquivo)
        if (!nome || typeof nome !== 'string' || nome.trim() === '') {
          nome = arquivo.name
        }
      }
    } else {
      const body = await request.json()
      nome = body.nome
      tipo = body.tipo
      url = body.url
      observacao = body.observacao
    }

    if (!nome || typeof nome !== 'string' || nome.trim() === '') {
      return NextResponse.json({ error: 'Campo nome é obrigatório' }, { status: 400 })
    }

    const documento = await prisma.contratoDocumento.create({
      data: {
        contratoId: id,
        nome: nome.trim(),
        tipo: typeof tipo === 'string' && tipo.trim() ? tipo.trim() : null,
        url: typeof url === 'string' && url.trim() ? url.trim() : null,
        observacao: typeof observacao === 'string' && observacao.trim() ? observacao.trim() : null,
        arquivoNome: arquivoData?.arquivoNome ?? null,
        arquivoTipo: arquivoData?.arquivoTipo ?? null,
        arquivoBytes: arquivoData?.arquivoBytes ?? null,
        arquivoBase64: arquivoData?.arquivoBase64 ?? null,
      },
    })

    if (arquivoData) {
      const updated = await prisma.contratoDocumento.update({
        where: { id: documento.id },
        data: { url: `/api/contratos/${id}/documentos/${documento.id}/arquivo` },
      })
      return NextResponse.json(updated, { status: 201 })
    }

    return NextResponse.json(documento, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof Error && error.message === 'Arquivo excede o limite de 3 MB') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[POST /api/contratos/[id]/documentos]', error)
    return NextResponse.json({ error: 'Erro ao adicionar documento' }, { status: 500 })
  }
}
