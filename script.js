// Importações diretas do Firebase SDK via CDN oficial
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDscqk9uFIFZ-9Z27Ci0pxoifLD8Gj5h3c",
    authDomain: "voz-do-bairro-58727.firebaseapp.com",
    projectId: "voz-do-bairro-58727",
    storageBucket: "voz-do-bairro-58727.firebasestorage.app",
    messagingSenderId: "62321635310",
    appId: "1:62321635310:web:e4a6a91a0da3215d3a28ff"
};

// Inicializa o Firebase e o Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Inicializa o mapa focado na região central de Itajaí
const map = L.map('mapa-container').setView([-26.9069, -48.6617], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let marcadoresLayer = L.layerGroup().addTo(map);
let ocorrencias = [];
// Cria um pino especial e arrastável para o usuário marcar o local
let pinoRegistro = L.marker([-26.9069, -48.6617], { draggable: true }).addTo(map);
pinoRegistro.bindPopup("📍 <b>Arraste-me</b> para o local exato do problema!").openPopup();
// ================= Carregar Ocorrências do Firebase =================
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

// ================= Sistema de Votos (+1 Apoio) =================
async function adicionarApoio(id) {
    try {
        const docRef = doc(db, "ocorrencias", id);
        await updateDoc(docRef, {
            apoios: increment(1)
        });

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
        alert("Erro ao registrar apoio.");
    }
}

// ================= Filtros =================
const botoesFiltro = document.querySelectorAll('.btn-filtro');
botoesFiltro.forEach(botao => {
    botao.addEventListener('click', (e) => {
        botoesFiltro.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const categoriaEscolhida = e.target.getAttribute('data-categoria');
        desenharMarcadoresNoMapa(categoriaEscolhida);
    });
});

// ================= Formulário =================
const modal = document.getElementById('modal-registro');
const btnNovo = document.getElementById('btn-novo-alerta');
const btnCancelar = document.getElementById('btn-cancelar');
const form = document.getElementById('form-ocorrencia');

btnNovo.addEventListener('click', () => modal.classList.remove('oculta'));
btnCancelar.addEventListener('click', () => {
    modal.classList.add('oculta');
    form.reset();
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const categoria = document.getElementById('categoria').value;
    const endereco = document.getElementById('endereco').value;
    const numero = document.getElementById('numero').value;
    const descricao = document.getElementById('descricao').value;
    const enderecoCompleto = `${endereco}, ${numero}`;
    
    const btnSalvar = document.getElementById('btn-salvar');
    const textoOriginal = btnSalvar.innerText;
    
    btnSalvar.innerText = "Salvando na Nuvem...";
    btnSalvar.disabled = true;

    try {
        // PEGA AS COORDENADAS EXATAS DO PINO ARRASTÁVEL!
        const lat = pinoRegistro.getLatLng().lat;
        const lng = pinoRegistro.getLatLng().lng;

        // Salva direto no Firebase com a precisão visual
        await addDoc(collection(db, "ocorrencias"), {
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
        alert('Alerta publicado com sucesso!');

        const filtroAtivo = document.querySelector('.btn-filtro.active').getAttribute('data-categoria');
        carregarOcorrencias(filtroAtivo);
        
        // Centraliza a tela onde o problema foi salvo
        map.setView([lat, lng], 17);

    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert('Erro ao salvar no banco.');
    } finally {
        btnSalvar.innerText = textoOriginal;
        btnSalvar.disabled = false;
    }
});
// Inicializa a aplicação
carregarOcorrencias();
