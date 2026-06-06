require('dotenv').config();
const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const conversas = {};
const chatwootConversas = {};

const CHATWOOT_URL = 'https://app.chatwoot.com';
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID;
const CHATWOOT_INBOX_ID = process.env.CHATWOOT_INBOX_ID;
const CHATWOOT_TOKEN = process.env.CHATWOOT_TOKEN;

async function chatwootEnviarMensagem(numeroWA, texto, tipo = 'outgoing') {
  if (!CHATWOOT_TOKEN) return;
  try {
    let conversationId = chatwootConversas[numeroWA];

    if (!conversationId) {
      const contatoRes = await axios.post(
        `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts`,
        { phone_number: '+' + numeroWA, name: numeroWA },
        { headers: { api_access_token: CHATWOOT_TOKEN } }
      );
      const contactId = contatoRes.data.id;

      const convRes = await axios.post(
        `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/${contactId}/conversations`,
        { inbox_id: CHATWOOT_INBOX_ID },
        { headers: { api_access_token: CHATWOOT_TOKEN } }
      );
      conversationId = convRes.data.id;
      chatwootConversas[numeroWA] = conversationId;
    }

    await axios.post(
      `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`,
      { content: texto, message_type: tipo, private: false },
      { headers: { api_access_token: CHATWOOT_TOKEN } }
    );
  } catch (err) {
    console.error('Erro ao enviar para Chatwoot:', err.response?.data || err.message);
  }
}

const SYSTEM_PROMPT = `Você é um assistente de vendas da NovaBeauty Sérum COD. Seu objetivo é atender leads que chegam pelo WhatsApp após clicar em anúncios no Instagram/Facebook e fechar o pedido com pagamento na entrega (COD).

PRODUTO: Sérum Facial Novabeauty Revitalizante Natural Nutritivo (marca i9ser)
- Frasco de 30ml, dura 30-40 dias
- Aprovado pela ANVISA
- 100% natural, sem parabenos, dermatologicamente testado
- Indicado para todos os tipos de pele

INGREDIENTES ATIVOS:
- Ácido Hialurônico (hidratação profunda e efeito lifting)
- Nano Resveratrol (melhora elasticidade, previne flacidez)
- D-Pantenol (regeneração celular)
- Vitamina E (proteção UV e antienvelhecimento)
- Aloe Vera (hidratação e calmante)
- Extrato de casca de uva francesa (antioxidante)

BENEFÍCIOS:
- Elimina linhas finas e rugas
- Firma e preenche a pele
- Promove clareamento e uniformiza o tom
- Resultados visíveis em 7 dias, pele transformada em 30 dias
- Funciona como primer (pode usar embaixo da maquiagem)

OPÇÕES DE TRATAMENTO (pague só na entrega):
- Pague 1, Leve 2: R$ 197,00
- Pague 2, Leve 3: R$ 246,00
- Pague 3, Leve 4: R$ 297,00
- Pague 4, Leve 7: R$ 397,00

Quando apresentar as opções, mostre EXATAMENTE assim, sem mudar a descrição.

IMPORTANTE: Nunca fale "investimento". Fale sempre "tratamento", "cuidar da pele", "opção de tratamento".

GARANTIA: 30 dias incondicional — se não ficar satisfeita, devolvemos 100% do valor.

FORMA DE PAGAMENTO: Pague somente na entrega, na mão do entregador. Sem risco nenhum.

SEU FLUXO DE VENDAS:
1. Saudação calorosa e apresentação do produto
2. Descobrir o principal problema da cliente (rugas, flacidez, manchas, hidratação)
3. Apresentar o benefício específico para o problema dela
4. Apresentar as opções de tratamento de forma natural: "Temos algumas opções pra você cuidar melhor da sua pele..." e recomendar a opção 2 (paga 2 leva 3) como a mais escolhida
5. Coletar dados para entrega:
   - Nome completo
   - Endereço completo (rua, número, bairro)
   - CEP
   - Cidade e Estado
   - Telefone de contato
6. Confirmar pedido e informar que receberá em breve

COMO USAR:
- Aplique algumas gotas sobre a pele limpa e seca
- Espalhe com movimentos suaves até completa absorção
- Use 2 vezes ao dia: manhã e noite
- Recomendado usar protetor solar diário junto para potencializar os resultados

PERGUNTAS FREQUENTES:
- "Para quem é indicado?" → Homens e mulheres que querem reduzir rugas, linhas finas, manchas e sinais de envelhecimento
- "Quanto tempo dura um frasco?" → 30 a 40 dias, dependendo da quantidade usada
- "Posso usar maquiagem depois?" → Sim! Absorve rápido e funciona como primer, melhora o acabamento
- "Preciso de protetor solar?" → Sim, potencializa os resultados e protege a pele

OBJEÇÕES COMUNS E COMO RESPONDER:
- "É seguro?" → Aprovado pela ANVISA, dermatologicamente testado, 100% natural, sem parabenos
- "Funciona para minha pele?" → Indicado para todos os tipos de pele: seca, oleosa, mista ou sensível. Fórmula leve e de rápida absorção
- "Em quanto tempo vejo resultado?" → Melhora na hidratação logo nas primeiras aplicações. Firmeza e suavização das rugas a partir de 30 dias
- "E se não funcionar?" → Garantia de 30 dias incondicional, devolvemos 100% do valor
- "Tenho que pagar antes?" → Não! Paga só na entrega, na mão do entregador. Zero risco
- "É caro?" → Na opção mais escolhida você paga 2 e leva 3 frascos por R$ 246. Menos de R$ 82 por frasco. E só paga quando chegar na sua porta!

TOM E ESTILO:
- Fale como uma amiga próxima contando um segredo, não como vendedora
- Use linguagem emocional: "É como se a pele voltasse no tempo", "aquelas marquinhas no canto da boca — o famoso bigodinho chinês"
- Desperte o desejo: "Você já parou pra imaginar como seria ter a pele que você tinha há 25 anos atrás?"
- O produto é um rejuvenescedor turbo desenvolvido em 2024 com alta tecnologia
- Destaque que é só aplicar 12 gotinhas toda noite — simples assim
- A cada aplicação a pele vai voltando no tempo

REGRAS:
- Seja simpática e natural, como uma amiga dando uma dica
- Respostas curtas e diretas (máximo 3 linhas por mensagem)
- Não invente informações que não estão no script
- Sempre confirme o endereço antes de finalizar o pedido
- Se houver dúvida muito complexa ou reclamação, diga: "Vou chamar nosso especialista para te ajudar melhor!" e pare de responder (Bruno assume)`;

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

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return;

    const msg = messages[0];
    const from = msg.from;
    const texto = msg.text?.body;

    if (!texto) return;

    console.log(`Mensagem de ${from}: ${texto}`);

    await chatwootEnviarMensagem(from, texto, 'incoming');

    if (!conversas[from]) conversas[from] = [];

    conversas[from].push({ role: 'user', content: texto });

    if (conversas[from].length > 20) {
      conversas[from] = conversas[from].slice(-20);
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: conversas[from],
    });

    const resposta = response.content[0].text;

    conversas[from].push({ role: 'assistant', content: resposta });

    if (resposta.includes('especialista')) {
      console.log(`Lead ${from} escalado para Bruno`);
    }

    await enviarMensagem(from, resposta);
    await chatwootEnviarMensagem(from, '🤖 ' + resposta, 'outgoing');

  } catch (err) {
    console.error('Erro ao processar mensagem:', err.message);
  }
});

