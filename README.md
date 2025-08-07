# ⚽ Futebol Manager - Next.js + Prisma + PostgreSQL

Projeto para gerenciamento de equipes, grupos, jogos e classificação de futebol.

---

## 🚀 Tecnologias utilizadas

- [Next.js](https://nextjs.org/)
- [Prisma ORM](https://www.prisma.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Axios](https://axios-http.com/)

---

## 📦 Instalação

1. Clone ou extraia este repositório.
2. Acesse o diretório do projeto:

```bash
cd futebol-manager
```

3. Instale as dependências:

```bash
npm install
```

4. Instale as dependências adicionais:

```bash
npm install prisma @prisma/client axios
npm install -D tailwindcss postcss autoprefixer
```

---

## ⚙️ Configuração do banco de dados

Edite o arquivo `.env`:

```
DATABASE_URL="postgresql://usuario:senha@leon.tech:5432/seu_banco"
```

Substitua com os dados reais do seu banco.

---

## 🔄 Migrations e geração do cliente Prisma

```bash
npx prisma generate
npx prisma migrate dev --name init
```

---

## 🏃 Executando o projeto

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

---

## 🔗 Funcionalidades e Rotas

- `/equipes/cadastrar` → Cadastrar Equipes
- `/grupos/cadastrar` → Cadastrar Grupos
- `/jogos/cadastrar` → Cadastrar Jogos
- `/jogos/resultados` → Inserir resultados dos jogos
- `/classificacao` → Ver classificação atualizada

---

## 📊 Regras de pontuação

- Vitória: **3 pontos**
- Empate: **1 ponto**
- Derrota: **0 pontos**

Critério de desempate: maior número de vitórias.

---

## 📝 Licença

Este projeto é open-source e você pode usar e modificar livremente.