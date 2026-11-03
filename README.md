# Maputo Renova

Gestão de condomínios para Maputo — cobrança de quotas via M-Pesa, eMola e transferência bancária, com avisos por SMS/email e tesouraria de repasses. Moeda: MZN.

- **Produto e decisões:** [`docs/PRODUCT.md`](docs/PRODUCT.md)
- **Banco de dados:** migrações em [`supabase/migrations/`](supabase/migrations/) (Postgres/Supabase, RLS por papel)
- **Protótipo:** `prototype/` (Fase 0.5 — skillui + impeccable)
- **App de produção:** `app/` (Next.js, após aprovação do protótipo)

## Papéis

| Papel | Acesso |
|---|---|
| Super administrador | Todo o sistema, finanças globais, colaboradores, taxas, repasses |
| Colaborador | Cadastro de condomínios e flats (sem finanças) |
| Gestor | Apenas o seu condomínio: pagamentos, devedores, despesas, avisos |
| Proprietário | Apenas a sua flat: faturas, pagamentos, recibos, avisos |

## Ambientes

- **Supabase:** organização dedicada "Maputo Renova"
- **Vercel:** equipa Nebula Tecnologias (transferível ao cliente na entrega)
- **Domínio:** maputorenova.co.za
