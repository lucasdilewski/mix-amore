(function () {
  "use strict";

  var DATA = window.MIXAMORE || { productos: [], config: {} };
  var productos = DATA.productos;
  var config = DATA.config;

  var CLAVE_CARRITO = "mixamore_carrito";

  var estado = {
    producto: null,
    tamanio: null,
    cantidad: 1,
    personalizaciones: {},
  };

  var carrito = cargarCarrito();

  var modalFondo = document.getElementById("modal-fondo");
  var carritoFondo = document.getElementById("carrito-fondo");
  var ultimoFocoAntesDeAbrir = null;

  // ---------- Utilidades ----------

  function formatearPrecio(numero) {
    return config.moneda + Math.round(numero).toLocaleString("es-AR");
  }

  function formatearAdicional(numero) {
    if (!numero) return "";
    return numero > 0 ? " (+" + formatearPrecio(numero) + ")" : " (-" + formatearPrecio(Math.abs(numero)) + ")";
  }

  function buscarProducto(id) {
    for (var i = 0; i < productos.length; i++) {
      if (productos[i].id === id) return productos[i];
    }
    return null;
  }

  function idUnico() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function mostrarToast(texto) {
    var toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = texto;
    toast.classList.add("visible");
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(function () {
      toast.classList.remove("visible");
    }, 2400);
  }

  // ---------- Carrito: almacenamiento ----------

  function cargarCarrito() {
    try {
      var guardado = window.localStorage.getItem(CLAVE_CARRITO);
      return guardado ? JSON.parse(guardado) : [];
    } catch (e) {
      return [];
    }
  }

  function guardarCarrito() {
    try {
      window.localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    } catch (e) {
      /* localStorage no disponible: el carrito sigue funcionando en memoria */
    }
  }

  // ---------- Carrito: cálculo y render ----------

  function calcularTotalCarrito() {
    return carrito.reduce(function (acum, item) {
      return acum + item.subtotal;
    }, 0);
  }

  function actualizarContadorCarrito() {
    var contador = document.getElementById("carrito-contador");
    if (!contador) return;
    var totalUnidades = carrito.reduce(function (acum, item) {
      return acum + item.cantidad;
    }, 0);
    if (totalUnidades > 0) {
      contador.textContent = String(totalUnidades);
      contador.hidden = false;
    } else {
      contador.hidden = true;
    }
  }

  function crearVisualMini(item) {
    if (item.imagen) {
      var img = document.createElement("img");
      img.src = item.imagen;
      img.alt = "";
      return img;
    }
    var span = document.createElement("span");
    span.textContent = item.emoji || "🎁";
    return span;
  }

  function renderCarrito() {
    var lista = document.getElementById("carrito-lista");
    var vacio = document.getElementById("carrito-vacio");
    var resumen = document.getElementById("carrito-resumen");
    if (!lista) return;

    lista.innerHTML = "";

    if (!carrito.length) {
      vacio.style.display = "";
      resumen.style.display = "none";
      return;
    }

    vacio.style.display = "none";
    resumen.style.display = "";

    carrito.forEach(function (item) {
      var el = document.createElement("div");
      el.className = "carrito-item";

      var visual = document.createElement("div");
      visual.className = "carrito-item__visual";
      visual.style.setProperty("--caja-color", item.color);
      visual.appendChild(crearVisualMini(item));
      el.appendChild(visual);

      var info = document.createElement("div");
      info.className = "carrito-item__info";

      var nombre = document.createElement("div");
      nombre.className = "carrito-item__nombre";
      nombre.textContent = item.nombre;
      info.appendChild(nombre);

      var detalles = [];
      if (item.mostrarTamanio) detalles.push("Tamaño: " + item.tamanio);
      item.personalizaciones.forEach(function (p) {
        detalles.push(p.etiqueta + ": " + p.nombre + (p.detalle ? " — " + p.detalle : ""));
      });
      if (item.personalizacionLibre) detalles.push(item.personalizacionLibreEtiqueta + ": " + item.personalizacionLibre);
      if (item.mensaje) detalles.push("Tarjeta: " + item.mensaje);
      detalles.push("Cantidad: " + item.cantidad);

      var detalle = document.createElement("div");
      detalle.className = "carrito-item__detalle";
      detalle.textContent = detalles.join(" · ");
      info.appendChild(detalle);

      var pie = document.createElement("div");
      pie.className = "carrito-item__pie";
      var precio = document.createElement("span");
      precio.className = "carrito-item__precio";
      precio.textContent = formatearPrecio(item.subtotal);
      pie.appendChild(precio);
      info.appendChild(pie);

      el.appendChild(info);

      var quitar = document.createElement("button");
      quitar.type = "button";
      quitar.className = "carrito-item__quitar";
      quitar.setAttribute("aria-label", "Quitar " + item.nombre + " del pedido");
      quitar.textContent = "✕";
      quitar.addEventListener("click", function () {
        quitarDelCarrito(item.id);
      });
      el.appendChild(quitar);

      lista.appendChild(el);
    });

    document.getElementById("carrito-total-valor").textContent = formatearPrecio(calcularTotalCarrito());
  }

  function quitarDelCarrito(itemId) {
    carrito = carrito.filter(function (item) {
      return item.id !== itemId;
    });
    guardarCarrito();
    actualizarContadorCarrito();
    renderCarrito();
  }

  function agregarAlCarrito(item) {
    carrito.push(item);
    guardarCarrito();
    actualizarContadorCarrito();
    renderCarrito();
  }

  // ---------- Carrito: abrir / cerrar ----------

  function abrirCarrito() {
    renderCarrito();
    carritoFondo.classList.add("abierto");
    document.body.style.overflow = "hidden";
  }

  function cerrarCarrito() {
    carritoFondo.classList.remove("abierto");
    if (!modalFondo.classList.contains("abierto")) {
      document.body.style.overflow = "";
    }
  }

  function enviarCarritoPorWhatsapp() {
    if (!carrito.length) return;

    var lineas = [];
    lineas.push("¡Hola! 👋 Quiero hacer este pedido de " + config.nombre_sitio + ":");

    carrito.forEach(function (item, idx) {
      lineas.push("");
      lineas.push((idx + 1) + ". 📦 *" + item.nombre + "*");
      if (item.mostrarTamanio) lineas.push("   📏 Tamaño: " + item.tamanio);
      item.personalizaciones.forEach(function (p) {
        var detalle = p.detalle ? " — " + p.detalle : "";
        lineas.push("   🔄 " + p.etiqueta + ": " + p.nombre + detalle);
      });
      if (item.personalizacionLibre) {
        lineas.push("   🔄 " + item.personalizacionLibreEtiqueta + ": " + item.personalizacionLibre + " (a cotizar)");
      }
      lineas.push("   🔢 Cantidad: " + item.cantidad);
      lineas.push("   💬 Tarjeta: " + (item.mensaje || "sin mensaje"));
      lineas.push("   💰 Subtotal: " + formatearPrecio(item.subtotal));
    });

    lineas.push("");
    lineas.push("💰 *Total del pedido: " + formatearPrecio(calcularTotalCarrito()) + "*");
    lineas.push("");
    lineas.push("¿Podemos coordinar el pago y la entrega?");

    var url = "https://wa.me/" + config.whatsapp_numero + "?text=" + encodeURIComponent(lineas.join("\n"));
    window.open(url, "_blank");

    carrito = [];
    guardarCarrito();
    actualizarContadorCarrito();
    renderCarrito();
    cerrarCarrito();
  }

  // ---------- Modal de producto ----------

  function calcularPrecioUnitario() {
    if (!estado.producto) return 0;
    var adicionalTamanio = estado.producto.tamanios[estado.tamanio] || 0;
    var adicionalPersonalizaciones = 0;
    Object.keys(estado.personalizaciones).forEach(function (key) {
      adicionalPersonalizaciones += estado.personalizaciones[key].adicional || 0;
    });
    return estado.producto.precio_base + adicionalTamanio + adicionalPersonalizaciones;
  }

  function calcularTotal() {
    return calcularPrecioUnitario() * estado.cantidad;
  }

  function actualizarTotalEnPantalla() {
    var el = document.getElementById("modal-total-valor");
    if (el) el.textContent = formatearPrecio(calcularTotal());
  }

  function crearVisual(producto) {
    if (producto.imagen) {
      var img = document.createElement("img");
      img.src = producto.imagen;
      img.alt = "Foto de la caja " + producto.nombre;
      img.className = "modal__foto";
      return img;
    }
    var wrap = document.createElement("div");
    wrap.className = "caja-css";
    wrap.innerHTML =
      '<div class="caja-css__cuerpo"></div>' +
      '<div class="caja-css__listón-v"></div>' +
      '<div class="caja-css__listón-h"></div>' +
      '<div class="caja-css__tapa"></div>' +
      '<div class="caja-css__emoji">' + producto.emoji + "</div>";
    return wrap;
  }

  function renderTamanios(producto) {
    var cont = document.getElementById("modal-tamanios");
    cont.innerHTML = "";
    var nombres = Object.keys(producto.tamanios);

    if (nombres.length <= 1) {
      cont.parentElement.style.display = "none";
      estado.tamanio = nombres[0];
      return;
    }
    cont.parentElement.style.display = "";

    nombres.forEach(function (nombre, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tamanio-pill" + (idx === 0 ? " activo" : "");
      var adicional = producto.tamanios[nombre];
      btn.textContent = nombre + (adicional > 0 ? " (+" + formatearPrecio(adicional) + ")" : "");
      btn.addEventListener("click", function () {
        estado.tamanio = nombre;
        Array.prototype.forEach.call(cont.querySelectorAll(".tamanio-pill"), function (b) {
          b.classList.remove("activo");
        });
        btn.classList.add("activo");
        actualizarTotalEnPantalla();
      });
      cont.appendChild(btn);
    });

    estado.tamanio = nombres[0];
  }

  function renderPersonalizaciones(producto) {
    var wrap = document.getElementById("modal-personalizaciones-wrap");
    var cont = document.getElementById("modal-personalizaciones");
    cont.innerHTML = "";
    estado.personalizaciones = {};

    var grupos = producto.personalizaciones || [];
    if (!grupos.length) {
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "";

    grupos.forEach(function (grupo) {
      var campo = document.createElement("div");
      campo.className = "campo personalizacion";

      var selectId = "personalizacion-" + grupo.id;
      var label = document.createElement("label");
      label.textContent = grupo.etiqueta;
      label.setAttribute("for", selectId);
      campo.appendChild(label);

      var select = document.createElement("select");
      select.id = selectId;
      grupo.opciones.forEach(function (opcion, idx) {
        var option = document.createElement("option");
        option.value = String(idx);
        option.textContent = opcion.nombre + formatearAdicional(opcion.adicional || 0);
        select.appendChild(option);
      });
      campo.appendChild(select);

      var inputExtra = document.createElement("input");
      inputExtra.type = "text";
      inputExtra.placeholder = "Contanos cuál...";
      inputExtra.className = "personalizacion-texto";
      inputExtra.style.display = "none";
      campo.appendChild(inputExtra);

      if (grupo.nota) {
        var nota = document.createElement("p");
        nota.className = "modal__nota";
        nota.textContent = grupo.nota;
        campo.appendChild(nota);
      }

      function guardarSeleccion() {
        var opcion = grupo.opciones[Number(select.value)];
        inputExtra.style.display = opcion.requiere_texto ? "" : "none";
        estado.personalizaciones[grupo.id] = {
          etiqueta: grupo.etiqueta,
          nombre: opcion.nombre,
          adicional: opcion.adicional || 0,
          detalleInput: opcion.requiere_texto ? inputExtra : null,
        };
        actualizarTotalEnPantalla();
      }

      select.addEventListener("change", guardarSeleccion);
      guardarSeleccion();

      cont.appendChild(campo);
    });
  }

  function abrirModal(id) {
    var producto = buscarProducto(id);
    if (!producto) return;

    estado.producto = producto;
    estado.cantidad = 1;

    document.getElementById("modal-visual").style.setProperty("--caja-color", producto.color);
    var visualContenido = document.getElementById("modal-visual-contenido");
    visualContenido.innerHTML = "";
    visualContenido.appendChild(crearVisual(producto));

    document.getElementById("modal-badge").style.display = producto.badge ? "" : "none";
    document.getElementById("modal-badge").textContent = producto.badge || "";

    document.getElementById("modal-nombre").textContent = producto.nombre;
    document.getElementById("modal-descripcion").textContent = producto.descripcion;

    var aviso = document.getElementById("modal-aviso");
    if (producto.nota_producto) {
      document.getElementById("modal-aviso-texto").textContent = producto.nota_producto;
      aviso.style.display = "";
    } else {
      aviso.style.display = "none";
    }

    var lista = document.getElementById("modal-lista");
    lista.innerHTML = "";
    producto.contenido.forEach(function (item) {
      var li = document.createElement("li");
      li.textContent = item;
      lista.appendChild(li);
    });

    renderTamanios(producto);
    renderPersonalizaciones(producto);

    var textoWrap = document.getElementById("modal-personalizacion-texto-wrap");
    var textoInput = document.getElementById("modal-personalizacion-texto");
    if (producto.personalizacion_texto) {
      textoWrap.style.display = "";
      document.getElementById("modal-personalizacion-texto-label").textContent = producto.personalizacion_texto.etiqueta;
      textoInput.placeholder = producto.personalizacion_texto.placeholder || "";
      document.getElementById("modal-personalizacion-texto-nota").textContent = producto.personalizacion_texto.nota || "";
    } else {
      textoWrap.style.display = "none";
    }
    textoInput.value = "";

    document.getElementById("modal-nota-tamanios").textContent = producto.nota_tamanios || "";
    document.getElementById("modal-nota-tamanios").style.display = producto.nota_tamanios ? "" : "none";

    document.getElementById("modal-cantidad").textContent = "1";
    document.getElementById("modal-mensaje").value = "";

    actualizarTotalEnPantalla();

    ultimoFocoAntesDeAbrir = document.activeElement;
    modalFondo.classList.add("abierto");
    document.body.style.overflow = "hidden";
    document.getElementById("modal-cerrar").focus();
  }

  function cerrarModal() {
    modalFondo.classList.remove("abierto");
    if (!carritoFondo.classList.contains("abierto")) {
      document.body.style.overflow = "";
    }
    if (ultimoFocoAntesDeAbrir) ultimoFocoAntesDeAbrir.focus();
  }

  function agregarProductoActualAlCarrito() {
    if (!estado.producto) return;
    var producto = estado.producto;
    var mensajeTarjeta = document.getElementById("modal-mensaje").value.trim();
    var nombresTamanio = Object.keys(producto.tamanios);

    var personalizacionesSnapshot = Object.keys(estado.personalizaciones).map(function (key) {
      var p = estado.personalizaciones[key];
      return {
        etiqueta: p.etiqueta,
        nombre: p.nombre,
        adicional: p.adicional,
        detalle: p.detalleInput ? p.detalleInput.value.trim() : "",
      };
    });

    var precioUnitario = calcularPrecioUnitario();

    var textoPersonalizacionLibre = "";
    if (producto.personalizacion_texto) {
      textoPersonalizacionLibre = document.getElementById("modal-personalizacion-texto").value.trim();
    }

    var item = {
      id: idUnico(),
      productoId: producto.id,
      nombre: producto.nombre,
      color: producto.color,
      imagen: producto.imagen || "",
      emoji: producto.emoji,
      tamanio: estado.tamanio,
      mostrarTamanio: nombresTamanio.length > 1,
      personalizaciones: personalizacionesSnapshot,
      personalizacionLibreEtiqueta: producto.personalizacion_texto ? producto.personalizacion_texto.etiqueta : "",
      personalizacionLibre: textoPersonalizacionLibre,
      mensaje: mensajeTarjeta,
      cantidad: estado.cantidad,
      precioUnitario: precioUnitario,
      subtotal: precioUnitario * estado.cantidad,
    };

    agregarAlCarrito(item);
    cerrarModal();
    mostrarToast("✓ " + producto.nombre + " agregado al pedido");
    abrirCarrito();
  }

  // ---------- Catálogo y datos del sitio (antes lo armaba PHP) ----------

  function escaparHtml(texto) {
    return String(texto == null ? "" : texto)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderCatalogo() {
    var grilla = document.getElementById("grilla");
    if (!grilla) return;

    grilla.innerHTML = productos.map(function (p) {
      var badge = p.badge ? '<span class="tarjeta__badge">' + escaparHtml(p.badge) + "</span>" : "";
      var visual = p.imagen
        ? '<img class="tarjeta__foto" src="' + escaparHtml(p.imagen) + '" alt="Foto de la caja ' + escaparHtml(p.nombre) + '">'
        : '<div class="caja-css">' +
            '<div class="caja-css__cuerpo"></div>' +
            '<div class="caja-css__listón-v"></div>' +
            '<div class="caja-css__listón-h"></div>' +
            '<div class="caja-css__tapa"></div>' +
            '<div class="caja-css__emoji">' + escaparHtml(p.emoji) + "</div>" +
          "</div>";

      return (
        '<article class="tarjeta" data-id="' + escaparHtml(p.id) + '" style="--caja-color: ' + escaparHtml(p.color) + ';"' +
        ' tabindex="0" role="button" aria-label="Ver detalles de ' + escaparHtml(p.nombre) + '">' +
          '<div class="tarjeta__visual">' + badge + visual + "</div>" +
          '<div class="tarjeta__cuerpo">' +
            '<h3 class="tarjeta__nombre">' + escaparHtml(p.nombre) + "</h3>" +
            '<p class="tarjeta__resumen">' + escaparHtml(p.resumen) + "</p>" +
            '<div class="tarjeta__pie">' +
              "<div>" +
                '<div class="tarjeta__desde">Desde</div>' +
                '<div class="tarjeta__precio">' + formatearPrecio(p.precio_base) + "</div>" +
              "</div>" +
              '<span class="tarjeta__ver">Ver detalles →</span>' +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  function llenarDatosDelSitio() {
    function texto(id, valor) {
      var el = document.getElementById(id);
      if (el && valor) el.textContent = valor;
    }

    texto("marca-header", config.nombre_sitio);
    texto("hero-titulo", config.nombre_sitio);
    texto("hero-bajada", config.tagline);
    texto("envios-texto", config.envios);
    texto("footer-marca", config.nombre_sitio);
    texto("footer-ciudad", config.ciudad);
    texto("footer-whatsapp", config.whatsapp_numero);
    texto("footer-email", config.email_contacto);

    var ig = document.getElementById("footer-instagram");
    if (ig) {
      ig.textContent = config.instagram_usuario || "";
      ig.href = config.instagram_url || "#";
    }

    if (config.nombre_sitio) document.title = config.nombre_sitio + " — Cajas dulces";
    var meta = document.querySelector('meta[name="description"]');
    if (meta && config.tagline) meta.setAttribute("content", config.tagline);
  }

  // ---------- Inicialización ----------

  document.addEventListener("DOMContentLoaded", function () {
    llenarDatosDelSitio();
    renderCatalogo();
    actualizarContadorCarrito();

    Array.prototype.forEach.call(document.querySelectorAll(".tarjeta"), function (tarjeta) {
      tarjeta.addEventListener("click", function () {
        abrirModal(tarjeta.getAttribute("data-id"));
      });
      tarjeta.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          abrirModal(tarjeta.getAttribute("data-id"));
        }
      });
    });

    document.getElementById("modal-cerrar").addEventListener("click", cerrarModal);
    modalFondo.addEventListener("click", function (e) {
      if (e.target === modalFondo) cerrarModal();
    });

    document.getElementById("carrito-abrir").addEventListener("click", abrirCarrito);
    document.getElementById("carrito-cerrar").addEventListener("click", cerrarCarrito);
    document.getElementById("carrito-seguir").addEventListener("click", cerrarCarrito);
    carritoFondo.addEventListener("click", function (e) {
      if (e.target === carritoFondo) cerrarCarrito();
    });
    document.getElementById("carrito-finalizar").addEventListener("click", enviarCarritoPorWhatsapp);

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (modalFondo.classList.contains("abierto")) cerrarModal();
      if (carritoFondo.classList.contains("abierto")) cerrarCarrito();
    });

    document.getElementById("cantidad-menos").addEventListener("click", function () {
      if (estado.cantidad > 1) estado.cantidad--;
      document.getElementById("modal-cantidad").textContent = estado.cantidad;
      actualizarTotalEnPantalla();
    });
    document.getElementById("cantidad-mas").addEventListener("click", function () {
      if (estado.cantidad < 20) estado.cantidad++;
      document.getElementById("modal-cantidad").textContent = estado.cantidad;
      actualizarTotalEnPantalla();
    });

    document.getElementById("boton-agregar-carrito").addEventListener("click", agregarProductoActualAlCarrito);
  });
})();
