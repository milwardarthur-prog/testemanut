const TODOS_EQUIPAMENTOS = [
  "GE-01-02","GE-02-50","GE-03-40","GE-04-55","GE-05-55","GE-06-115","GE-07-06","GE-08-06","GE-09-170","GE-10-25",
  "GE-11-75","GE-12-75","GE-13-500","GE-14-140","GE-15-170","GE-16-40","GE-17-81",
  "GE-18-100","GE-19-81","GE-20-54","GE-21-54","GE-22-54","GE-23-54","GE-24-54",
  "GE-25-60","GE-26-75","GE-27-180","GE-28-81","GE-29-85","GE-30-105","GE-31-105",
  "GE-32-115","GE-33-115","GE-34-115","GE-35-150","GE-36-150","GE-37-180","GE-38-180",
  "GE-39-180","GE-40-180","GE-41-220","GE-42-450","GE-43-450","GE-44-260","GE-45-40",
  "GE-46-25","GE-47-115","GE-48-15","GE-49-55","GE-50-55","GE-51-550","GE-52-212",
  "GE-53-140","GE-54-55","GE-55-55","GE-56-55","GE-57-55","GE-58-81","GE-59-180",
  "GE-60-180","GE-61-230","GE-62-81","GE-63-40","GE-64-55","GE-65-230","GE-66-80",
  "GE-67-100","GE-68-50","GE-69-260","GE-70-40","GE-71-81","GE-72-140","GE-73-260",
  "GE-74-375","GE-75-25","GE-76-81","GE-77-140","GE-78-81","GE-79-81","GE-80-81",
  "GE-81-50","GE-82-100","GE-83-140","GE-84-81","GE-85-140","GE-86-81","GE-87-81",
  "GE-88-55","GE-89-55","GE-90-20","GE-91-70","GE-92-80","GE-93-85","GE-94-200",
  "GE-95-460","GE-96-27","GE-97-33","GE-98-250","GE-99-36","GE-100-125","GE-101-12",
  "GE-102-55","GE-103-150","GE-104-65","GE-105-45","GE-106-500","GE-107-230",
  "GE-108-125","GE-109-25","GE-110-80","GE-111-125","GE-112-125","GE-113-360",
  "GE-114-360","MTS-01-300","MTS-02-300","TL-01-4000"
];

let filtroStatus = 'total';
let filtroKva = 'todos';

function extrairKva(nome) {
  const partes = nome.split('-');
  const kva = parseInt(partes[partes.length - 1]);
  return isNaN(kva) ? 0 : kva;
}

function dentroFaixaKva(kva, faixa, nome) {
  if (faixa === 'todos')   return true;
  if (faixa === '10-39')   return kva >= 10  && kva <= 39;
  if (faixa === '40-65')   return kva >= 40  && kva <= 65;
  if (faixa === '70-90')   return kva >= 70  && kva <= 90;
  if (faixa === '100-130') return kva >= 100 && kva <= 130;
  if (faixa === '140-160') return kva >= 140 && kva <= 160;
  if (faixa === '170-190') return kva >= 170 && kva <= 190;
  if (faixa === '200-290') return kva >= 200 && kva <= 290;
  if (faixa === '300-600') return kva >= 300 && kva <= 600 && (nome || '').startsWith('GE');
  if (faixa === 'outros')  return !(kva >= 10 && kva <= 600) || !(nome || '').startsWith('GE');
  return true;
}