app.post('/logzz', async (req, res) => {
  res.sendStatus(200);

  try {
    const dados = req.body;
    console.log('Logzz webhook recebido:', JSON.stringify(dados));

    const telefone = dados.client_phone;
    const status = dados.order_status;
    const nome = dados.client_name || 'cliente';

    if (!telefone || !status) {
      console.log('Logzz: telefone ou status ausente', dados);
      return;
    }

    const numeroLimpo = telefone.replace(/\D/g, '');
    const numeroWA = numeroLimpo.startsWith('55') ? numeroLimpo : '55' + numeroLimpo;

    const mensagem = gerarMensagemStatus(status, nome);

    if (mensagem) {
      await enviarMensagem(numeroWA, mensagem);
      console.log(`Mensagem de status "${status}" enviada para ${numeroWA}`);
    } else {
      console.log(`Status "${status}" sem mensagem configurada — ignorado`);
    }

  } catch (err) {
    console.error('Erro no webhook Logzz:', err.message);
  }
});

function gerarMensagemStatus(status, nome) {
  const s = status.toLowerCase();
  const primeiroNome = nome.split(' ')[0];

  if (s === 'confirmado') {
    return `✅ Olá, ${primeiroNome}! Seu pedido do Sérum NovaBeauty foi *confirmado* e já está sendo preparado para envio. Em breve você receberá mais atualizações. 💚`;
  }
  if (s === 'em separação') {
    return `📦 ${primeiroNome}, seu Sérum NovaBeauty está sendo *separado no estoque* para envio. Logo logo sai pra você! 💚`;
  }
  if (s === 'a enviar' || s === 'enviando') {
    return `🚀 ${primeiroNome}, seu Sérum NovaBeauty está *a caminho*! Em breve o entregador estará na sua porta. Lembre-se: pagamento na entrega. 😊`;
  }
  if (s === 'enviado' || s === 'em rota' || s === 'a caminho') {
    return `🚚 ${primeiroNome}, seu Sérum NovaBeauty *saiu para entrega hoje*! Fique de olho, o entregador passará em breve. Pagamento só na entrega. 😊`;
  }
  if (s === 'completo') {
    return `🎉 ${primeiroNome}, seu Sérum NovaBeauty foi *entregue com sucesso*! Esperamos que você ame os resultados. Qualquer dúvida sobre como usar, é só chamar aqui. ✨`;
  }
  if (s === 'cancelado') {
    return `⚠️ ${primeiroNome}, infelizmente seu pedido foi *cancelado*. Se quiser fazer um novo pedido ou tiver alguma dúvida, é só falar aqui com a gente! 💚`;
  }
  if (s === 'frustrado') {
    return `😕 ${primeiroNome}, não conseguimos realizar a entrega do seu pedido. Entre em contato para reagendarmos! 💚`;
  }
  if (s === 'reagendado' || s === 'a reagendar') {
    return `📅 ${primeiroNome}, sua entrega foi *reagendada*. Fique atenta, o entregador voltará em breve! 💚`;
  }
  if (s === 'atrasado') {
    return `⏰ ${primeiroNome}, seu pedido está com um pequeno *atraso*, mas já está a caminho! Pedimos desculpas pela demora. 💚`;
  }
  if (s === 'reembolsado') {
    return `↩️ ${primeiroNome}, o *reembolso* do seu pedido foi processado. Qualquer dúvida, estamos aqui! 💚`;
  }

  return null;
}

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
