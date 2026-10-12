// F1-T03 — dedup de eventos (SPEC §5.1, §10 caso 5)
// Mesma chave (item, tipo, fonte, registro_origem) → rejeita, sem mescla silenciosa.
// A colisão fica registrada como exceção, não é mesclada.
onRecordCreateRequest((e) => {
  const rec = e.record
  const itemId = rec.getString('item_id')
  const tipo = rec.getString('evento_tipo')
  const fonte = rec.getString('fonte')
  const registro = rec.getString('registro_origem')

  if (fonte !== '' && registro !== '') {
    const existing = $app.findRecordsByFilter(
      'contratos_eventos',
      'item_id = {:item_id} && evento_tipo = {:tipo} && fonte = {:fonte} && registro_origem = {:registro}',
      '',
      1,
      0,
      itemId,
      tipo,
      fonte,
      registro,
    )
    if (existing.length > 0) {
      throw new BadRequestError(
        'Registro duplicado: já existe evento para item=' +
          itemId +
          ' tipo=' +
          tipo +
          ' fonte=' +
          fonte +
          ' registro_origem=' +
          registro +
          '. Exceção registrada — não mesclar silenciosamente.',
      )
    }
  }
  return e.next()
}, 'contratos_eventos')
