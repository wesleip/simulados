# Simulados LPI

Aplicação web para praticar para as certificações do **Linux Professional Institute (LPI)**. Oferece simulados de múltipla escolha com timer, navegação livre entre questões e correção automática ao final. Inclui uma área administrativa com estatísticas de desempenho.

## Funcionalidades

- Simulados com 54 questões de múltipla escolha (suporte a questões de resposta única e múltipla)
- Timer de 60 minutos com alertas visuais nos últimos 5 minutos
- Mapa de questões para navegação direta e barra de progresso em tempo real
- Página de resultados com aprovação/reprovação e filtro de questões erradas
- Dashboard administrativo com métricas e gráfico de distribuição de acertos

## Tecnologias

- **Backend:** Node.js, Express 5, SQLite3
- **Frontend:** EJS, Tailwind CSS (build compilado)
- **Autenticação:** express-session + bcrypt

## Instalação

```bash
git clone https://gitlab.com/WesleiPaulo/simulados.git
cd simulados
npm install
```

## Uso

```bash
# Iniciar o servidor
node app.js

# Recompilar o CSS após alterar views (desenvolvimento)
npm run css:watch
```

Acesse em `http://localhost:3000`.

A área administrativa está em `/login` com as credenciais padrão `admin` / `admin123`.

> **Atenção:** o banco de dados é recriado a cada reinício do servidor. As submissões anteriores são perdidas.

## Docker

```bash
docker build -t simulados .
docker run -p 3000:3000 simulados
```

## Adicionando questões

As questões ficam em `data/questions.json` (Simulado 1) e `data/questions2.json` (Simulado 2). Cada questão segue o formato:

```json
{
  "question": "Texto da questão",
  "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
  "answer": "Opção A"
}
```

Para questões de múltipla resposta, separe as respostas com `", "`:

```json
"answer": "Opção A, Opção C"
```

## Licença

MIT — livre para usar, modificar e distribuir.
