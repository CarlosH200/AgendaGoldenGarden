// 🔴 PEGA TU CONFIG AQUÍ
const firebaseConfig = {
   apiKey: "AIzaSyB9oNtoG6zCG6460eHTFR5HOJbpFOOMpgA",
  authDomain: "agenda-eventos-d32e8.firebaseapp.com",
  projectId: "agenda-eventos-d32e8",
};

// IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// INIT
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const eventosRef = collection(db, "eventos");

// 🧠 AUTO ELIMINAR EVENTOS VENCIDOS
async function eliminarVencidos(snapshot) {
    const hoy = new Date().toISOString().split("T")[0];

    snapshot.forEach(async (d) => {
        const e = d.data();
        if (e.fecha < hoy) {
            await deleteDoc(doc(db, "eventos", d.id));
        }
    });
}

// 📌 GUARDAR / EDITAR
window.guardarEvento = async () => {
    const id = document.getElementById("id").value;
    const descripcion = document.getElementById("descripcion").value;
    const fecha = document.getElementById("fecha").value;

    if (!id || !descripcion || !fecha) {
        alert("Completa todos los campos");
        return;
    }

    let existe = null;

    const snapshot = await new Promise(resolve => {
        onSnapshot(eventosRef, resolve);
    });

    snapshot.forEach(docu => {
        if (docu.data().id === id) {
            existe = docu;
        }
    });

    if (existe) {
        await updateDoc(doc(db, "eventos", existe.id), {
            descripcion,
            fecha
        });
    } else {
        await addDoc(eventosRef, { id, descripcion, fecha });
    }

    limpiar();
};

// 🗑️ ELIMINAR
window.eliminarEvento = async (docId) => {
    await deleteDoc(doc(db, "eventos", docId));
};

// ✏️ EDITAR
window.editarEvento = (e, docId) => {
    document.getElementById("id").value = e.id;
    document.getElementById("descripcion").value = e.descripcion;
    document.getElementById("fecha").value = e.fecha;
};

// 📊 AGRUPAR POR MES
function agrupar(eventos) {
    const grupos = {};

    eventos.forEach(e => {
        const mes = e.fecha.substring(0,7);

        if (!grupos[mes]) grupos[mes] = [];
        grupos[mes].push(e);
    });

    return grupos;
}

// 👀 MOSTRAR EN TIEMPO REAL
onSnapshot(eventosRef, async snapshot => {

    await eliminarVencidos(snapshot);

    const lista = document.getElementById("listaEventos");
    lista.innerHTML = "";

    const eventos = [];

    snapshot.forEach(docu => {
        eventos.push({ ...docu.data(), docId: docu.id });
    });

    const grupos = agrupar(eventos);

    for (let mes in grupos) {
        const divMes = document.createElement("div");
        divMes.classList.add("mes");

        divMes.innerHTML = `<h3>${mes}</h3>`;

        grupos[mes].forEach(e => {
            const div = document.createElement("div");
            div.classList.add("evento");

            div.innerHTML = `
                <b>${e.id}</b><br>
                ${e.descripcion}<br>
                ${e.fecha}<br>
                <div class="actions">
                    <button onclick='editarEvento(${JSON.stringify(e)}, "${e.docId}")'>Editar</button>
                    <button onclick='eliminarEvento("${e.docId}")'>Eliminar</button>
                </div>
            `;

            divMes.appendChild(div);
        });

        lista.appendChild(divMes);
    }

});

// 🧹 LIMPIAR
function limpiar() {
    document.getElementById("id").value = "";
    document.getElementById("descripcion").value = "";
    document.getElementById("fecha").value = "";
}