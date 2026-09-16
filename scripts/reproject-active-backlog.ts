/** Operational reconciliation. Preview rolls back; --apply commits with audit records. */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, type Prisma } from '../src/generated/prisma/client'
import { reprojectBacklog } from '../src/lib/services/scheduling'
import { dailyProjectCapacity, DEFAULT_ALLOCATION_CONFIG, dateOnly } from '../src/lib/services/capacity'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const values = (flag: string) => args.flatMap((arg, index) => arg === flag ? [args[index + 1]] : [])
const actor = values('--actor')[0]?.trim()
const reason = values('--reason')[0]?.trim()
const internIds = [...new Set(values('--intern-id'))]
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--apply') continue
  if (!['--actor', '--reason', '--intern-id'].includes(args[index]) || !args[index + 1] || args[index + 1].startsWith('--')) {
    throw new Error('Uso: npx tsx scripts/reproject-active-backlog.ts [--intern-id ID] [--apply --actor EMAIL --reason MOTIVO]')
  }
  index++
}
if (apply && (!actor || !reason)) throw new Error('A aplicação exige --actor e --reason para auditoria')

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!connectionString) throw new Error('Configure DIRECT_URL ou DATABASE_URL')
const databaseUrl = new URL(connectionString)
// Match the project's explicit TLS setting instead of a conflicting URL sslmode.
databaseUrl.searchParams.delete('sslmode')
const prisma = new PrismaClient({ adapter: new PrismaPg({
  connectionString: databaseUrl.toString(), ssl: { rejectUnauthorized: false },
}) })

const selection = {
  id: true, status: true, dataInicio: true, previsaoConclusao: true,
  dataConclusao: true, responsavelId: true,
  responsavel: { select: { id: true, nome: true, ativo: true, estagiario: true } },
  solicitacao: { select: { titulo: true, esforcoTotal: true } },
  alocacoes: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: {
    id: true, funcionarioId: true, backlogItemId: true, dataInicio: true, dataFim: true, horasDiarias: true,
  } },
} satisfies Prisma.BacklogItemSelect

type Activity = Prisma.BacklogItemGetPayload<{ select: typeof selection }>
const calendarDay = (value: Date | null) => value ? dateOnly(value).toISOString().slice(0, 10) : null
const snapshot = (item: Activity) => ({
  status: item.status, dataInicio: item.dataInicio, previsaoConclusao: item.previsaoConclusao,
  dataConclusao: item.dataConclusao, responsavelId: item.responsavelId,
  esforcoTotal: item.solicitacao.esforcoTotal, alocacoes: item.alocacoes,
})
type Report = {
  modo: string
  configuracao: { horasDiarias: number; percentualAlocacao: number }
  estagiarios: Array<{ id: string; nome: string; antes: boolean; depois: boolean; capacidadeDiaria: number }>
  atividades: Array<{ id: string; titulo: string; responsavel: string; esforcoHoras: number; capacidadeDiaria: number; previsaoAnterior: string | null; previsaoNova: string | null; alterada: boolean }>
  registrosAuditoria: number
}
class PreviewOnly extends Error { constructor(public report: Report) { super('Prévia revertida') } }

