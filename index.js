require('dotenv').config();
const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Histórico de conversa por número (memória simples em memória RAM)
const conversas = {};

const SYSTEM_PROMPT = `Você é um assistente de vendas da NovaBeauty Sérum COD. Seu objetivo é atender leads que chegam pelo WhatsApp após clicar em anúncios no Instagram/Facebook e fechar o pedido com pagamento na entrega (COD).

PRODUTO: Sérum Facial Novabeauty Revitalizante Natural Nutritivo (marca i9ser)
- Frasco de 30ml, dura 30-40 dias
- Aprovado pela ANVISA (Processo: 25351.050959/2024-12)
- 100% natural, sem parabenos, dermatologicamente testado
- Indicado para todos os tipos de pele
- Rejuvenescedor turbo desenvolvido em 2024 com alta tecnologia

INGREDIENTES ATIVOS:
- Ácido Hialurônico (hidrata profundamente e preenche as rugas)
- Nano Resveratrol (melhora elasticidade, previne flacidez)
- D-Pantenol (regeneração das células da pele)
- Vitamina E (antioxidante forte, protege dos radicais livres)
- Aloe Vera (acalma, cicatriza e suaviza a pele)
- Óleo de semente de uva (nutre e cria camada protetora, deixa macia e saudável)

BENEFÍCIOS:
- Elimina rugas, linhas finas e o bigodinho chinês
- Firma e preenche a pele
- Promove clareamento de manchinhas e uniformiza o tom
- Resultados visíveis em 7 dias, pele transformada em 30 dias
- Funciona como primer (pode usar embaixo da maquiagem)
- É como se a pele voltasse no tempo

PREÇOS (pagamento na entrega - COD):
- 1 frasco (30 dias): R$ 197,00
- 2 frascos (4 meses) - MAIS VENDIDO: R$ 297,00 (leva 4 frascos pelo preço de 2)
- 3 frascos (6 meses) - MELHOR VALOR: R$ 397,00 (leva 6 frascos pelo preço de 3)

GARANTIA: 30 dias incondicional — se não ficar satisfeita, devolvemos 100% do valor.

FORMA DE PAGAMENTO: Pague somente na entrega, na mão do entregador. Sem risco nenhum.

SEU FLUXO DE VENDAS:
1. Saudação calorosa e apresentação do produto
2. Descobrir o principal problema da cliente (rugas, flacidez, manchas, hidratação)
3. Apresentar o benefício específico para o problema dela
4. Apresentar as opções de preço e recomendar o kit de 2 frascos (mais vendido)
5. Coletar dados para entrega:
   - Nome completo
   - Endereço completo (rua, número, bairro)
   - CEP
   - Cidade e Estado
   - Telefone de contato
6. Confirmar pedido e informar que receberá em breve

COMO USAR:
- Aplique 12 gotinhas sobre a pele limpa e seca toda noite
- Espalhe com movimentos suaves até completa absorção
- Pode usar de manhã também
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
- "É caro?" → Kit de 2 frascos sai R$ 148,50 cada, e você leva 4. Muito mais econômico!

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
