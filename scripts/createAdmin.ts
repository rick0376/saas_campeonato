//npx ts-node scripts/createAdmin.ts

import { prisma } from "../lib/prisma";
import { hash } from "bcryptjs";

async function main() {
  const email = "admin@lhp.com";
  const senha = "admin123";

  console.log("🚀 Iniciando criação/correção do Super Administrador...");

  // Remove admin existente se houver
  console.log("🗑️ Removendo admin existente...");
  await prisma.user.deleteMany({ where: { email } });

  const senhaHash = await hash(senha, 12);

  // ✅ CORREÇÃO: Criar admin global com clientId explicitamente null
  const admin = await prisma.user.create({
    data: {
      email,
      password: senhaHash,
      role: "admin",
      name: "Administrador Global",
      clientId: null, // ✅ GARANTIR que seja null verdadeiro
      permissoes: JSON.stringify({
        usuarios: {
          visualizar: true,
          criar: true,
          editar: true,
          excluir: true,
        },
        equipes: { visualizar: true, criar: true, editar: true, excluir: true },
        jogadores: {
          visualizar: true,
          criar: true,
          editar: true,
          excluir: true,
        },
        grupos: { visualizar: true, criar: true, editar: true, excluir: true },
        jogos: { visualizar: true, criar: true, editar: true, excluir: true },
        classificacao: { visualizar: true },
        relatorios: { visualizar: true },
        admin: { visualizar: true, criar: true, editar: true, excluir: true },
        clientes: {
          visualizar: true,
          criar: true,
          editar: true,
          excluir: true,
        },
        backup: {
          visualizar: true,
          criar: true,
          restaurar: true,
          excluir: true,
        },
      }),
    },
  });

  // ✅ VERIFICAÇÃO: Confirmar que foi criado corretamente
  console.log("🔍 Verificando dados criados:");
  console.log("ID:", admin.id);
  console.log("Email:", admin.email);
  console.log("Role:", admin.role);
  console.log("ClientId:", admin.clientId);
  console.log("ClientId Type:", typeof admin.clientId);
  console.log("Is null?:", admin.clientId === null);

  console.log("");
  console.log("✅ Admin global criado com sucesso!");
  console.log("📧 Email: admin@lhp.com");
  console.log("🔑 Senha: admin123");
  console.log(
    "🌐 Tipo: Super Administrador (pode gerenciar todos os clientes)"
  );
  console.log(
    "🆔 ClientId:",
    admin.clientId === null ? "NULL ✅" : `"${admin.clientId}" ❌`
  );
  console.log("");
  console.log("🎯 Próximos passos:");
  console.log("1. Faça logout se estiver logado");
  console.log("2. Faça login em http://localhost:3000");
  console.log("3. Vá para /cadastrar/clients");
  console.log("4. Teste criar um cliente");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Erro ao criar admin:", e);
    process.exit(1);
  });