function interpretarPrazo(prazoStr) {
  if (!prazoStr) return null;
  prazoStr = prazoStr.trim();
  const partes = prazoStr.split('/');
  const dia = parseInt(partes[0]);
  const mes = parseInt(partes[1]) - 1;
  const ano = partes[2] ? parseInt(partes[2]) : new Date().getFullYear();
  const dataPrazo = new Date(ano, mes, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataPrazo.setHours(0, 0, 0, 0);

  let cor;
  if (dataPrazo > hoje)                            cor = 'prazo-futuro';
  else if (dataPrazo.getTime() === hoje.getTime()) cor = 'prazo-hoje';
  else                                             cor = 'prazo-atrasado';

  return { texto: prazoStr, cor };
}

function interpretarLocal(localBruto, contratoBruto) {
  if (!localBruto) return { status: 'disponivel', cliente: '', obs: '', prazo: null, contrato: '', desmaiada: false };

  const texto = localBruto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const ehDesmaiada = texto.includes('desmaiada');

  let status = 'locado';
  if (texto.includes('pesada') || ehDesmaiada) status = 'manutencao_pesada';
  else if (texto.includes('manutencao') || texto.includes('oficina')) status = 'manutencao_leve';

  if (status === 'locado') {
    return { status, cliente: localBruto, obs: '', prazo: null, contrato: (contratoBruto || '').trim(), desmaiada: false };
  }

  let obs = '';
  let prazo = null;

  const partePrazo = localBruto.split(/\|/);
  let descricaoParte = partePrazo[0] || '';
  let prazoParte = partePrazo[1] || '';

  // Remove o rótulo de manutenção mas mantém a descrição original (que pode incluir "Desmaiada")
  obs = descricaoParte.replace(/manutencao\s*(leve|pesada)\s*[-–]?\s*/i, '').trim();

  const matchPrazo = prazoParte.match(/prazo\s*:\s*([\d\/]+)/i);
  if (matchPrazo) {
    prazo = interpretarPrazo(matchPrazo[1]);
  }

  return { status, cliente: '', obs, prazo, contrato: '', desmaiada: ehDesmaiada };
}

function aplicarFiltros() {
  document.querySelectorAll('.card[data-status]').forEach(card => {
    const status = card.getAttribute('data-status');
    const kva    = parseInt(card.getAttribute('data-kva'));
    const nome   = card.getAttribute('data-eq');

    const passaStatus =
      filtroStatus === 'total' ||
      (filtroStatus === 'manutencao' && (status === 'manutencao_leve' || status === 'manutencao_pesada')) ||
      status === filtroStatus;

    const passaKva = dentroFaixaKva(kva, filtroKva, nome);
    card.classList.toggle('card-oculto', !(passaStatus && passaKva));
  });
}

function aplicarFiltroStatus(filtro) {
  if (filtroStatus === filtro && filtro !== 'total') filtro = 'total';
  filtroStatus = filtro;
  document.querySelectorAll('.btn-filtro').forEach(btn => {
    btn.classList.remove('ativo-total','ativo-disponivel','ativo-manutencao','ativo-locado');
  });
  document.getElementById('btn-' + filtro).classList.add('ativo-' + filtro);
  aplicarFiltros();
}

function aplicarFiltroKva(faixa, btn) {
  filtroKva = faixa;
  document.querySelectorAll('.btn-kva').forEach(b => b.classList.remove('ativo'));
  btn.classList.add('ativo');
  aplicarFiltros();
}

fetch('dados.csv?v=' + Date.now(), { cache: 'no-store' })
  .then(res => {
    const lastMod = res.headers.get('Last-Modified');
    document.getElementById('info-atualizacao').textContent = 'Dados atualizados em: ' +
      (lastMod ? new Date(lastMod).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'));
    return res.text();
  })
  .then(text => {
    const linhas = text.trim().split('\n');
    const cabecalho = linhas[0].split(',').map(c => c.trim().toLowerCase());
    const mapa = {};

    for (let i = 1; i < linhas.length; i++) {
      const cols = linhas[i].split(',').map(c => c.trim());
      const eq       = cols[cabecalho.indexOf('equipamento')] || '';
      const loc      = cols[cabecalho.indexOf('local')]       || '';
      const contrato = cols[cabecalho.indexOf('contrato')]    || '';
      if (eq && TODOS_EQUIPAMENTOS.includes(eq)) {
        mapa[eq] = interpretarLocal(loc, contrato);
      }
    }

    const painel = document.getElementById('painel');
    let cDisp = 0, cMan = 0, cLoc = 0, cDesm = 0;

    const textos = {
      'disponivel':        'Disponível',
      'locado':            'Locado',
      'manutencao_leve':   'Manutenção Leve',
      'manutencao_pesada': 'Manutenção Pesada'
    };

    TODOS_EQUIPAMENTOS.forEach(eq => {
      const info = mapa[eq] || { status: 'disponivel', cliente: '', obs: '', prazo: null, contrato: '', desmaiada: false };
      const kva  = extrairKva(eq);

      if (info.status === 'disponivel') cDisp++;
      else if (info.status === 'locado')   cLoc++;
      else                                 cMan++;
      
      if (info.desmaiada) cDesm++;

      const card = document.createElement('div');
      card.className = `card status-${info.status}`;
      card.setAttribute('data-status', info.status);
      card.setAttribute('data-kva', kva);
      card.setAttribute('data-eq', eq);

      let topoHtml = '';
      if (info.prazo) {
        topoHtml = `<div class="prazo-topo ${info.prazo.cor}">${info.prazo.texto}</div>`;
      } else if (info.contrato) {
        topoHtml = `<div class="contrato-topo">${info.contrato}</div>`;
      }

      card.innerHTML = `
        <div class="card-header">
          <div class="card-titulo">${eq}</div>
          ${topoHtml}
        </div>
        <div class="status-linha">
          <div class="led"></div>
          <span>${textos[info.status]}</span>
        </div>
        ${info.cliente ? `<div class="cliente">${info.cliente}</div>` : ''}
        ${info.obs     ? `<div class="obs">${info.obs}</div>` : ''}
      `;
      painel.appendChild(card);
    });

    // Totais exibidos (incluem Desmaiadas via cMan)
    document.getElementById('cont-disponivel').textContent = cDisp;
    document.getElementById('cont-manutencao').textContent = cMan;
    document.getElementById('cont-locado').textContent     = cLoc;
    const total = cDisp + cMan + cLoc;
    document.getElementById('cont-total').textContent      = total;

    // Denominadores separados:
    const denomOcup = total - 3;                // Ocupação: NÃO subtrai Desmaiadas
    const denomDisp = total - cDesm - 3;        // Disponibilidade: subtrai Desmaiadas

    // Taxa de Ocupação = Locados / (Total - 3)
    const taxaOcup = denomOcup > 0 ? (cLoc / denomOcup * 100) : 0;
    const taxaOcupEl = document.getElementById('taxa-ocupacao');
    taxaOcupEl.textContent = taxaOcup.toFixed(1) + '%';
    taxaOcupEl.className = 'indicador-valor ' + (taxaOcup <= 40 ? 'ocupacao-vermelho' : taxaOcup <= 70 ? 'ocupacao-amarelo' : 'ocupacao-verde');

    // Taxa de Disponibilidade = (Locados + Disponíveis) / (Total - Desmaiadas - 3)
    const taxaDisp = denomDisp > 0 ? ((cLoc + cDisp) / denomDisp * 100) : 0;
    const taxaDispEl = document.getElementById('taxa-disponibilidade');
    taxaDispEl.textContent = taxaDisp.toFixed(1) + '%';
    taxaDispEl.className = 'indicador-valor';
  });