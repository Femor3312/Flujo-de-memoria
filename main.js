const firebaseConfig = {
    apiKey: "AIzaSyDty8fmFZDjtfzvWz4QoAbefkoJykd1WC0",
    authDomain: "flujo-memoria.firebaseapp.com",
    projectId: "flujo-memoria",
    storageBucket: "flujo-memoria.firebasestorage.app",
    messagingSenderId: "892660826469",
    appId: "1:892660826469:web:d54818a84f030642d8218c",
    measurementId: "G-C09RKGKGP6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const canvas = document.getElementById('flujoCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const raton = { x: null, y: null };
canvas.addEventListener('mousemove', (e) => { 
    raton.x = e.clientX; 
    raton.y = e.clientY; 

    let sobreParticula = false;
    for (let i = 0; i < arregloParticulas.length; i++) {
        let p = arregloParticulas[i];
        let dx = raton.x - p.x; 
        let dy = raton.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.radio + 12) {
            sobreParticula = true;
            break;
        }
    }
    canvas.style.cursor = sobreParticula ? 'pointer' : 'default';
});

canvas.addEventListener('mouseout', () => {
    raton.x = null; 
    raton.y = null;
    canvas.style.cursor = 'default';
});

function abrirModal(id) { document.getElementById(id).classList.add('activo'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('activo'); }

document.getElementById('btnAbrirTexto').addEventListener('click', () => abrirModal('modalCrearTexto'));
document.getElementById('btnAbrirImagen').addEventListener('click', () => abrirModal('modalCrearImagen'));
document.getElementById('btnAbrirVideo').addEventListener('click', () => abrirModal('modalCrearVideo'));

document.getElementById('cerrarCrearTexto').addEventListener('click', () => cerrarModal('modalCrearTexto'));
document.getElementById('cerrarCrearImagen').addEventListener('click', () => cerrarModal('modalCrearImagen'));
document.getElementById('cerrarCrearVideo').addEventListener('click', () => cerrarModal('modalCrearVideo'));
document.getElementById('cerrarModalAporte').addEventListener('click', () => {
    cerrarModal('modalAporte');
    document.getElementById('modalVideoPlayer').pause();
});

const arregloParticulas = [];

class Particula {
    constructor(tipo, titulo, autor, contenido, fecha) {
        this.x = Math.random() * canvas.width; 
        this.y = Math.random() * canvas.height; 
        
        this.radio = Math.random() * 5 + 5; 
        this.velocidadBaseX = (Math.random() - 0.5) * 1.5; 
        this.velocidadBaseY = (Math.random() - 0.5) * 1.5; 
        this.velocidadX = this.velocidadBaseX;
        this.velocidadY = this.velocidadBaseY;
        
        this.tipo = tipo; 
        this.titulo = titulo;
        this.autor = autor;
        this.contenido = contenido; 
        this.fecha = fecha; 

        if (this.tipo === 'texto') { this.color = '#F0B429'; this.letraIcono = 'T'; } 
        else if (this.tipo === 'imagen') { this.color = '#005883'; this.letraIcono = 'I'; } 
        else if (this.tipo === 'video') { this.color = '#F4402A'; this.letraIcono = 'V'; }
    }

    dibujar() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(255, 255, 255, 0.8)";

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radio, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
        
        ctx.restore();
    }

    actualizar() {
        if (this.x + this.radio > canvas.width || this.x - this.radio < 0) { this.velocidadBaseX *= -1; this.velocidadX = this.velocidadBaseX; }
        if (this.y + this.radio > canvas.height || this.y - this.radio < 0) { this.velocidadBaseY *= -1; this.velocidadY = this.velocidadBaseY; }

        let dx = raton.x - this.x; let dy = raton.y - this.y;
        let distancia = Math.sqrt(dx * dx + dy * dy);

        if (distancia < this.radio + 12) {
            this.velocidadX = 0; this.velocidadY = 0; 
            ctx.fillStyle = "#ffffff"; 
            ctx.font = '500 12px Montserrat, sans-serif';
            ctx.fillText(this.autor, this.x + 15, this.y + 4);
        } else {
            this.velocidadX = this.velocidadBaseX;
            this.velocidadY = this.velocidadBaseY;
        }

        this.x += this.velocidadX;
        this.y += this.velocidadY;
        this.dibujar();
    }
}

