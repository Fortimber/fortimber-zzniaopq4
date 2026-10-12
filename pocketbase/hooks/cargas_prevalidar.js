// F1-T04 — pré-validação de carga (SPEC-F1-02 §3/§6: prévia sem publicar)
// POST /backend/v1/cargas/prevalidar  body: { texto_csv, arquivo_nome? }
// Idempotência: checksum já conhecido → reusa a carga (ou reporta repetida).
// Core inline (goja): parser CSV + validador + sha256 — espelha work/fortimber-domain/carga.ts
routerAdd(
  'POST',
  '/backend/v1/cargas/prevalidar',
  (e) => {
    const body = e.requestInfo().body
    const texto = (body && body.texto_csv) || ''
    const arquivoNome = String((body && body.arquivo_nome) || 'sem-nome.csv').slice(0, 200)

    // ---------- sha256 (mesmo algoritmo do núcleo) ----------
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

    // ---------- parser CSV ----------
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

    // ---------- validação ----------
    const TEMPLATE_COLS = [
      'tipo',
      'codigo',
      'sistema_origem',
      'id_externo',
      'mercado',
      'cliente',
      'estado_registro',
      'revisao',
      'produto',
      'especie',
      'quantidade_vigente',
      'unidade',
      'evento_tipo',
      'quantidade',
      'data_evento',
      'fonte',
      'registro_origem',
    ]
    const MERCADOS = ['nacional', 'internacional']
    const ESTADOS = ['vigente', 'encerrado', 'cancelado', 'suspenso']
    const TIPOS_EVENTO = ['expedicao', 'entrega_confirmada', 'producao', 'devolucao']
    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

    function isDataValida(s) {
      if (!ISO_DATE.test(s)) return false
      const d = new Date(s + 'T00:00:00Z')
      if (isNaN(d.getTime())) return false
      return d.toISOString().slice(0, 10) === s
    }

    function parseNumero(s) {
      if (s === '') return { ok: true }
      if (/\d\s+\d/.test(s)) return { ok: false, motivo: 'separador de milhar com espaço' }
      if (/[.,]/.test(s)) {
        if (/^\d{1,3}(\.\d{3})+$/.test(s))
          return { ok: false, motivo: 'escala ambígua (milhar vs decimal)' }
        if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0)
          return { ok: false, motivo: 'separadores mistos' }
        if (s.indexOf(',') >= 0) return { ok: false, motivo: 'decimal com vírgula — usar ponto' }
      }
      const v = Number(s)
      if (isNaN(v)) return { ok: false, motivo: 'número inválido' }
      return { ok: true, valor: v }
    }

    function estrutural(checksum, msg, total) {
      return {
        ok: false,
        erro_estrutural: msg,
        checksum: checksum,
        total_linhas: total,
        validas: 0,
        incompletas: 0,
        rejeitadas: 0,
        duplicadas_no_lote: 0,
        erros: [],
        previa: [],
        contratos: [],
        eventos: [],
      }
    }

    const checksum = sha256Hex(texto)

    // ---------- idempotência: checksum já registrado? ----------
    const cargaCol = $app.findCollectionByNameOrId('cargas')
    let cargaExistente = null
    try {
      cargaExistente = $app.findFirstRecordByFilter('cargas', 'checksum = {:cs}', { cs: checksum })
    } catch (_) {
      cargaExistente = null
    }
    if (
      cargaExistente &&
      (cargaExistente.getString('estado') === 'publicada' ||
        cargaExistente.getString('estado') === 'publicada_com_excecoes')
    ) {
      return e.json(200, {
        ok: true,
        repetida: true,
        carga_id: cargaExistente.id,
        checksum: checksum,
        mensagem: 'carga idêntica já publicada — nada a prevalidar (idempotência)',
        total_linhas: cargaExistente.getInt('total_linhas'),
        validas: cargaExistente.getInt('validas'),
        erros: [],
        previa: [],
        contratos: [],
        eventos: [],
      })
    }

    const p = parseCSV(texto)
    if (p.erro) return e.json(200, estrutural(checksum, p.erro, p.linhas.length))
    if (!p.header.length || p.header[0] !== 'tipo')
      return e.json(
        200,
        estrutural(
          checksum,
          'cabeçalho desconhecido — primeira coluna deve ser "tipo" (template v1)',
          p.linhas.length,
        ),
      )
    if (p.linhas.length === 0) return e.json(200, estrutural(checksum, 'nenhuma linha de dados', 0))
    if (p.linhas.length > 5000)
      return e.json(
        200,
        estrutural(
          checksum,
          'volume acima do limite (' + p.linhas.length + ' > 5000 linhas)',
          p.linhas.length,
        ),
      )
    const faltando = []
    for (const c of TEMPLATE_COLS) {
      if (p.header.indexOf(c) < 0) faltando.push(c)
    }
    if (faltando.length > 0)
      return e.json(
        200,
        estrutural(
          checksum,
          'colunas requeridas ausentes: ' + faltando.join(', '),
          p.linhas.length,
        ),
      )

    const erros = [],
      contratos = [],
      eventos = [],
      previa = []
    const chavesNoLote = {}
    let duplicadasNoLote = 0,
      incompletas = 0

    for (const l of p.linhas) {
      const r = l.raw
      const tipo = (r.tipo || '').toLowerCase()
      if (tipo !== 'contrato' && tipo !== 'evento') {
        erros.push({
          linha: l.n,
          coluna: 'tipo',
          codigo: 'tipo_invalido',
          mensagem: '"' + r.tipo + '" não é contrato nem evento',
        })
        continue
      }
      let completa = true,
        linhaOk = true
      const obr = [
        ['codigo', 'código'],
        ['sistema_origem', 'sistema de origem'],
        ['id_externo', 'identificador externo'],
      ]
      for (const o of obr) {
        if (!r[o[0]]) {
          erros.push({
            linha: l.n,
            coluna: o[0],
            codigo: 'requerido_ausente',
            mensagem: o[1] + ' é obrigatório',
          })
          linhaOk = false
          completa = false
        }
      }
      if (!linhaOk) continue

      if (tipo === 'contrato') {
        if (MERCADOS.indexOf(r.mercado) < 0) {
          erros.push({
            linha: l.n,
            coluna: 'mercado',
            codigo: 'valor_invalido',
            mensagem: '"' + r.mercado + '" não é nacional nem internacional',
          })
          linhaOk = false
        }
        if (!r.cliente) {
          erros.push({
            linha: l.n,
            coluna: 'cliente',
            codigo: 'requerido_ausente',
            mensagem: 'cliente é obrigatório',
          })
          linhaOk = false
          completa = false
        }
        if (ESTADOS.indexOf(r.estado_registro) < 0) {
          erros.push({
            linha: l.n,
            coluna: 'estado_registro',
            codigo: 'valor_invalido',
            mensagem: '"' + r.estado_registro + '" não é um estado válido',
          })
          linhaOk = false
        }
        const rev = parseNumero(r.revisao || '1')
        if (!rev.ok) {
          erros.push({
            linha: l.n,
            coluna: 'revisao',
            codigo: rev.motivo,
            mensagem: 'revisão: ' + rev.motivo,
          })
          linhaOk = false
        } else if ((rev.valor === undefined ? 1 : rev.valor) < 1) {
          erros.push({
            linha: l.n,
            coluna: 'revisao',
            codigo: 'valor_invalido',
            mensagem: 'revisão deve ser >= 1',
          })
          linhaOk = false
        }
        const qtd = parseNumero(r.quantidade_vigente || '')
        if (!qtd.ok) {
          erros.push({
            linha: l.n,
            coluna: 'quantidade_vigente',
            codigo: qtd.motivo,
            mensagem: 'quantidade vigente: ' + qtd.motivo,
          })
          linhaOk = false
        } else if (qtd.valor === undefined) {
          completa = false
        }
        if (!r.unidade) {
          completa = false
        }
      } else {
        if (TIPOS_EVENTO.indexOf(r.evento_tipo) < 0) {
          erros.push({
            linha: l.n,
            coluna: 'evento_tipo',
            codigo: 'valor_invalido',
            mensagem: '"' + r.evento_tipo + '" não é um tipo de evento válido',
          })
          linhaOk = false
        }
        const qtd = parseNumero(r.quantidade || '')
        if (!qtd.ok) {
          erros.push({
            linha: l.n,
            coluna: 'quantidade',
            codigo: qtd.motivo,
            mensagem: 'quantidade: ' + qtd.motivo,
          })
          linhaOk = false
        } else if (qtd.valor === undefined) {
          erros.push({
            linha: l.n,
            coluna: 'quantidade',
            codigo: 'requerido_ausente',
            mensagem: 'quantidade é obrigatória no evento',
          })
          linhaOk = false
          completa = false
        }
        if (!r.data_evento) {
          erros.push({
            linha: l.n,
            coluna: 'data_evento',
            codigo: 'requerido_ausente',
            mensagem: 'data do evento é obrigatória',
          })
          linhaOk = false
        } else if (!isDataValida(r.data_evento)) {
          erros.push({
            linha: l.n,
            coluna: 'data_evento',
            codigo: 'data_invalida',
            mensagem: '"' + r.data_evento + '" não é data ISO válida',
          })
          linhaOk = false
        }
        if (!r.fonte) {
          erros.push({
            linha: l.n,
            coluna: 'fonte',
            codigo: 'requerido_ausente',
            mensagem: 'fonte é obrigatória (proveniência)',
          })
          linhaOk = false
          completa = false
        }
        if (!r.registro_origem) {
          erros.push({
            linha: l.n,
            coluna: 'registro_origem',
            codigo: 'requerido_ausente',
            mensagem: 'registro de origem é obrigatório (proveniência)',
          })
          linhaOk = false
          completa = false
        }
      }
      if (!linhaOk) continue

      const chave =
        tipo === 'contrato'
          ? 'contrato|' + r.sistema_origem + '|' + r.id_externo + '|' + (r.revisao || '1')
          : 'evento|' +
            r.codigo +
            '|' +
            r.produto.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
            '|' +
            r.evento_tipo +
            '|' +
            r.fonte +
            '|' +
            r.registro_origem
      if (chavesNoLote[chave]) {
        duplicadasNoLote++
        continue
      }
      chavesNoLote[chave] = true

      const dados = {}
      for (const c of TEMPLATE_COLS) dados[c] = r[c] === undefined ? '' : r[c]
      if (tipo === 'contrato') dados.revisao = r.revisao || '1'
      const classificada = { linha: l.n, tipo: tipo, dados: dados, chave: chave }
      if (!completa) incompletas++
      if (tipo === 'contrato') contratos.push(classificada)
      else eventos.push(classificada)
      if (previa.length < 10) previa.push(classificada)
    }

    // upsert da execução (auditoria da SPEC §3): reusa registro com mesmo checksum
    let carga = cargaExistente
    if (!carga) {
      carga = new Record(cargaCol)
      carga.set('checksum', checksum)
    }
    carga.set('arquivo_nome', arquivoNome)
    carga.set('template_v', 'v1')
    if (e.auth) carga.set('usuario_id', e.auth.id)
    carga.set('estado', 'pre_validando')
    carga.set('total_linhas', p.linhas.length)
    carga.set('validas', contratos.length + eventos.length - duplicadasNoLote - incompletas)
    carga.set('incompletas', incompletas)
    carga.set('rejeitadas', erros.length)
    carga.set('duplicadas', duplicadasNoLote)
    carga.set('erros', JSON.stringify(erros.slice(0, 200)))
    carga.set('contrato_ids', JSON.stringify([]))
    $app.save(carga)

    return e.json(200, {
      ok: true,
      carga_id: carga.id,
      checksum: checksum,
      template_v: 'v1',
      total_linhas: p.linhas.length,
      validas: contratos.length + eventos.length - duplicadasNoLote - incompletas,
      incompletas: incompletas,
      rejeitadas: erros.length,
      duplicadas_no_lote: duplicadasNoLote,
      erros: erros.slice(0, 50),
      previa: previa,
      contratos: contratos,
      eventos: eventos,
    })
  },
  $apis.requireAuth(),
)
