import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function contentDisposition(fileName: string) {
  const fallback = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '')
  const encoded = encodeURIComponent(fileName)
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params

    const documento = await prisma.contratoDocumento.findFirst({
      where: { id: docId, contratoId: id },
    })

    if (!documento?.arquivoBase64 || !documento.arquivoNome) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    const fileBuffer = Buffer.from(documento.arquivoBase64, 'base64')

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': documento.arquivoTipo ?? 'application/octet-stream',
        'Content-Length': String(documento.arquivoBytes ?? fileBuffer.byteLength),
        'Content-Disposition': contentDisposition(documento.arquivoNome),
      },
    })
  } catch (error) {
    console.error('[GET /api/contratos/[id]/documentos/[docId]/arquivo]', error)
    return NextResponse.json({ error: 'Erro ao baixar arquivo' }, { status: 500 })
  }
}
