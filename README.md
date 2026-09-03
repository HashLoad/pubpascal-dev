This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## CI agendado — liga/desliga (pré-launch)

Os workflows agendados (**Esteira sync** e **Sponsorship expiry**) estão **DESATIVADOS**
enquanto o portal não tem receita — sem publicações de terceiros nem assinaturas pagas,
rodar agenda é só queimar minutos de Actions.

```bash
# Ver o estado de tudo
gh workflow list --all

# DESLIGAR (estado atual)
gh workflow disable esteira-sync.yml
gh workflow disable sponsorship-expiry.yml

# LIGAR de volta (quando o portal tiver tráfego real)
gh workflow enable esteira-sync.yml
gh workflow enable sponsorship-expiry.yml

# Publicou um pacote e quer validar AGORA (sem religar a agenda):
gh workflow enable esteira-sync.yml && gh workflow run esteira-sync.yml && gh workflow disable esteira-sync.yml
```

Notas:
- Workflow desativado não dispara por agenda **nem manual** — por isso o "enable && run && disable" acima.
- As cadências dentro dos `.yml` já estão no modo pré-launch (esteira manual-only, expiry mensal);
  ao religar para valer, restaure as cadências originais indicadas nos comentários de cada arquivo.
- `Verify Build & Lint` e `Quality Gates` ficam ativos — só rodam em push/PR (atividade sua).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
