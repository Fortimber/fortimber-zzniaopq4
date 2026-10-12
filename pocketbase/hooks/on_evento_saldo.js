// F1-T03 — cálculo de saldo por item (SPEC §5.6/§5.9, §10 casos 1–8)
// Reimplementação inline do núcleo de domínio (goja: sem helpers de top-level).
// Regras centrais: não converter nulo em zero; não misturar unidades;
// excedente não trunca; divergência preserva valores; cancelado não calcula.
// NOTA: saveNoValidate — o item pode referenciar contrato criado na mesma
// transação de carga (validação de relação não resolve dentro da tx); os dados
// já foram validados pelo validador da carga/hook.
onRecordAfterCreateSuccess((e) => {
  const ev = e.record
  const itemId = ev.getString('item_id')
  try {
    const item = $app.findRecordById('contratos_itens', itemId)
    const eventos = $app.findRecordsByFilter(
      'contratos_eventos',
      'item_id = {:item_id}',
      '-data_evento',
      0,
      0,
      { item_id: itemId },
    )

    // D-F1-02: eventos que contam como entrega
    const TIPOS_ENTREGA = ['expedicao', 'entrega_confirmada', 'devolucao']

    const qtdVigente = item.get('quantidade_vigente') // number ou null
    const unidadeItem = item.getString('unidade')

    let estado = 'calculado'
    let saldo = null
    let motivo = ''

    if (item.getString('saldo_estado') === 'cancelado') {
      estado = 'cancelado'
      motivo = 'contrato cancelado'
    } else if (qtdVigente === null || (typeof qtdVigente === 'number' && isNaN(qtdVigente))) {
      estado = 'nao_calculavel'
      motivo = 'quantidade contratada ausente — não converter ausência em zero'
    } else if (unidadeItem === '') {
      estado = 'nao_calculavel'
      motivo = 'unidade desconhecida — não comparar sem unidade aprovada'
    } else if (eventos.length === 0) {
      estado = 'sem_eventos'
      motivo = 'nenhum evento de entrega reconhecido'
    } else {
      let entregue = 0
      let incompat = 0
      const porFonte = {}
      for (const ev2 of eventos) {
        const tipo = ev2.getString('evento_tipo')
        if (TIPOS_ENTREGA.indexOf(tipo) === -1) continue // producao não entra
        const q = ev2.get('quantidade')
        const u = ev2.getString('unidade')
        if (q === null || u !== unidadeItem) {
          incompat++
          continue
        }
        entregue += q
        const f = ev2.getString('fonte')
        porFonte[f] = (porFonte[f] || 0) + q
      }
      if (incompat > 0) {
        estado = 'nao_calculavel'
        motivo = 'unidade incompatível ou quantidade ausente em ' + incompat + ' evento(s)'
      } else {
        const fontes = Object.keys(porFonte)
        let divergente = false
        if (fontes.length > 1) {
          const v0 = porFonte[fontes[0]]
          for (const f of fontes) {
            if (porFonte[f] !== v0) divergente = true
          }
        }
        if (divergente) {
          estado = 'em_divergencia'
          motivo = 'fontes de entrega conflitantes — valores preservados nos eventos'
        } else {
          // D-F1-03: excedente visível — não trunca em zero
          saldo = qtdVigente - entregue
        }
      }
    }

    item.set('saldo_estado', estado)
    item.set('saldo_valor', saldo)
    item.set('saldo_motivo', motivo)
    item.set('saldo_calculado_em', new DateTime().string())
    $app.saveNoValidate(item)
  } catch (err) {
    $app.logger().error('saldo: falha ao recalcular item ' + itemId, 'error', String(err))
  }
  return e.next()
}, 'contratos_eventos')