async function execute(): Promise<Report> {
  return prisma.$transaction(async (tx) => {
    const config = await tx.alocacaoConfig.findFirst() ?? DEFAULT_ALLOCATION_CONFIG
    const interns = await tx.funcionario.findMany({
      where: { id: { in: internIds } }, select: { id: true, nome: true, cargo: true, ativo: true, estagiario: true },
      orderBy: { id: 'asc' },
    })
    if (interns.length !== internIds.length) throw new Error('Um dos colaboradores informados não existe')
    for (const employee of interns) {
      const role = (employee.cargo ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
      if (!employee.ativo || !/^estagiari[oa](?:\s|$)/.test(role)) {
        throw new Error(`Confira o cadastro antes de marcar Estagiário: ${employee.nome}`)
      }
    }
    const before = await tx.backlogItem.findMany({ where: { status: 'EM_ANDAMENTO' }, select: selection, orderBy: { id: 'asc' } })
    const report: Report = {
      modo: apply ? 'APLICADO' : 'PREVIA_SEM_GRAVACAO',
      configuracao: { horasDiarias: config.horasDiarias, percentualAlocacao: config.percentualAlocacao },
      estagiarios: [], atividades: [], registrosAuditoria: 0,
    }
    for (const employee of interns) {
      if (!employee.estagiario) {
        await tx.funcionario.update({ where: { id: employee.id }, data: { estagiario: true } })
        if (apply) {
          await tx.auditLog.create({ data: {
            entidade: 'Funcionario', entidadeId: employee.id, acao: 'UPDATE', usuario: actor!,
            dadosAnteriores: JSON.stringify({ estagiario: false, cargo: employee.cargo }),
            dadosNovos: JSON.stringify({ estagiario: true, cargo: employee.cargo, motivo: reason, origem: 'reproject-active-backlog' }),
          } })
          report.registrosAuditoria++
        }
      }
      report.estagiarios.push({ id: employee.id, nome: employee.nome, antes: employee.estagiario, depois: true,
        capacidadeDiaria: dailyProjectCapacity({ ...employee, estagiario: true }, config) })
    }
    for (const item of before) {
      const employee = item.responsavel
      if (!employee?.ativo || !item.dataInicio || !(item.solicitacao.esforcoTotal! > 0)
        || !Number.isFinite(item.solicitacao.esforcoTotal)
        || !(dailyProjectCapacity(employee, config) > 0)) {
        throw new Error(`Atividade em andamento com dados incompletos: ${item.solicitacao.titulo}. Corrija início, responsável ativo, esforço e capacidade antes de reaplicar.`)
      }
      dateOnly(item.dataInicio)
    }
    const responsibleIds = [...new Set(before.map((item) => item.responsavelId!))]
    await reprojectBacklog(tx, responsibleIds)
    const after = await tx.backlogItem.findMany({ where: { id: { in: before.map((item) => item.id) } }, select: selection, orderBy: { id: 'asc' } })
    for (const previous of before) {
      const current = after.find((item) => item.id === previous.id)!
      if (current.status !== previous.status || current.solicitacao.esforcoTotal !== previous.solicitacao.esforcoTotal
        || current.dataInicio?.getTime() !== previous.dataInicio?.getTime()
        || current.dataConclusao?.getTime() !== previous.dataConclusao?.getTime()
        || current.responsavelId !== previous.responsavelId) {
        throw new Error('O recálculo alterou dados fora do planejamento; operação revertida')
      }
      const changed = JSON.stringify(snapshot(previous)) !== JSON.stringify(snapshot(current))
      report.atividades.push({ id: current.id, titulo: current.solicitacao.titulo,
        responsavel: current.responsavel!.nome, esforcoHoras: current.solicitacao.esforcoTotal!,
        capacidadeDiaria: dailyProjectCapacity(current.responsavel!, config),
        previsaoAnterior: calendarDay(previous.previsaoConclusao), previsaoNova: calendarDay(current.previsaoConclusao), alterada: changed,
      })
      if (apply && changed) {
        await tx.auditLog.create({ data: {
          entidade: 'BacklogItem', entidadeId: current.id, acao: 'UPDATE', usuario: actor!,
          dadosAnteriores: JSON.stringify(snapshot(previous)),
          dadosNovos: JSON.stringify({ ...snapshot(current), motivo: reason, origem: 'reproject-active-backlog' }),
        } })
        report.registrosAuditoria++
      }
    }
    if (!apply) throw new PreviewOnly(report)
    return report
  }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 30_000 })
}

async function main() {
  for (let attempt = 0; ; attempt++) {
    try { console.log(JSON.stringify(await execute(), null, 2)); return }
    catch (error) {
      if (error instanceof PreviewOnly) { console.log(JSON.stringify(error.report, null, 2)); return }
      if (attempt < 2 && typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034') continue
      throw error
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Falha no recálculo')
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
