import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import fs from "fs/promises";
import path from "path";
import cron from "node-cron";

interface BackupSchedule {
  enabled: boolean;
  time: string;
  frequency: string;
  lastRun?: string;
  nextRun?: string;
}

let scheduledTask: any = null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // ✅ CORREÇÃO: Usar getServerSession corretamente
    const session = await getServerSession(req, res, authOptions);

    console.log("🔍 Verificando sessão...");
    console.log("Session exists:", !!session);
    console.log("User role:", session?.user?.role);

    if (!session) {
      console.log("❌ Sessão não encontrada");
      return res.status(401).json({ error: "Não autorizado" });
    }

    if (session.user?.role !== "admin") {
      console.log("❌ Usuário não é admin:", session.user?.role);
      return res.status(403).json({ error: "Acesso negado" });
    }

    console.log("✅ Usuário admin autorizado:", session.user?.email);

    const configPath = path.join(process.cwd(), "backup-schedule.json");

    if (req.method === "POST") {
      const { enabled, time, frequency } = req.body;

      if (typeof enabled !== "boolean" || !time || !frequency) {
        return res.status(400).json({ error: "Dados inválidos" });
      }

      const schedule: BackupSchedule = {
        enabled,
        time,
        frequency,
        lastRun: undefined,
        nextRun: enabled ? getNextRunTime(time, frequency) : undefined,
      };

      await fs.writeFile(configPath, JSON.stringify(schedule, null, 2));

      if (enabled) {
        setupCronJob(time, frequency);
        console.log(`✅ Backup agendado: ${frequency} às ${time}`);
      } else {
        stopCronJob();
        console.log("⏹️ Backup automático desabilitado");
      }

      return res.status(200).json({
        message: enabled
          ? `Backup agendado para ${frequency} às ${time}`
          : "Backup automático desabilitado",
        schedule,
      });
    }

    if (req.method === "GET") {
      try {
        const configData = await fs.readFile(configPath, "utf-8");
        const schedule = JSON.parse(configData);
        return res.status(200).json(schedule);
      } catch (error) {
        return res.status(200).json({
          enabled: false,
          time: "02:00",
          frequency: "daily",
        });
      }
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (error) {
    console.error("❌ Erro na API de agendamento:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

function getNextRunTime(time: string, frequency: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();
  const nextRun = new Date();

  nextRun.setHours(hours, minutes, 0, 0);

  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  if (frequency === "weekly") {
    const daysUntilSunday = (7 - nextRun.getDay()) % 7;
    if (daysUntilSunday === 0 && nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 7);
    } else {
      nextRun.setDate(nextRun.getDate() + daysUntilSunday);
    }
  }

  return nextRun.toISOString();
}

function setupCronJob(time: string, frequency: string) {
  stopCronJob();

  const [hours, minutes] = time.split(":");
  let cronExpression = "";

  switch (frequency) {
    case "daily":
      cronExpression = `${minutes} ${hours} * * *`;
      break;
    case "weekly":
      cronExpression = `${minutes} ${hours} * * 0`;
      break;
    case "monday":
      cronExpression = `${minutes} ${hours} * * 1`;
      break;
    case "friday":
      cronExpression = `${minutes} ${hours} * * 5`;
      break;
    default:
      cronExpression = `${minutes} ${hours} * * *`;
  }

  console.log(`🕐 Configurando cron: ${cronExpression}`);

  // ✅ VERSÃO SIMPLIFICADA sem opções problemáticas
  scheduledTask = cron.schedule(cronExpression, async () => {
    console.log("🔄 Executando backup automático...");
    await executeBackup();
  });
}

function stopCronJob() {
  if (scheduledTask) {
    scheduledTask.stop();
    //scheduledTask.destroy();
    scheduledTask = null;
    console.log("⏹️ Cron job parado");
  }
}

async function executeBackup() {
  try {
    const { prisma } = await import("../../../../lib/prisma");

    const [users, equipes, jogadores, jogos, grupos] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissoes: true,
          createdAt: true,
        },
      }),
      prisma.equipe.findMany(),
      prisma.jogador.findMany(),
      prisma.jogo.findMany(),
      prisma.grupo.findMany(),
    ]);

    const backupData = {
      metadata: {
        createdAt: new Date().toISOString(),
        type: "automatic",
        version: "1.0",
        system: "LHPSYSTEMS-2025",
      },
      data: {
        users,
        equipes,
        jogadores,
        jogos,
        grupos,
      },
      statistics: {
        totalRecords:
          users.length +
          equipes.length +
          jogadores.length +
          jogos.length +
          grupos.length,
      },
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-auto-${timestamp}.json`;
    const backupPath = path.join(process.cwd(), "backups", filename);

    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

    console.log(`✅ Backup automático criado: ${filename}`);

    const configPath = path.join(process.cwd(), "backup-schedule.json");
    try {
      const configData = await fs.readFile(configPath, "utf-8");
      const schedule = JSON.parse(configData);
      schedule.lastRun = new Date().toISOString();
      await fs.writeFile(configPath, JSON.stringify(schedule, null, 2));
    } catch (error) {
      console.error("Erro ao atualizar configuração:", error);
    }
  } catch (error) {
    console.error("❌ Erro no backup automático:", error);
  }
}
