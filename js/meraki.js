/* ============================================================
   Experiencia Meraki - Capa de acceso a datos (Supabase)
   ------------------------------------------------------------
   PASO OBLIGATORIO: reemplaza abajo la URL y la clave publica
   (anon / publishable) de tu proyecto Supabase.
   Las encuentras en: supabase.com -> tu proyecto -> Settings -> API.

   La clave publica SI se puede usar en el navegador porque
   tenemos Row Level Security (RLS) activado.
   NUNCA pongas aqui la clave service_role / secret.
   ============================================================ */

var MERAKI_URL = 'https://lpazmfpczyhldemiqeqq.supabase.co';
var MERAKI_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwYXptZnBjenlobGRlbWlxZXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMDE5ODksImV4cCI6MjEwNzY3Nzk4OX0.ARuaVEQThFK4qckVcyc5LvvD8aQa7ZVTKyo9pW6UlmA';

(function () {
    'use strict';

    var configurado = MERAKI_URL.indexOf('TU-PROYECTO') === -1 && MERAKI_ANON_KEY.indexOf('TU_CLAVE') === -1;
    var cliente = null;

    if (!window.supabase) {
        console.error('[Meraki] No se cargo supabase-js. Revisa el <script> del CDN.');
    } else if (!configurado) {
        console.warn('[Meraki] Falta configurar MERAKI_URL y MERAKI_ANON_KEY en js/meraki.js.');
    } else {
        cliente = window.supabase.createClient(MERAKI_URL, MERAKI_ANON_KEY);
    }

    function db() {
        if (!cliente) {
            throw new Error('La conexion con Supabase no esta configurada. Revisa js/meraki.js.');
        }
        return cliente;
    }

    var Meraki = {

        /* ---------- Catalogo (publico) ---------- */
        listarExperiencias: async function () {
            var res = await db().from('experiencias')
                .select('*').eq('activa', true).order('creada_en', { ascending: true });
            if (res.error) { throw res.error; }
            return res.data || [];
        },

        /* ---------- Disponibilidad (fechas ocupadas, sin datos personales) ---------- */
        fechasOcupadas: async function () {
            var res = await db().rpc('fechas_ocupadas');
            if (res.error) { throw res.error; }
            return res.data || [];
        },

        /* ---------- Crear reserva (funcion segura del servidor) ---------- */
        crearReserva: async function (p) {
            var f = p.factura || {};
            var res = await db().rpc('crear_reserva', {
                p_experiencia_id: p.experiencia_id,
                p_llegada: p.llegada,
                p_salida: p.salida,
                p_adultos: p.adultos,
                p_ninos: p.ninos,
                p_factura_nombre: f.nombre || null,
                p_factura_tipo_id: f.tipo_id || null,
                p_factura_numero_id: f.numero_id || null,
                p_factura_correo: f.correo || null,
                p_huespedes: p.huespedes || []
            });
            if (res.error) { throw res.error; }
            return res.data;
        },

        /* ---------- Visitas ---------- */
        registrarVisita: async function (pagina) {
            try {
                var res = await db().rpc('registrar_visita', { p_pagina: pagina });
                if (res.error) { console.warn('[Meraki] visita:', res.error.message); }
            } catch (e) { /* silencioso: no debe romper la pagina */ }
        },

        listarVisitas: async function () {
            var res = await db().from('visitas').select('*').order('total', { ascending: false });
            if (res.error) { throw res.error; }
            return res.data || [];
        },

        /* ---------- Autenticacion ---------- */
        iniciarSesion: async function (email, password) {
            var res = await db().auth.signInWithPassword({ email: email, password: password });
            if (res.error) { throw res.error; }
            return res.data.user;
        },

        cerrarSesion: async function () {
            await db().auth.signOut();
        },

        usuarioActual: async function () {
            var res = await db().auth.getSession();
            return (res.data && res.data.session) ? res.data.session.user : null;
        },

        obtenerPerfil: async function () {
            var user = await this.usuarioActual();
            if (!user) { return null; }
            var res = await db().from('perfiles').select('*').eq('id', user.id).maybeSingle();
            if (res.error) { throw res.error; }
            return res.data;
        },

        /* ---------- Reservas (operarios) ---------- */
        listarReservas: async function () {
            var res = await db().from('reservas')
                .select('*, experiencia:experiencias(id,identificador,titulo,precio), huespedes:reserva_huespedes(*)')
                .order('creada_en', { ascending: false });
            if (res.error) { throw res.error; }
            return res.data || [];
        },

        actualizarReserva: async function (id, cambios) {
            var res = await db().from('reservas').update(cambios).eq('id', id);
            if (res.error) { throw res.error; }
        },

        /* ---------- Experiencias (gestion) ---------- */
        listarExperienciasAdmin: async function () {
            var res = await db().from('experiencias').select('*').order('creada_en', { ascending: true });
            if (res.error) { throw res.error; }
            return res.data || [];
        },

        crearExperiencia: async function (exp) {
            var res = await db().from('experiencias').insert(exp).select().single();
            if (res.error) { throw res.error; }
            return res.data;
        },

        actualizarExperiencia: async function (id, cambios) {
            var res = await db().from('experiencias').update(cambios).eq('id', id);
            if (res.error) { throw res.error; }
        },

        eliminarExperiencia: async function (id) {
            var res = await db().from('experiencias').delete().eq('id', id);
            if (res.error) { throw res.error; }
        },

        /* ---------- Perfiles (solo lectura en la web) ---------- */
        listarPerfiles: async function () {
            var res = await db().from('perfiles').select('*').order('creado_en', { ascending: true });
            if (res.error) { throw res.error; }
            return res.data || [];
        }
    };

    window.Meraki = Meraki;
})();
