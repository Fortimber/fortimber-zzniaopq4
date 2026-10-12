// F1-T04 — publicação idempotente da carga (SPEC-F1-02 §3/§6/§7)
// POST /backend/v1/cargas/publicar  body: { carga_id, texto_csv }
// Idempotência: checksum igual → relatório "repetida", nada reaplicado.
// Transação: valida todo o lote e grava contratos+eventos+proveniência atômicos.
routerAdd(
  'POST',
  '/backend/v1/cargas/publicar',
  (e) => {
    const body = e.requestInfo().body
    const texto = (body && body.texto_csv) || ''
    const cargaId = (body && body.carga_id) || ''

    // ---------- sha256 (tabela de constantes explícita) ----------
    function sha256Hex(str) {
      const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
        0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
        0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
        0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
        0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
      ]
      const rr = (x, n) => (x >>> n) | (x << (32 - n))
      let h0 = 0x6a09e667,
        h1 = 0xbb67ae85,
        h2 = 0x3c6ef372,
        h3 = 0xa54ff53a,
        h4 = 0x510e527f,
        h5 = 0x9b05688c,
        h6 = 0x1f83d9ab,
        h7 = 0x5be0cd19
      const bytes = []
      for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i)
        if (c < 128) bytes.push(c)
        else if (c < 2048) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63))
        else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
      }
      const bl = bytes.length * 8
      bytes.push(0x80)
      while (bytes.length % 64 !== 56) bytes.push(0)
      for (let i = 7; i >= 0; i--) bytes.push(Math.floor(bl / Math.pow(2, i * 8)) & 0xff)
      for (let off = 0; off < bytes.length; off += 64) {
        const w = new Array(64).fill(0)
        for (let i = 0; i < 16; i++)
          w[i] =
            (bytes[off + i * 4] << 24) |
            (bytes[off + i * 4 + 1] << 16) |
            (bytes[off + i * 4 + 2] << 8) |
            bytes[off + i * 4 + 3]
        for (let i = 16; i < 64; i++) {
          const s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
          const s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
          w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0
        }
        let a = h0,
          b = h1,
          c = h2,
          d = h3,
          ee = h4,
          f = h5,
          g = h6,
          h = h7
        for (let i = 0; i < 64; i++) {
          const S1 = rr(ee, 6) ^ rr(ee, 11) ^ rr(ee, 25),
            ch = (ee & f) ^ (~ee & g)
          const t1 = (h + S1 + ch + K[i] + w[i]) | 0
          const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22),
            mj = (a & b) ^ (a & c) ^ (b & c)
          const t2 = (S0 + mj) | 0
          h = g
          g = f
          f = ee
          ee = (d + t1) | 0
          d = c
          c = b
          b = a
          a = (t1 + t2) | 0
        }
        h0 = (h0 + a) | 0
        h1 = (h1 + b) | 0
        h2 = (h2 + c) | 0
        h3 = (h3 + d) | 0
        h4 = (h4 + ee) | 0
        h5 = (h5 + f) | 0
        h6 = (h6 + g) | 0
        h7 = (h7 + h) | 0
      }
      const hex = (n) => ('00000000' + (n >>> 0).toString(16)).slice(-8)
      return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7)
    }

    function parseCSV(texto) {
      const t = texto
        .replace(/^\uFEFF/, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
      const fisicas = t.split('\n')
      const linhas = []
      let header = null,
        campo = '',
        registro = [],
        entreAspas = false,
        nFisica = 0
      for (const lf of fisicas) {
        nFisica++
        if (!entreAspas && lf === '' && registro.length === 0) continue
        let i = 0
        while (i < lf.length || entreAspas) {
          const ch = lf[i]
          if (entreAspas) {
            if (ch === '"') {
              if (lf[i + 1] === '"') {
                campo += '"'
                i += 2
                continue
              }
              entreAspas = false
              i++
              continue
            }
            campo += ch === undefined ? '\n' : ch
            i++
            continue
          }
          if (ch === '"' && campo === '') {
            entreAspas = true
            i++
            continue
          }
          if (ch === ',') {
            registro.push(campo)
            campo = ''
            i++
            continue
          }
          campo += ch === undefined ? '' : ch
          i++
        }
        if (entreAspas) continue
        registro.push(campo)
        campo = ''
        if (header === null) {
          header = registro.map((h) => h.trim().toLowerCase())
          registro = []
          continue
        }
        const bruta = {}
        header.forEach((h, idx) => {
          bruta[h] = (registro[idx] === undefined ? '' : registro[idx]).trim()
        })
        registro = []
        let vazia = true
        for (const k in bruta) {
          if (bruta[k] !== '') {
            vazia = false
            break
          }
        }
        if (vazia) continue
        linhas.push({ n: nFisica, raw: bruta })
      }
      if (header === null)
        return { header: [], linhas: [], erro: 'cabeçalho ausente — arquivo vazio' }
      return { header: header, linhas: linhas, erro: undefined }
    }

    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
    function isDataValida(s) {
      if (!ISO_DATE.test(s)) return false
      const d = new Date(s + 'T00:00:00Z')
      if (isNaN(d.getTime())) return false
      return d.toISOString().slice(0, 10) === s
    }

    const checksum = sha256Hex(texto)

    // ---------- idempotência: checksum já publicado? ----------
    let carga = null
    try {
      carga = $app.findRecordById('cargas', cargaId)
    } catch (_) {
      return e.json(400, {
        ok: false,
        erro: 'carga_id desconhecido — pré-valide antes de publicar',
      })
    }
    if (carga.getString('checksum') !== checksum) {
      return e.json(400, {
        ok: false,
        erro: 'texto diverge da pré-validação (checksum diferente) — revalide antes de publicar',
      })
    }
    if (
      carga.getString('estado') === 'publicada' ||
      carga.getString('estado') === 'publicada_com_excecoes'
    ) {
      return e.json(200, {
        ok: true,
        repetida: true,
        carga_id: carga.id,
        estado: carga.getString('estado'),
        contratos_criados: carga.getInt('contratos_criados'),
        eventos_criados: carga.getInt('eventos_criados'),
        eventos_duplicados: carga.getInt('eventos_duplicados'),
        mensagem: 'carga idêntica já publicada — nada reaplicado',
      })
    }

    // ---------- revalida e publica em transação ----------
    const p = parseCSV(texto)
    if (
      p.erro ||
      !p.header.length ||
      p.header[0] !== 'tipo' ||
      p.linhas.length === 0 ||
      p.linhas.length > 5000
    ) {
      carga.set('estado', 'rejeitada')
      carga.set('finalizado_em', new DateTime().string())
      carga.set('observacoes', 'falha estrutural na publicação')
      $app.save(carga)
      return e.json(400, {
        ok: false,
        erro: 'falha estrutural — última versão publicada permanece',
      })
    }

    let resultado = null
    let carregId = ''
    try {
      resultado = $app.runInTransaction((txApp) => {
        const carregCol = txApp.findCollectionByNameOrId('proveniencia_carregamentos')
        const carreg = new Record(carregCol)
        carreg.set('fonte', 'carga-piloto')
        carreg.set('arquivo_lote', carga.getString('arquivo_nome'))
        carreg.set('execucao_id', carga.id)
        carreg.set('estado_validacao', 'ok')
        carreg.set('registros_lidos', p.linhas.length)
        txApp.save(carreg)
        carregId = carreg.id

        const contratosCol = txApp.findCollectionByNameOrId('contratos')
        const itensCol = txApp.findCollectionByNameOrId('contratos_itens')
        const eventosCol = txApp.findCollectionByNameOrId('contratos_eventos')

        let contratosCriados = 0,
          eventosCriados = 0,
          eventosDuplicados = 0,
          incompletas = 0
        const contratoIds = []
        const erros = []
        const itemMap = {} // codigo|id_item → record

        // 1) contratos + itens (upsert idempotente pela chave canônica)
        for (const l of p.linhas) {
          const r = l.raw
          if ((r.tipo || '').toLowerCase() !== 'contrato') continue
          if (!r.codigo || !r.sistema_origem || !r.id_externo) {
            erros.push({ linha: l.n, codigo: 'requerido_ausente', mensagem: 'chave incompleta' })
            continue
          }
          if (['nacional', 'internacional'].indexOf(r.mercado) < 0) {
            erros.push({ linha: l.n, codigo: 'valor_invalido', mensagem: 'mercado inválido' })
            continue
          }
          if (['vigente', 'encerrado', 'cancelado', 'suspenso'].indexOf(r.estado_registro) < 0) {
            erros.push({ linha: l.n, codigo: 'valor_invalido', mensagem: 'estado inválido' })
            continue
          }
          const rev = r.revisao === '' ? 1 : Number(r.revisao)
          if (isNaN(rev) || rev < 1) {
            erros.push({ linha: l.n, codigo: 'valor_invalido', mensagem: 'revisão inválida' })
            continue
          }
          const qtd = r.quantidade_vigente === '' ? null : Number(r.quantidade_vigente)
          if (r.quantidade_vigente !== '' && isNaN(qtd)) {
            erros.push({
              linha: l.n,
              codigo: 'número inválido',
              mensagem: 'quantidade vigente inválida',
            })
            continue
          }

          let rec = null
          try {
            rec = txApp.findFirstRecordByData('contratos', 'id_externo', r.id_externo)
          } catch (_) {
            rec = null
          }
          if (
            rec &&
            (rec.getString('sistema_origem') !== r.sistema_origem || rec.getInt('revisao') !== rev)
          ) {
            erros.push({
              linha: l.n,
              codigo: 'colisao_chave',
              mensagem: 'colisão de identidade — exceção registrada, não mesclada',
            })
            continue
          }
          if (!rec) {
            rec = new Record(contratosCol)
            rec.set('codigo', r.codigo)
            rec.set('sistema_origem', r.sistema_origem)
            rec.set('id_externo', r.id_externo)
            rec.set('numero_contrato', r.codigo)
            rec.set('mercado', r.mercado)
            rec.set('cliente', r.cliente)
            rec.set('estado_registro', r.estado_registro)
            rec.set('revisao', rev)
            txApp.save(rec)
            contratosCriados++
            contratoIds.push(rec.id)
          }

          if (!r.produto) {
            erros.push({
              linha: l.n,
              codigo: 'requerido_ausente',
              mensagem: 'produto é obrigatório',
            })
            continue
          }
          const idItem = r.produto.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          let item = null
          try {
            item = txApp.findFirstRecordByFilter(
              'contratos_itens',
              'contrato_id = {:c} && id_externo_item = {:i}',
              { c: rec.id, i: idItem },
            )
          } catch (_) {
            item = null
          }
          if (!item) {
            item = new Record(itensCol)
            item.set('contrato_id', rec.id)
            item.set('produto', r.produto)
            item.set('especie', r.especie || '')
            item.set('id_externo_item', idItem)
            item.set('quantidade_vigente', qtd)
            item.set('unidade', r.unidade === '' ? null : r.unidade)
            item.set('saldo_estado', 'sem_eventos')
            item.set('saldo_valor', null)
            item.set('saldo_motivo', 'nenhum evento de entrega reconhecido')
            item.set('saldo_calculado_em', new DateTime().string())
            txApp.save(item)
          }
          if (qtd === null) incompletas++
          itemMap[r.codigo + '|' + idItem] = item
        }

        // 2) eventos (dedup por item+tipo+fonte+registro_origem; hook de saldo recalcula)
        for (const l of p.linhas) {
          const r = l.raw
          if ((r.tipo || '').toLowerCase() !== 'evento') continue
          const idItem = (r.produto || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
          const item = itemMap[r.codigo + '|' + idItem]
          if (!item) {
            erros.push({
              linha: l.n,
              codigo: 'contrato_ausente',
              mensagem: 'evento sem contrato/item criado na mesma carga',
            })
            continue
          }
          if (
            ['expedicao', 'entrega_confirmada', 'producao', 'devolucao'].indexOf(r.evento_tipo) < 0
          ) {
            erros.push({
              linha: l.n,
              codigo: 'valor_invalido',
              mensagem: 'tipo de evento inválido',
            })
            continue
          }
          const qtd = Number(r.quantidade)
          if (r.quantidade === '' || isNaN(qtd)) {
            erros.push({
              linha: l.n,
              codigo: 'requerido_ausente',
              mensagem: 'quantidade obrigatória no evento',
            })
            continue
          }
          if (!isDataValida(r.data_evento)) {
            erros.push({ linha: l.n, codigo: 'data_invalida', mensagem: 'data do evento inválida' })
            continue
          }
          if (!r.fonte || !r.registro_origem) {
            erros.push({
              linha: l.n,
              codigo: 'requerido_ausente',
              mensagem: 'proveniência obrigatória',
            })
            continue
          }

          const existentes = txApp.findRecordsByFilter(
            'contratos_eventos',
            'item_id = {:i} && evento_tipo = {:t} && fonte = {:f} && registro_origem = {:r}',
            '',
            1,
            0,
            { i: item.id, t: r.evento_tipo, f: r.fonte, r: r.registro_origem },
          )
          if (existentes.length > 0) {
            eventosDuplicados++
            continue
          }

          const ev = new Record(eventosCol)
          ev.set('item_id', item.id)
          ev.set('contrato_id', item.getString('contrato_id'))
          ev.set('evento_tipo', r.evento_tipo)
          ev.set('quantidade', qtd)
          ev.set('unidade', r.unidade === '' ? null : r.unidade)
          ev.set('data_evento', r.data_evento + ' 00:00:00.000Z')
          ev.set('fonte', r.fonte)
          ev.set('registro_origem', r.registro_origem)
          if (carregId) ev.set('carregamento_id', carregId)
          txApp.save(ev)
          eventosCriados++
        }

        let estado = 'publicada'
        if (erros.length > 0 || eventosDuplicados > 0) estado = 'publicada_com_excecoes'
        carga.set('estado', estado)
        carga.set('contratos_criados', contratosCriados)
        carga.set('eventos_criados', eventosCriados)
        carga.set('eventos_duplicados', eventosDuplicados)
        carga.set('incompletas', incompletas)
        carga.set('rejeitadas', erros.length)
        carga.set('erros', JSON.stringify(erros.slice(0, 200)))
        carga.set('contrato_ids', JSON.stringify(contratoIds))
        if (carregId) carga.set('carregamento_id', carregId)
        carga.set('finalizado_em', new DateTime().string())
        txApp.save(carga)

        return {
          contratos_criados: contratosCriados,
          eventos_criados: eventosCriados,
          eventos_duplicados: eventosDuplicados,
          incompletas: incompletas,
          erros: erros.slice(0, 50),
          estado: estado,
        }
      })
    } catch (err) {
      $app.logger().error('cargas: falha na publicação', 'error', String(err))
      carga.set('estado', 'rejeitada')
      carga.set('observacoes', 'falha na transação de publicação')
      $app.save(carga)
      return e.json(400, {
        ok: false,
        erro: 'falha na publicação — última versão publicada permanece (SPEC §5.7)',
      })
    }

    return e.json(200, {
      ok: true,
      repetida: false,
      carga_id: carga.id,
      checksum: checksum,
      template_v: 'v1',
      relatorio: resultado,
    })
  },
  $apis.requireAuth(),
)
