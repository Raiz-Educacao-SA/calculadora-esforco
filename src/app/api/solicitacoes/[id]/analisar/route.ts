import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAIProvider } from '@/lib/ai'
import { MockProvider } from '@/lib/ai/mock-provider'
import { makeEffortKey } from '@/lib/services/effort-calculator'
import { logAudit } from '@/lib/services/audit'
import { recalculateBacklogItemForSolicitacao } from '@/lib/services/prioritization'
import type { AIAnalysisRequest, AIAnalysisResponse, ComponenteParaIA, CriterioParaIA } from '@/lib/ai/types'

export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. Get solicitacao
    const solicitacao = await prisma.solicitacao.findUnique({
      where: { id },
      include: { area: true },
    })

    if (!solicitacao) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    // 2. Get active criterios for the area with their complexidades
    const criteriosDB = await prisma.criterio.findMany({
      where: { areaId: solicitacao.areaId, ativo: true },
      include: {
        complexidades: {
          where: { ativo: true },
          orderBy: { ordem: 'asc' },
        },
      },
    })

    if (criteriosDB.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum critério ativo cadastrado para esta área' },
        { status: 400 }
      )
    }

    // 3. Get active components for the area
    const componentesDB = await prisma.componente.findMany({
      where: { areaId: solicitacao.areaId, ativo: true },
    })

    const componentesParaIA: ComponenteParaIA[] = componentesDB.map(c => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao,
    }))

    // 4. Get all active esforcos and build map (keyed by criterioId:complexidadeId:componenteId)
    const esforcos = await prisma.esforco.findMany({
      where: {
        criterioId: { in: criteriosDB.map(c => c.id) },
        ativo: true,
      },
    })

    const effortsMap = new Map<string, number>()
    for (const e of esforcos) {
      effortsMap.set(makeEffortKey(e.criterioId, e.complexidadeId, e.componenteId), e.valorEsforco)
    }

    const lookupValorEsforco = (
      criterioId: string,
      complexidadeId: string,
      componenteId?: string | null
    ) => {
      const exact = effortsMap.get(makeEffortKey(criterioId, complexidadeId, componenteId))
      if (exact !== undefined) return exact

      const generic = effortsMap.get(makeEffortKey(criterioId, complexidadeId, null))
      if (generic !== undefined) return generic

      return (
        esforcos.find(
          (e) => e.criterioId === criterioId && e.complexidadeId === complexidadeId
        )?.valorEsforco ?? 0
      )
    }

    // 5. Build AI request
    const criteriosParaIA: CriterioParaIA[] = criteriosDB.map(c => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao,
      complexidades: c.complexidades.map(cx => ({
        id: cx.id,
        nome: cx.nome,
        descricao: cx.descricao,
        ordem: cx.ordem,
      })),
    }))

    // 6. Call AI provider. If the configured provider fails or returns nothing usable,
    // fall back to the local heuristic provider so re-estimation remains available.
    const analysisRequest: AIAnalysisRequest = {
      titulo: solicitacao.titulo,
      descricao: solicitacao.descricao,
      contexto: solicitacao.contexto ?? undefined,
      areaNome: solicitacao.area.nome,
      criterios: criteriosParaIA,
      componentes: componentesParaIA.length > 0 ? componentesParaIA : undefined,
    }

    let analise: AIAnalysisResponse
    let usedFallback = false

    try {
      const provider = getAIProvider()
      analise = await provider.analyze(analysisRequest)
    } catch (providerError) {
      console.warn(
        `[analisar] Provider principal falhou para solicitação ${id}; usando fallback local:`,
        providerError instanceof Error ? providerError.message : providerError
      )
      analise = await new MockProvider().analyze(analysisRequest)
      usedFallback = true
    }

    if (analise.criteriosSugeridos.length === 0) {
      console.warn(`[analisar] Provider retornou 0 critérios para solicitação ${id}; usando fallback local.`)
      analise = await new MockProvider().analyze(analysisRequest)
      usedFallback = true
    }

    console.log(`[analisar] IA retornou ${analise.criteriosSugeridos.length} critérios para solicitação ${id}`)

    if (analise.criteriosSugeridos.length === 0) {
      return NextResponse.json(
        {
          error: 'Não foi possível gerar uma estimativa porque não há critérios com complexidades válidas para esta área. Os critérios atuais foram preservados.',
          analise: {
            observacoes: analise.observacoes,
            confiancaGeral: analise.confiancaGeral,
          },
        },
        { status: 422 }
      )
    }

    const sugestoesUnicas = Array.from(
      new Map(
        analise.criteriosSugeridos.map((sugestao) => [
          `${sugestao.criterioId}:${sugestao.componenteId ?? 'null'}`,
          sugestao,
        ])
      ).values()
    )

    const criteriosParaCriar = sugestoesUnicas.map((sugestao) => {
      const valorEsforco = lookupValorEsforco(
        sugestao.criterioId,
        sugestao.complexidadeId,
        sugestao.componenteId
      )

      return { sugestao, valorEsforco }
    })

    // 7-9. Replace criteria and update total atomically so the current memory is preserved if any write fails.
    const { criteriosCriados, esforcoTotal } = await prisma.$transaction(async (tx) => {
      await tx.solicitacaoCriterio.deleteMany({
        where: { solicitacaoId: id },
      })

      let total = 0
      const created = []

      for (const { sugestao, valorEsforco } of criteriosParaCriar) {
        const record = await tx.solicitacaoCriterio.create({
          data: {
            solicitacaoId: id,
            criterioId: sugestao.criterioId,
            complexidadeId: sugestao.complexidadeId,
            componenteId: sugestao.componenteId ?? null,
            valorEsforco,
            fonte: 'IA',
            justificativa: sugestao.justificativa,
            confianca: sugestao.confianca,
          },
          include: {
            criterio: { select: { id: true, nome: true } },
            complexidade: { select: { id: true, nome: true } },
            componente: { select: { id: true, nome: true } },
          },
        })

        total += valorEsforco
        created.push(record)
      }

      await tx.solicitacao.update({
        where: { id },
        data: {
          esforcoTotal: total,
          status: solicitacao.esforcoAprovado ? 'APROVADO' : 'ESTIMADO',
        },
      })

      return { criteriosCriados: created, esforcoTotal: total }
    })

    await recalculateBacklogItemForSolicitacao(id, esforcoTotal)

    // 10. Audit
    await logAudit({
      entidade: 'Solicitacao',
      entidadeId: id,
      acao: 'ANALISE_IA',
      dadosNovos: {
        esforcoTotal,
        criteriosCount: criteriosCriados.length,
        confiancaGeral: analise.confiancaGeral,
        fallbackLocal: usedFallback,
      },
    })

    return NextResponse.json({
      analise: {
        observacoes: analise.observacoes,
        confiancaGeral: analise.confiancaGeral,
        fallbackLocal: usedFallback,
      },
      criterios: criteriosCriados,
      esforcoTotal,
    })
  } catch (error) {
    console.error('[POST /api/solicitacoes/[id]/analisar]', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: `Erro ao analisar solicitação: ${message}` }, { status: 500 })
  }
}
