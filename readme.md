# Voz do Bairro - MVP

Aplicação web colaborativa (Mínimo Produto Viável) desenvolvida para mapear, validar e priorizar problemas de infraestrutura urbana em Itajaí, SC.

## 🎯 O Projeto
O objetivo desta plataforma é reduzir a burocracia no reporte de problemas de zeladoria (como buracos na via, postes apagados e descarte irregular de lixo) e unificar as demandas da comunidade através de um mapa interativo. O grande diferencial é o botão de **Apoio Comunitário (+1)**, que permite ranquear a urgência das manutenções com base na validação dos próprios vizinhos.

## 🛠️ Tecnologias Utilizadas
* **HTML5 & CSS3:** Estrutura e estilização responsiva (Mobile-First).
* **JavaScript (Vanilla):** Lógica de interação, manipulação do DOM e consumo de API.
* **Leaflet.js:** Biblioteca open-source para renderização do mapa interativo.
* **OpenStreetMap & Nominatim API:** Base de dados cartográfica e serviço de geocodificação (conversão de endereço em coordenadas).

## 🚀 Como executar o projeto
Como se trata de uma aplicação web front-end sem dependências de servidor nesta etapa de MVP, a execução é simples:

1. Faça o clone ou download deste repositório.
2. Extraia os arquivos em uma pasta local.
3. Abra o arquivo `index.html` em qualquer navegador web moderno (Chrome, Edge, Firefox, Safari).
4. *Nota:* Para o funcionamento da geolocalização ao registrar um novo alerta, é necessária conexão com a internet (consumo da API Nominatim).

## 📌 Funcionalidades do MVP
- Visualização de alertas georreferenciados no mapa de Itajaí.
- Filtro de ocorrências por categoria (Iluminação, Pavimentação, Saneamento).
- Formulário simplificado para registro de novos problemas.
- Endosso coletivo (Simulação do incremento de votos de apoio).