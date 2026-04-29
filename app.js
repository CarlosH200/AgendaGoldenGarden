// CONFIG
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
  where,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// EMPRESA
let empresaActual = localStorage.getItem("empresa") || "golden";

// INIT
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const eventosRef = collection(db, "eventos");

// LISTENER
let unsubscribe = null;

// CACHE EVENTOS
let eventosCache = [];

// CALENDARIO
let fechaActual = new Date();

/* ========================= */
/* 🔄 FUNCIONES CALENDARIO */
/* ========================= */

window.mostrarCalendario = () => {
  document.getElementById("calendarioVista").style.display = "block";
  document.getElementById("listaEventos").style.display = "none";
  renderCalendario();
};

window.mostrarLista = () => {
  document.getElementById("calendarioVista").style.display = "none";
  document.getElementById("listaEventos").style.display = "block";
};

window.cambiarMes = (valor) => {
  fechaActual.setMonth(fechaActual.getMonth() + valor);
  renderCalendario();
};

function renderCalendario() {
  const grid = document.getElementById("calGrid");
  const mesLabel = document.getElementById("mesActual");

  if (!grid || !mesLabel) return;

  const year = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();

  const diasMes = new Date(year, mes + 1, 0).getDate();

  mesLabel.innerText = fechaActual.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  grid.innerHTML = "";

  const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  diasSemana.forEach((dia) => {
    grid.innerHTML += `<div class="cal-dia-header">${dia}</div>`;
  });

  let primerDia = new Date(year, mes, 1).getDay();
  primerDia = primerDia === 0 ? 6 : primerDia - 1;

  for (let i = 0; i < primerDia; i++) {
    grid.innerHTML += `<div></div>`;
  }

  for (let d = 1; d <= diasMes; d++) {
    const fechaStr = `${year}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const eventosDia = eventosCache.filter((e) => e.fecha === fechaStr);

    const hoy = new Date();
    const esHoy =
      d === hoy.getDate() &&
      mes === hoy.getMonth() &&
      year === hoy.getFullYear();

    let htmlEventos = eventosDia
      .map(() => `<div class="cal-dot"></div>`)
      .join("");

    grid.innerHTML += `
      <div class="cal-dia ${esHoy ? "cal-hoy" : ""}" onclick='abrirEventosDia("${fechaStr}")'>
        <span>${d}</span>
        ${htmlEventos}
      </div>
    `;
  }
}

/* ========================= */
/* 🔥 MODAL DETALLE EVENTOS */
/* ========================= */

window.abrirEventosDia = (fecha) => {
  const overlay = document.getElementById("detalleOverlay");
  const cont = document.getElementById("detalleContenido");

  if (!overlay || !cont) return;

  const eventos = eventosCache.filter((e) => e.fecha === fecha);

  if (eventos.length === 0) {
    cont.innerHTML = `<div class="detalle-vacio">No hay eventos</div>`;
  } else {
    cont.innerHTML = eventos
      .map(
        (e) => `
  <div class="detalle-card">
      <div class="detalle-titulo">${e.titulo}</div>
      <div class="detalle-desc">${e.descripcion}</div>
      <div class="detalle-fecha">
          <i class="fa fa-calendar"></i> ${e.fecha}
      </div>
  </div>
`,
      )
      .join("");
  }

  overlay.style.display = "flex";
};

window.cerrarDetalle = () => {
  const overlay = document.getElementById("detalleOverlay");
  if (overlay) overlay.style.display = "none";
};

document.addEventListener("click", (e) => {
  const overlay = document.getElementById("detalleOverlay");
  if (e.target === overlay) {
    cerrarDetalle();
  }
});

/* ========================= */
/* 🔥 TU LÓGICA ORIGINAL */
/* ========================= */

// ELIMINAR VENCIDOS
async function eliminarVencidos(snapshot) {
  const hoy = new Date().toISOString().split("T")[0];

  snapshot.forEach(async (d) => {
    const e = d.data();
    if (e.fecha < hoy) {
      await deleteDoc(doc(db, "eventos", d.id));
    }
  });
}

// EDICIÓN
window.docEditando = null;

// TEMA
function aplicarTemaEmpresa() {
  const config = empresasConfig[empresaActual];
  if (!config) return;

  const logo = document.querySelector(".logo");
  if (logo) logo.src = config.logo;

  const titulo = document.querySelector(".tituloPrincipal");
  if (titulo) titulo.innerText = `Agenda Eventos ${config.nombre}`;

  if (config.colorBackground) {
    document.documentElement.style.setProperty(
      "--color-background",
      config.colorBackground,
    );
  }

  if (config.colorBackgroundSecondary) {
    document.documentElement.style.setProperty(
      "--color-background-secondary",
      config.colorBackgroundSecondary,
    );
  }

  if (config.colorText) {
    document.documentElement.style.setProperty(
      "--color-text",
      config.colorText,
    );
  }
}

// FORMATEAR MES
function formatearMes(fecha) {
  const meses = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];

  const año = fecha.substring(0, 4);
  const mesIndex = parseInt(fecha.substring(5, 7)) - 1;

  return `${año} - ${meses[mesIndex]}`;
}

// CAMBIAR EMPRESA
window.cambiarEmpresa = (empresa) => {
  empresaActual = empresa;
  localStorage.setItem("empresa", empresa);
  aplicarTemaEmpresa();
  cargarEventos();
};

// GUARDAR
window.guardarEvento = async () => {
  const titulo = document.getElementById("titulo").value;
  const descripcion = document.getElementById("descripcion").value;
  const fecha = document.getElementById("fecha").value;

  if (!titulo || !descripcion || !fecha) {
    alert("Completa todos los campos");
    return;
  }

  if (window.docEditando) {
    await updateDoc(doc(db, "eventos", window.docEditando), {
      titulo,
      descripcion,
      fecha,
      empresa: empresaActual,
    });
    window.docEditando = null;
  } else {
    await addDoc(eventosRef, {
      titulo,
      descripcion,
      fecha,
      empresa: empresaActual,
    });
  }

  limpiar();
};

// ELIMINAR
window.eliminarEvento = async (docId) => {
  await deleteDoc(doc(db, "eventos", docId));
};

// EDITAR
window.editarEvento = (e, docId) => {
  document.getElementById("titulo").value = e.titulo;
  document.getElementById("descripcion").value = e.descripcion;
  document.getElementById("fecha").value = e.fecha;

  window.docEditando = docId;
};

// AGRUPAR
function agrupar(eventos) {
  const grupos = {};

  eventos.forEach((e) => {
    const mes = formatearMes(e.fecha);
    if (!grupos[mes]) grupos[mes] = [];
    grupos[mes].push(e);
  });

  return grupos;
}

// CARGAR EVENTOS
function cargarEventos() {
  const loader = document.getElementById("loader");
  const lista = document.getElementById("listaEventos");

  if (loader) loader.style.display = "block";
  lista.innerHTML = "";

  if (unsubscribe) unsubscribe();

  const q = query(eventosRef, where("empresa", "==", empresaActual));

  unsubscribe = onSnapshot(q, async (snapshot) => {
    await eliminarVencidos(snapshot);
    lista.innerHTML = "";

    const eventos = [];

    snapshot.forEach((docu) => {
      eventos.push({ ...docu.data(), docId: docu.id });
    });

    eventosCache = eventos;

    const grupos = agrupar(eventos);

    for (let mes in grupos) {
      const divMes = document.createElement("div");
      divMes.classList.add("mes");

      divMes.innerHTML = `<h3 class="titulo-mes">${mes}</h3>`;

      grupos[mes].forEach((e) => {
        const div = document.createElement("div");
        div.classList.add("evento");

        div.innerHTML = `
          <b><i class="fa fa-calendar"></i> ${e.titulo}</b><br>
          <i class="fa fa-align-left"></i> ${e.descripcion}<br>

          <div class="fecha-container">
            <i class="fa fa-clock"></i> 
            <span>${e.fecha}</span>
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

    if (loader) loader.style.display = "none";

    if (document.getElementById("calendarioVista")?.style.display !== "none") {
      renderCalendario();
    }
  });
}

// INIT
const selectEmpresa = document.querySelector(".empresaSelect");
if (selectEmpresa) selectEmpresa.value = empresaActual;

aplicarTemaEmpresa();
cargarEventos();

// LIMPIAR
function limpiar() {
  document.getElementById("titulo").value = "";
  document.getElementById("descripcion").value = "";
  document.getElementById("fecha").value = "";
}