function animar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    arregloParticulas.forEach(p => p.actualizar());
    requestAnimationFrame(animar);
}

db.collection("aportes").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
            const data = change.doc.data();
            arregloParticulas.push(new Particula(data.tipo, data.titulo, data.autor, data.contenido, data.fecha));
        }
    });
});

async function guardarEnFirebase(tipo, titulo, autor, contenido) {
    try {
        await db.collection("aportes").add({
            tipo: tipo,
            titulo: titulo,
            autor: autor,
            contenido: contenido,
            fecha: new Date().toLocaleDateString()
        });
    } catch (e) {
        console.error("Error al guardar: ", e);
        alert("El archivo sigue siendo demasiado pesado para Firestore. Intenta grabar un video más corto.");
    }
}

// --- MÓDULO 1: TEXTO ---
document.getElementById('btnEnviarTexto').addEventListener('click', () => {
    let titulo = document.getElementById('inputTituloTxt').value;
    let autor = document.getElementById('inputAutorTxt').value;
    let contenido = document.getElementById('inputContenidoTxt').value;

    if (!titulo || !autor || !contenido) return alert("Llena todos los campos");
    
    guardarEnFirebase('texto', titulo, autor, contenido);
    
    document.getElementById('inputTituloTxt').value = '';
    document.getElementById('inputAutorTxt').value = '';
    document.getElementById('inputContenidoTxt').value = '';
    cerrarModal('modalCrearTexto');
});

// --- MÓDULO 2: SUBIR IMAGEN ---
let imagenBase64Url = null;
const inputFileImg = document.getElementById('inputFileImg');
const previewImg = document.getElementById('previewImg');

inputFileImg.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvasCompresion = document.createElement('canvas');
                const MAX_SIZE = 800; 
                let width = img.width;
                let height = img.height;

                if (width > height && width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
                
                canvasCompresion.width = width;
                canvasCompresion.height = height;
                const ctxCompresion = canvasCompresion.getContext('2d');
                ctxCompresion.drawImage(img, 0, 0, width, height);
                
                imagenBase64Url = canvasCompresion.toDataURL('image/jpeg', 0.7); 
                previewImg.src = imagenBase64Url;
                previewImg.style.display = 'block';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('btnLimpiarImagen').addEventListener('click', () => {
    inputFileImg.value = '';
    previewImg.src = '';
    previewImg.style.display = 'none';
    imagenBase64Url = null;
});

document.getElementById('btnEnviarImagen').addEventListener('click', () => {
    let titulo = document.getElementById('inputTituloImg').value;
    let autor = document.getElementById('inputAutorImg').value;
    
    if (!titulo || !autor || !imagenBase64Url) return alert("Ingresa título, autor y selecciona una foto.");

    guardarEnFirebase('imagen', titulo, autor, imagenBase64Url);
    
    document.getElementById('inputTituloImg').value = '';
    document.getElementById('inputAutorImg').value = '';
    inputFileImg.value = '';
    previewImg.src = '';
    previewImg.style.display = 'none';
    imagenBase64Url = null;
    cerrarModal('modalCrearImagen');
});

// --- MÓDULO 3: VIDEO (CORREGIDO Y ESTABLE) ---
let mediaRecorder;
let videoChunks = [];
let videoBlobFinal = null;
let streamCamara = null;

const btnGrabar = document.getElementById('btnGrabar');
const btnDetener = document.getElementById('btnDetener');
const btnEnviarVideo = document.getElementById('btnEnviarVideo');
const videoPreview = document.getElementById('videoPreview');

btnGrabar.addEventListener('click', async () => {
    try {
        videoChunks = [];
        videoBlobFinal = null;

        // Petición limpia compatible con navegadores móviles y de PC
        streamCamara = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 480 }, height: { ideal: 360 } }, 
            audio: true 
        });

        videoPreview.srcObject = streamCamara;
        videoPreview.style.display = 'block';
        videoPreview.controls = false;
        videoPreview.muted = true;
        
        // Usamos una configuración genérica segura que no congela el renderizado
        let options = { mimeType: 'video/webm' };
        if (!MediaRecorder.isTypeSupported('video/webm')) {
            options = { mimeType: 'video/mp4' };
        }

        mediaRecorder = new MediaRecorder(streamCamara, options);
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                videoChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            // Creamos el Blob seguro directamente sin corromper metadatos
            videoBlobFinal = new Blob(videoChunks, { type: mediaRecorder.mimeType || 'video/webm' });
            
            // Usamos ObjectURL en lugar de FileReader para evitar el congelamiento en negro
            const videoUrlTemporal = URL.createObjectURL(videoBlobFinal);
            
            videoPreview.srcObject = null;
            videoPreview.src = videoUrlTemporal;
            videoPreview.controls = true;
            videoPreview.muted = false;
            
            btnEnviarVideo.disabled = false;
        };

        mediaRecorder.start(100); // Recopilar fragmentos cada 100ms para evitar pérdida de datos
        btnGrabar.disabled = true; 
        btnDetener.disabled = false; 
        btnEnviarVideo.disabled = true;

    } catch (err) {
        alert("No se pudo iniciar la grabación. Verifica los permisos de cámara y micrófono.");
        console.error(err);
    }
});

