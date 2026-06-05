require('dotenv').config();
const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Histórico de conversa por número (memória simples em memória RAM)
const conversas = {};

const SYSTEM_PROMPT = `Você é um assistente de vendas da Serum COD. Seu objetivo é atender leads
que chegam pelo WhatsApp após clicar em anúncios no Instagram/Facebook.

PRODUTO: Sérum de beleza - entrega COD (pagamento na entrega)

SEU FLUXO:
1. Saudação calorosa e apresentação do produto
2. Identificar interesse e tirar dúvidas
3. Coletar dados para entrega:
   - Nome completo
   - Endereço completo (rua, número, bairro)
   - CEP
   - Cidade e Estado
   - Telefone de contato
4. Confirmar pedido e informar prazo de entrega
5. Se houver objeção de preço ou dúvida complexa, dizer:
   "Vou chamar nosso especialista para te ajudar melhor!"
   e parar de responder (Bruno assume)

REGRAS:
- Seja simpático e natural, não robótico
- Respostas curtas e diretas (máximo 3 linhas)
- Não invente informações sobre o produto
- Sempre confirme o endereço antes de finalizar`;

// Verificação do webhook pelo Meta
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('Webhook verificado com sucesso');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recebe mensagens do WhatsApp
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Responde imediatamente ao Meta

  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return;

    const msg = messages[0];
    const from = msg.from; // número do lead
    const texto = msg.text?.body;

    if (!texto) return;

    console.log(`Mensagem de ${from}: ${texto}`);

    // Inicializa histórico se não existir
    if (!conversas[from]) {
      conversas[from] = [];
    }

    // Adiciona mensagem do lead ao histórico
    conversas[from].push({ role: 'user', content: texto });

    // Mantém apenas as últimas 20 mensagens para não estourar tokens
    if (conversas[from].length > 20) {
      conversas[from] = conversas[from].slice(-20);
    }

    // Envia para Claude
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: conversas[from],
    });

    const resposta = response.content[0].text;

    // Adiciona resposta do agente ao histórico
    conversas[from].push({ role: 'assistant', content: resposta });

    // Se o agente escalar para Bruno, para de responder automaticamente
    if (resposta.includes('especialista')) {
      console.log(`Lead ${from} escalado para Bruno`);
    }

    // Envia resposta pelo WhatsApp
    await enviarMensagem(from, resposta);

  } catch (err) {
    console.error('Erro ao processar mensagem:', err.message);
  }
});

async function enviarMensagem(para, texto) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to: para,
      type: 'text',
      text: { body: texto },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
