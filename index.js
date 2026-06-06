// =============================================
// LOGZZ WEBHOOK — Notificações de status do pedido
// =============================================
app.post('/logzz', async (req, res) => {
  res.sendStatus(200);

  try {
    const dados = req.body;
    console.log('Logzz webhook recebido:', JSON.stringify(dados));

    // Pega o telefone do cliente (Logzz pode enviar em campos diferentes)
    const telefone =
      dados.customer_phone ||
      dados.phone ||
      dados.telefone ||
      dados.cliente?.telefone ||
      dados.cliente?.phone;

    const status =
      dados.status ||
      dados.order_status ||
      dados.situacao;

    const nome =
      dados.customer_name ||
      dados.nome ||
      dados.cliente?.nome ||
      'cliente';

    if (!telefone || !status) {
      console.log('Logzz: telefone ou status ausente', dados);
      return;
    }

    // Formata número para WhatsApp (somente dígitos, com 55 na frente)
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

  if (s.includes('confirmado') || s.includes('aprovado') || s.includes('pago')) {
    return `✅ Olá, ${primeiroNome}! Seu pedido do Sérum NovaBeauty foi *confirmado* e já está sendo preparado para envio. Em breve você receberá o código de rastreio. 💚`;
  }

  if (s.includes('rota') || s.includes('entrega') || s.includes('saiu') || s.includes('despachado') || s.includes('enviado')) {
    return `🚚 ${primeiroNome}, seu Sérum NovaBeauty *saiu para entrega hoje*! Fique de olho, o entregador passará em breve. Lembre-se: o pagamento é feito na entrega. 😊`;
  }

  if (s.includes('entregue') || s.includes('concluido') || s.includes('concluído') || s.includes('finalizado')) {
    return `🎉 ${primeiroNome}, seu Sérum NovaBeauty foi *entregue com sucesso*! Esperamos que você ame os resultados. Qualquer dúvida sobre como usar, é só chamar aqui. ✨`;
  }

  if (s.includes('cancelado') || s.includes('cancelad')) {
    return `⚠️ ${primeiroNome}, infelizmente seu pedido foi *cancelado*. Se quiser fazer um novo pedido ou tiver alguma dúvida, é só falar aqui com a gente! 💚`;
  }

  if (s.includes('devolucao') || s.includes('devolução') || s.includes('devolvido') || s.includes('reembolso')) {
    return `↩️ ${primeiroNome}, recebemos sua solicitação de devolução. Nossa equipe entrará em contato para concluir o processo. Qualquer dúvida, estamos aqui! 💚`;
  }

  return null; // Status sem mensagem configurada
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