btnDetener.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
    if (streamCamara) {
        streamCamara.getTracks().forEach(track => track.stop());
    }
    btnGrabar.disabled = false; 
    btnDetener.disabled = true;
});

document.getElementById('btnEnviarVideo').addEventListener('click', () => {
    let titulo = document.getElementById('inputTituloVid').value;
    let autor = document.getElementById('inputAutorVid').value;
    if (!titulo || !autor || !videoBlobFinal) return alert("Llena los campos y asegúrate de haber grabado un video.");

    btnEnviarVideo.innerText = "Procesando... ⏳";
    btnEnviarVideo.disabled = true;

    // Convertimos el Blob limpio a Base64 de forma segura para Firestore
    const reader = new FileReader();
    reader.readAsDataURL(videoBlobFinal);
    reader.onloadend = () => {
        const base64Video = reader.result;
        
        guardarEnFirebase('video', titulo, autor, base64Video);
        
        // Limpiar interfaz
        document.getElementById('inputTituloVid').value = '';
        document.getElementById('inputAutorVid').value = '';
        videoPreview.style.display = 'none'; 
        videoPreview.src = ''; 
        videoBlobFinal = null;
        btnEnviarVideo.innerText = "Enviar al flujo";
        btnEnviarVideo.disabled = true;
        cerrarModal('modalCrearVideo');
    };
});

// --- LÓGICA DE LECTURA ---
canvas.addEventListener('click', (e) => {
    if (document.querySelector('.modal.activo')) return;

    for (let i = 0; i < arregloParticulas.length; i++) {
        let p = arregloParticulas[i];
        let dx = e.clientX - p.x; let dy = e.clientY - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.radio + 12) {
            
            document.getElementById('modalTitulo').innerText = p.titulo;
            document.getElementById('modalAutor').innerText = "Por: " + p.autor + " - " + p.fecha;
            document.getElementById('modalIcono').innerText = p.letraIcono;

            const txt = document.getElementById('modalTexto');
            const img = document.getElementById('modalImagen');
            const vid = document.getElementById('modalVideoPlayer');
            
            txt.style.display = 'none'; 
            img.style.display = 'none'; 
            vid.style.display = 'none';
            vid.pause();

            if (p.tipo === 'texto') {
                txt.innerText = p.contenido;
                txt.style.display = 'block';
            } else if (p.tipo === 'imagen') {
                img.src = p.contenido;
                img.style.display = 'block';
            } else if (p.tipo === 'video') {
                vid.src = p.contenido;
                vid.style.display = 'block';
            }

            abrirModal('modalAporte');
            break; 
        }
    }
});

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
animar();
// --- prueba ---
