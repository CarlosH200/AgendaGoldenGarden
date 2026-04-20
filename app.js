// 🔴 CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyB9oNtoG6zCG6460eHTFR5HOJbpFOOMpgA",
  authDomain: "agenda-eventos-d32e8.firebaseapp.com",
  projectId: "agenda-eventos-d32e8",
};

// IMPORTS
import { empresasConfig } from "./empresasConfig.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// INIT
const config = empresasConfig[empresaActual];
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const eventosRef = collection(db, "eventos");

// 🏢 EMPRESA ACTUAL
let empresaActual = "golden";

// 🔄 CONTROL DEL LISTENER
let unsubscribe = null;

// 🧠 ELIMINAR EVENTOS VENCIDOS
async function eliminarVencidos(snapshot) {
  const hoy = new Date().toISOString().split("T")[0];

  snapshot.forEach(async (d) => {
    const e = d.data();
    if (e.fecha < hoy) {
      await deleteDoc(doc(db, "eventos", d.id));
    }
  });
}

// 📌 VARIABLE GLOBAL PARA EDICIÓN
window.docEditando = null;

// FUNCION PARA CAMBIAR DE INFORMACION DE EMPRESA O ACTUALIZARLA
function aplicarTemaEmpresa() {
  const config = empresasConfig[empresaActual];

  // cambiar logo
  const logo = document.querySelector(".logo");
  if (logo) {
    logo.src = config.logo;
  }
}
// FIN FUNCION PARA ACTUALIZAR INFORMACION DE EMPRESA


// 🆕 FORMATEAR MES
function formatearMes(fecha) {
  const meses = [
    "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
    "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE",
  ];

  const año = fecha.substring(0, 4);
  const mesIndex = parseInt(fecha.substring(5, 7)) - 1;

  return `${año} - ${meses[mesIndex]}`;
}

// 🔄 CAMBIAR EMPRESA
window.cambiarEmpresa = (empresa) => {
  empresaActual = empresa;
  cargarEventos();
  // Funcion para cargar tema de empresa
  aplicarTemaEmpresa();
};

// 📌 GUARDAR / EDITAR
window.guardarEvento = async () => {
  const titulo = document.getElementById("titulo").value;
  const descripcion = document.getElementById("descripcion").value;
  const fecha = document.getElementById("fecha").value;

  if (!titulo || !descripcion || !fecha) {
    alert("Completa todos los campos");
    return;
  }

  if (window.docEditando) {
    // ✏️ EDITAR
    await updateDoc(doc(db, "eventos", window.docEditando), {
      titulo,
      descripcion,
      fecha,
      empresa: empresaActual,
    });
    window.docEditando = null;
  } else {
    // ➕ NUEVO
    await addDoc(eventosRef, {
      titulo,
      descripcion,
      fecha,
      empresa: empresaActual,
    });
  }

  limpiar();
};

// 🗑️ ELIMINAR
window.eliminarEvento = async (docId) => {
  await deleteDoc(doc(db, "eventos", docId));
};

// ✏️ EDITAR
window.editarEvento = (e, docId) => {
  document.getElementById("titulo").value = e.titulo;
  document.getElementById("descripcion").value = e.descripcion;
  document.getElementById("fecha").value = e.fecha;

  window.docEditando = docId;
};

// 📊 AGRUPAR POR MES
function agrupar(eventos) {
  const grupos = {};

  eventos.forEach((e) => {
    const mes = formatearMes(e.fecha);

    if (!grupos[mes]) grupos[mes] = [];
    grupos[mes].push(e);
  });

  return grupos;
}

// 👀 CARGAR EVENTOS (MULTIEMPRESA + LOADER)
function cargarEventos() {

  const loader = document.getElementById("loader");
  const lista = document.getElementById("listaEventos");

  // 🔥 mostrar loader
  if (loader) loader.style.display = "block";
  lista.innerHTML = "";

  // ❌ cancelar listener anterior
  if (unsubscribe) unsubscribe();

  const q = query(eventosRef, where("empresa", "==", empresaActual));

  unsubscribe = onSnapshot(q, async (snapshot) => {

    await eliminarVencidos(snapshot);

    lista.innerHTML = "";

    const eventos = [];

    snapshot.forEach((docu) => {
      eventos.push({ ...docu.data(), docId: docu.id });
    });

    const grupos = agrupar(eventos);

    for (let mes in grupos) {
      const divMes = document.createElement("div");
      divMes.classList.add("mes");

      divMes.innerHTML = `<h3 class="titulo-mes">${mes}</h3>`;

      grupos[mes].forEach((e) => {
        const div = document.createElement("div");
        div.classList.add("evento");

        div.innerHTML = `
          <b><i class="fa fa-calendar"></i> ${e.titulo || e.id}</b><br>
          <i class="fa fa-align-left"></i> ${e.descripcion}<br>

          <div class="fecha-container">
            <i class="fa fa-clock"></i> 
            <span class="fechaStyledesing">${e.fecha}</span>
          </div>

          <div class="actions">
            <button class="botonEditar" onclick='editarEvento(${JSON.stringify(e)}, "${e.docId}")'>
              <i class="fa fa-pen"></i> Editar
            </button>

            <button class="botonEliminar" onclick='eliminarEvento("${e.docId}")'>
              <i class="fa fa-trash"></i> Eliminar
            </button>
          </div>
        `;

        divMes.appendChild(div);
      });

      lista.appendChild(divMes);
    }

    // 🔥 ocultar loader cuando termina
    if (loader) loader.style.display = "none";
  });
}

// 🚀 INICIALIZAR
cargarEventos();

// 🧹 LIMPIAR
function limpiar() {
  document.getElementById("titulo").value = "";
  document.getElementById("descripcion").value = "";
  document.getElementById("fecha").value = "";
}