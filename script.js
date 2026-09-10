// Inicializa o mapa focado na região central de Itajaí
const map = L.map('mapa-container').setView([-26.9069, -48.6617], 14);

// Carrega as imagens do mapa aberto (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Camada onde os pinos ficam guardados
let marcadoresLayer = L.layerGroup().addTo(map);

// Array local para guardar as ocorrências buscadas do Firebase
let ocorrencias = [];

// ================= Função para Buscar Ocorrências do Firebase =================
async function carregarOcorrencias(filtro = 'todos') {
    marcadoresLayer.clearLayers();
    ocorrencias = [];

    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "ocorrencias"));
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            ocorrencias.push({
                id: docSnap.id, // ID real gerado pelo Firestore
                lat: data.lat,
                lng: data.lng,
                categoria: data.categoria,
                endereco: data.endereco,
                desc: data.desc,
                apoios: data.apoios || 0
            });
        });

        // Desenha os pontos no mapa com base no filtro atual
        desenharMarcadoresNoMapa(filtro);

    } catch (error) {
        console.error("Erro ao carregar ocorrências do banco:", error);
    }
}

// ================= Desenhar os Pinos no Mapa =================
function desenharMarcadoresNoMapa(filtro) {
    marcadoresLayer.clearLayers();

    ocorrencias.forEach(oco => {
        if (filtro === 'todos' || oco.categoria === filtro) {
            const marker = L.marker([oco.lat, oco.lng]);
            
            const popupContent = `
                <div class="popup-apoio">
                    <h3>${oco.categoria.toUpperCase()}</h3>
                    <p><strong>Local:</strong> ${oco.endereco}</p>
                    <p>${oco.desc}</p>
                    <p><strong>Apoios da vizinhança: <span id="contador-${oco.id}">${oco.apoios}</span></strong></p>
                    <button class="btn-apoio" onclick="adicionarApoio('${oco.id}')">👍 Apoiar (+1)</button>
                </div>
            `;
            
            marker.bindPopup(popupContent);
            marcadoresLayer.addLayer(marker);
        }
    });
}

// ================= Sistema de Votos (+1 Apoio) no Firebase =================
window.adicionarApoio = async function(id) {
    try {
        const docRef = window.doc(window.db, "ocorrencias", id);
        // Incrementa 1 no banco de dados em tempo real
        await window.updateDoc(docRef, {
            apoios: window.increment(1)
        });

        // Atualiza na tela do usuário instantaneamente
        const ocorrencia = ocorrencias.find(o => o.id === id);
        if (ocorrencia) {
            ocorrencia.apoios += 1;
            const spanContador = document.getElementById(`contador-${id}`);
            if (spanContador) {
                spanContador.innerText = ocorrencia.apoios;
            }
        }
    } catch (error) {
        console.error("Erro ao registrar apoio:", error);
        alert("Não foi possível registrar o apoio no momento.");
    }
};

// ================= Lógica dos Filtros (Botões Superiores) =================
const botoesFiltro = document.querySelectorAll('.btn-filtro');

botoesFiltro.forEach(botao => {
    botao.addEventListener('click', (e) => {
        botoesFiltro.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        const categoriaEscolhida = e.target.getAttribute('data-categoria');
        desenharMarcadoresNoMapa(categoriaEscolhida);
    });
});

// ================= Lógica do Formulário e Geolocalização =================
const modal = document.getElementById('modal-registro');
const btnNovo = document.getElementById('btn-novo-alerta');
const btnCancelar = document.getElementById('btn-cancelar');
const form = document.getElementById('form-ocorrencia');

btnNovo.addEventListener('click', () => modal.classList.remove('oculta'));
btnCancelar.addEventListener('click', () => {
    modal.classList.add('oculta');
    form.reset();
});

// Envio do formulário salvando direto no Firebase
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const categoria = document.getElementById('categoria').value;
    const endereco = document.getElementById('endereco').value;
    const numero = document.getElementById('numero').value;
    const descricao = document.getElementById('descricao').value;
    
    const enderecoCompleto = `${endereco}, ${numero}`;
    const btnSalvar = document.getElementById('btn-salvar');
    const textoOriginal = btnSalvar.innerText;
    
    btnSalvar.innerText = "Salvando no Banco...";
    btnSalvar.disabled = true;

    try {
        // Busca as coordenadas exatas na API Nominatim
        const query = encodeURIComponent(`${endereco}, ${numero}, Itajaí, SC, Brasil`);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
        const data = await response.json();

        let lat = -26.9069; // Padrão centro de Itajaí se falhar
        let lng = -48.6617;

        if (data.length > 0) {
            lat = parseFloat(data[0].lat);
            lng = parseFloat(data[0].lon);
        }

        // Salva o novo registro permanentemente no Firestore
        await window.addDoc(window.collection(window.db, "ocorrencias"), {
            categoria: categoria,
            endereco: enderecoCompleto,
            desc: descricao,
            lat: lat,
            lng: lng,
            apoios: 0,
            criadoEm: new Date()
        });

        modal.classList.add('oculta');
        form.reset();
        alert('Alerta publicado com sucesso na nuvem!');

        // Recarrega os pontos do mapa para exibir o novo alarme
        const filtroAtivo = document.querySelector('.btn-filtro.active').getAttribute('data-categoria');
        carregarOcorrencias(filtroAtivo);
        map.setView([lat, lng], 17);

    } catch (error) {
        console.error("Erro ao salvar ocorrência:", error);
        alert('Erro ao salvar os dados. Verifique a conexão.');
    } finally {
        btnSalvar.innerText = textoOriginal;
        btnSalvar.disabled = false;
    }
});

// Inicializa a aplicação carregando os dados do banco
carregarOcorrencias();