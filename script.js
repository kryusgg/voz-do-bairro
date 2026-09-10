// Inicializa o mapa focado na região central de Itajaí
const map = L.map('mapa-container').setView([-26.9069, -48.6617], 14);

// Carrega as imagens do mapa aberto (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Array para guardar as ocorrências (Simulando nosso Banco de Dados do MVP)
let ocorrencias = [
    { id: 1, lat: -26.9050, lng: -48.6600, categoria: 'pavimentacao', endereco: 'Rua Uruguai, Centro', desc: 'Buraco gigante perto do cruzamento.', apoios: 5 },
    { id: 2, lat: -26.9100, lng: -48.6650, categoria: 'iluminacao', endereco: 'Rua Silva, Centro', desc: 'Poste apagado há 3 dias.', apoios: 12 }
];

// Camada onde os pinos ficam guardados (facilita na hora de filtrar)
let marcadoresLayer = L.layerGroup().addTo(map);

// ================= Lógica para desenhar os pontos no mapa =================
function renderizarMarcadores(filtro = 'todos') {
    marcadoresLayer.clearLayers(); // Limpa os pontos antigos antes de desenhar os novos

    ocorrencias.forEach(oco => {
        // Verifica se o ponto atual passa no filtro escolhido
        if (filtro === 'todos' || oco.categoria === filtro) {
            
            const marker = L.marker([oco.lat, oco.lng]);
            
            // Monta o layout do Popup (a janelinha que abre ao clicar no pino)
            const popupContent = `
                <div class="popup-apoio">
                    <h3>${oco.categoria.toUpperCase()}</h3>
                    <p><strong>Local:</strong> ${oco.endereco}</p>
                    <p>${oco.desc}</p>
                    <p><strong>Apoios da vizinhança: <span id="contador-${oco.id}">${oco.apoios}</span></strong></p>
                    <button class="btn-apoio" onclick="adicionarApoio(${oco.id})">👍 Apoiar (+1)</button>
                </div>
            `;
            
            marker.bindPopup(popupContent);
            marcadoresLayer.addLayer(marker);
        }
    });
}

// ================= Lógica de Apoio (Botão +1) =================
function adicionarApoio(id) {
    const ocorrencia = ocorrencias.find(o => o.id === id);
    if (ocorrencia) {
        ocorrencia.apoios += 1; // Soma 1 no nosso "banco de dados"
        document.getElementById(`contador-${id}`).innerText = ocorrencia.apoios; // Atualiza a tela
    }
}

// ================= Lógica dos Filtros (Botões Superiores) =================
const botoesFiltro = document.querySelectorAll('.btn-filtro');

botoesFiltro.forEach(botao => {
    botao.addEventListener('click', (e) => {
        // Remove a cor verde (active) de todos os botões
        botoesFiltro.forEach(b => b.classList.remove('active'));
        
        // Pinta de verde apenas o botão que o usuário clicou
        e.target.classList.add('active');
        
        // Pega qual é a categoria escrita no HTML (data-categoria) e filtra o mapa
        const categoriaEscolhida = e.target.getAttribute('data-categoria');
        renderizarMarcadores(categoriaEscolhida);
    });
});

// ================= Lógica do Formulário e Geolocalização =================
const modal = document.getElementById('modal-registro');
const btnNovo = document.getElementById('btn-novo-alerta');
const btnCancelar = document.getElementById('btn-cancelar');
const form = document.getElementById('form-ocorrencia');

// Abrir e fechar o modal
btnNovo.addEventListener('click', () => modal.classList.remove('oculta'));
btnCancelar.addEventListener('click', () => {
    modal.classList.add('oculta');
    form.reset();
});

// Envio do formulário
// Envio do formulário
form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede a página de recarregar
    
    const categoria = document.getElementById('categoria').value;
    const endereco = document.getElementById('endereco').value;
    const numero = document.getElementById('numero').value;
    const descricao = document.getElementById('descricao').value;
    
    // Junta a rua e o número para mostrar bonito na tela
    const enderecoCompleto = `${endereco}, ${numero}`;
    
    const btnSalvar = document.getElementById('btn-salvar');
    const textoOriginal = btnSalvar.innerText;
    
    // Mostra pro usuário que estamos processando
    btnSalvar.innerText = "Buscando localização exata...";
    btnSalvar.disabled = true;

    try {
        // A API Nominatim acha mais fácil quando o número vem junto com a rua, separado por vírgula
        const query = encodeURIComponent(`${endereco}, ${numero}, Itajaí, SC, Brasil`);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
        const data = await response.json();

        // Se a API encontrou o endereço exato...
        if (data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);

            // Cria o novo registro
            const novaOcorrencia = {
                id: ocorrencias.length + 1,
                lat: lat,
                lng: lng,
                categoria: categoria,
                endereco: enderecoCompleto,
                desc: descricao,
                apoios: 0
            };
            
            // Salva e atualiza o mapa
            ocorrencias.push(novaOcorrencia);
            
            const filtroAtivo = document.querySelector('.btn-filtro.active').getAttribute('data-categoria');
            renderizarMarcadores(filtroAtivo);
            
            // Centraliza a câmera do mapa bem perto do pino novo (zoom 17 é mais perto)
            map.setView([lat, lng], 17);
            
            modal.classList.add('oculta');
            form.reset();
            alert('Alerta registrado com sucesso no local exato!');
            
        } else {
            alert('Não conseguimos achar essa numeração no mapa. Tente verificar se o nome da rua está correto.');
        }
    } catch (error) {
        alert('Erro ao buscar o endereço na internet. Verifique a conexão.');
    } finally {
        btnSalvar.innerText = textoOriginal;
        btnSalvar.disabled = false;
    }
});

// Ao abrir a página pela primeira vez, desenha tudo
renderizarMarcadores();