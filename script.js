import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDscqk9uFIFZ-9Z27Ci0pxoifLD8Gj5h3c",
    authDomain: "voz-do-bairro-58727.firebaseapp.com",
    projectId: "voz-do-bairro-58727",
    storageBucket: "voz-do-bairro-58727.firebasestorage.app",
    messagingSenderId: "62321635310",
    appId: "1:62321635310:web:e4a6a91a0da3215d3a28ff"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const map = L.map('mapa-container').setView([-26.9069, -48.6617], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

let marcadoresLayer = L.layerGroup().addTo(map);
let ocorrencias = [];

// Variáveis de controle do pino arrastável
let pinoRegistro = null;
let dadosFormulario = {}; 
const painelConfirmacao = document.getElementById('painel-confirmacao');

async function carregarOcorrencias(filtro = 'todos') {
    marcadoresLayer.clearLayers();
    ocorrencias = [];

    try {
        const querySnapshot = await getDocs(collection(db, "ocorrencias"));
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            ocorrencias.push({
                id: docSnap.id,
                lat: data.lat,
                lng: data.lng,
                categoria: data.categoria,
                endereco: data.endereco,
                desc: data.desc,
                apoios: data.apoios || 0
            });
        });

        desenharMarcadoresNoMapa(filtro);
    } catch (error) {
        console.error("Erro ao carregar ocorrências:", error);
    }
}

function desenharMarcadoresNoMapa(filtro) {
    marcadoresLayer.clearLayers();

    ocorrencias.forEach(oco => {
        if (filtro === 'todos' || oco.categoria === filtro) {
            
            // Jitter (Desvio) para evitar sobreposição exata de pinos resolvidos na mesma rua
            let latComDesvio = oco.lat + ((Math.random() - 0.5) * 0.0001);
            let lngComDesvio = oco.lng + ((Math.random() - 0.5) * 0.0001);

            const marker = L.marker([latComDesvio, lngComDesvio]);
            
            const popupContent = `
                <div class="popup-apoio">
                    <h3>${oco.categoria.toUpperCase()}</h3>
                    <p><strong>Local:</strong> ${oco.endereco}</p>
                    <p>${oco.desc}</p>
                    <p><strong>Apoios: <span id="contador-${oco.id}">${oco.apoios}</span></strong></p>
                    <button class="btn-apoio" id="btn-votar-${oco.id}">👍 Apoiar (+1)</button>
                </div>
            `;
            
            marker.bindPopup(popupContent);
            marker.on('popupopen', () => {
                const btnVotar = document.getElementById(`btn-votar-${oco.id}`);
                if (btnVotar) {
                    btnVotar.onclick = () => adicionarApoio(oco.id);
                }
            });

            marcadoresLayer.addLayer(marker);
        }
    });
}

window.adicionarApoio = async function(id) {
    try {
        const docRef = doc(db, "ocorrencias", id);
        await updateDoc(docRef, { apoios: increment(1) });

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
    }
};

const botoesFiltro = document.querySelectorAll('.btn-filtro');
botoesFiltro.forEach(botao => {
    botao.addEventListener('click', (e) => {
        botoesFiltro.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const categoriaEscolhida = e.target.getAttribute('data-categoria');
        desenharMarcadoresNoMapa(categoriaEscolhida);
    });
});

const modal = document.getElementById('modal-registro');
const btnNovo = document.getElementById('btn-novo-alerta');
const btnCancelar = document.getElementById('btn-cancelar');
const form = document.getElementById('form-ocorrencia');

btnNovo.addEventListener('click', () => modal.classList.remove('oculta'));
btnCancelar.addEventListener('click', () => {
    modal.classList.add('oculta');
    form.reset();
});

// PASSO 1: Submeter o Formulário, buscar a rua e mostrar o pino arrastável
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    dadosFormulario = {
        categoria: document.getElementById('categoria').value,
        endereco: document.getElementById('endereco').value,
        numero: document.getElementById('numero').value,
        descricao: document.getElementById('descricao').value,
        enderecoCompleto: `${document.getElementById('endereco').value}, ${document.getElementById('numero').value}`
    };
    
    const btnSalvar = document.getElementById('btn-salvar');
    btnSalvar.innerText = "Buscando...";
    btnSalvar.disabled = true;

    try {
        // Busca apenas a rua no OpenStreetMap para não dar erro
        const query = encodeURIComponent(`${dadosFormulario.endereco}, Itajaí, SC, Brasil`);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
        const data = await response.json();

        let lat = -26.9069;
        let lng = -48.6617;

        if (data.length > 0) {
            lat = parseFloat(data[0].lat);
            lng = parseFloat(data[0].lon);
        } else {
            alert("Rua não encontrada automaticamente. Arraste o pino até o local correto no mapa.");
        }

        // Esconde o modal de formulário
        modal.classList.add('oculta');
        
        // Exibe o painel flutuante de confirmação
        painelConfirmacao.classList.remove('oculta');
        
        // Centraliza o mapa
        map.setView([lat, lng], 16);

        // Se já existir um pino de registro, remove antes de criar outro
        if (pinoRegistro) map.removeLayer(pinoRegistro);
        
        // Cria o pino arrastável
        pinoRegistro = L.marker([lat, lng], { draggable: true }).addTo(map);
        pinoRegistro.bindPopup("<b>Arraste-me</b> para a frente da sua casa ou do problema!").openPopup();

    } catch (error) {
        console.error("Erro na busca:", error);
    } finally {
        btnSalvar.innerText = "Avançar para o Mapa 🗺️";
        btnSalvar.disabled = false;
    }
});

// PASSO 2: Confirmar Local Exato e Salvar no Firebase
document.getElementById('btn-confirmar-local').addEventListener('click', async () => {
    const btnConfirma = document.getElementById('btn-confirmar-local');
    btnConfirma.innerText = "Salvando na Nuvem...";
    btnConfirma.disabled = true;

    // Pega a coordenada fina exata de onde o usuário soltou o pino
    const latExata = pinoRegistro.getLatLng().lat;
    const lngExata = pinoRegistro.getLatLng().lng;

    try {
        await addDoc(collection(db, "ocorrencias"), {
            categoria: dadosFormulario.categoria,
            endereco: dadosFormulario.enderecoCompleto,
            desc: dadosFormulario.descricao,
            lat: latExata,
            lng: lngExata,
            apoios: 0,
            criadoEm: new Date()
        });

        alert('Problema registrado com sucesso! Muito obrigado.');
        
        // Reseta tudo e limpa a tela
        painelConfirmacao.classList.add('oculta');
        map.removeLayer(pinoRegistro);
        pinoRegistro = null;
        form.reset();

        const filtroAtivo = document.querySelector('.btn-filtro.active').getAttribute('data-categoria');
        carregarOcorrencias(filtroAtivo);

    } catch(e) {
        console.error(e);
        alert("Erro ao salvar no banco.");
    } finally {
        btnConfirma.innerText = "✅ Confirmar";
        btnConfirma.disabled = false;
    }
});

// Botão Cancelar a ação do Pino
document.getElementById('btn-cancelar-local').addEventListener('click', () => {
    painelConfirmacao.classList.add('oculta');
    if (pinoRegistro) map.removeLayer(pinoRegistro);
    pinoRegistro = null;
});

carregarOcorrencias();